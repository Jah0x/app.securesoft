import { describe, expect, it } from "vitest";
import {
  AuthModule,
  DeviceModule,
  HttpError,
  InMemorySecureStore,
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
      vpn_jwt: "jwt",
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

  async connect(): Promise<void> {
    this.connected = true;
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
});
