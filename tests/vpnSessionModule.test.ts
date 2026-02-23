import { describe, expect, it } from "vitest";
import {
  AuthModule,
  DeviceModule,
  HttpError,
  InMemorySecureStore,
  type RefreshScheduler,
  VpnSessionModule,
  type NetworkStatusProvider,
  type VpnConnector,
} from "../src/index.js";

class FakeHttpClient {
  public vpnCalls = 0;

  async login() {
    return { accessToken: "access", refreshToken: "refresh" };
  }

  async refresh() {
    return { accessToken: "access2", refreshToken: "refresh2" };
  }

  async requestVpnToken() {
    this.vpnCalls += 1;
    return {
      endpoint: {
        address: "203.0.113.10:443",
        hostname: "edge-12.vpn.example.com",
        protocol: "http2",
        dns: "1.1.1.1",
      },
      vpn_username: "dev_user_abc",
      vpn_jwt: `jwt-${this.vpnCalls}`,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
  }
}

class FlakyHttpClient extends FakeHttpClient {
  private readonly failTimes: number;

  constructor(failTimes: number) {
    super();
    this.failTimes = failTimes;
  }

  async requestVpnToken() {
    if (this.vpnCalls < this.failTimes) {
      this.vpnCalls += 1;
      throw new HttpError(500, "/vpn/token");
    }

    return super.requestVpnToken();
  }
}

class FakeConnector implements VpnConnector {
  connected = false;
  connectCalls = 0;
  lastConfig: { tls?: { alpn?: string[] } } | null = null;

  async connect(config: { tls?: { alpn?: string[] } }): Promise<void> {
    this.connectCalls += 1;
    this.connected = true;
    this.lastConfig = config;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }
}

class OfflineNetworkStatusProvider implements NetworkStatusProvider {
  async isOnline(): Promise<boolean> {
    return false;
  }
}

class FakeScheduler implements RefreshScheduler {
  scheduledDelay: number | null = null;
  stopped = false;

  schedule(_: () => Promise<void>, delayMs: number): void {
    this.scheduledDelay = delayMs;
  }

  stop(): void {
    this.stopped = true;
  }
}

describe("VpnSessionModule", () => {
  it("подключает VPN и меняет состояние", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const module = new VpnSessionModule(
      api as never,
      auth,
      new DeviceModule(store),
      new FakeConnector(),
      "android",
      "1.0.0",
    );

    await module.connect();

    expect(module.getState()).toBe("connected");
    expect(module.shouldRefreshJwt()).toBe(true);
    expect(module.getCurrentSessionId()).toBeTruthy();
  });

  it("возвращает snapshot с endpoint и TTL JWT", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const connector = new FakeConnector();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const module = new VpnSessionModule(api as never, auth, new DeviceModule(store), connector, "android", "1.0.0");

    await module.connect();
    const snapshot = module.getStatusSnapshot();

    expect(snapshot.state).toBe("connected");
    expect(snapshot.endpointHostname).toBe("edge-12.vpn.example.com");
    expect(snapshot.endpointAddress).toBe("203.0.113.10:443");
    expect(snapshot.jwtExpiresInSeconds).toBeGreaterThan(0);
    expect(snapshot.sessionId).toBeTruthy();
  });

  it("автообновляет JWT и применяет новую VPN-конфигурацию", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const connector = new FakeConnector();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const module = new VpnSessionModule(api as never, auth, new DeviceModule(store), connector, "android", "1.0.0");

    await module.connect();
    const refreshed = await module.refreshJwtIfNeeded();

    expect(refreshed).toBe(true);
    expect(api.vpnCalls).toBe(2);
    expect(connector.connectCalls).toBe(2);
  });

  it("помечает offline как network error", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const module = new VpnSessionModule(
      api as never,
      auth,
      new DeviceModule(store),
      new FakeConnector(),
      "android",
      "1.0.0",
      new OfflineNetworkStatusProvider(),
    );

    await expect(module.connect()).rejects.toThrow("OFFLINE");
    expect(module.getState()).toBe("error_network");
  });

  it("делает reconnect с exponential backoff", async () => {
    const store = new InMemorySecureStore();
    const api = new FlakyHttpClient(2);
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const module = new VpnSessionModule(
      api as never,
      auth,
      new DeviceModule(store),
      new FakeConnector(),
      "android",
      "1.0.0",
    );

    await module.reconnectWithBackoff(3, 1);

    expect(module.getState()).toBe("connected");
    expect(api.vpnCalls).toBe(3);
  });

  

  it("передает TLS параметры в VPN connector", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const connector = new FakeConnector();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    api.requestVpnToken = async () => ({
      endpoint: {
        address: "203.0.113.10:443",
        hostname: "edge-12.vpn.example.com",
        protocol: "http2",
        dns: "1.1.1.1",
      },
      vpn_username: "dev_user_abc",
      vpn_jwt: "jwt",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      tls: { alpn: ["h2"] },
    });

    const module = new VpnSessionModule(api as never, auth, new DeviceModule(store), connector, "android", "1.0.0");

    await module.connect();

    expect(connector.lastConfig?.tls?.alpn).toEqual(["h2"]);
  });
it("планирует авто-refresh JWT и останавливает scheduler при disconnect", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");
    const scheduler = new FakeScheduler();

    const module = new VpnSessionModule(
      api as never,
      auth,
      new DeviceModule(store),
      new FakeConnector(),
      "android",
      "1.0.0",
      undefined,
      scheduler,
    );

    await module.connect();
    expect(scheduler.scheduledDelay).not.toBeNull();

    await module.disconnect();
    expect(scheduler.stopped).toBe(true);
  });
});
