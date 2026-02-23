import { describe, expect, it } from "vitest";
import {
  AppCoreModule,
  AuthModule,
  DeviceModule,
  InMemorySecureStore,
  MetricsModule,
  PushModule,
  VpnSessionModule,
  type VpnConnector,
} from "../src/index.js";

class FakeHttpClient {
  public metricsCalls = 0;
  public registeredPushTokens: Array<{ provider: string; token: string }> = [];

  async login() {
    return { accessToken: "access", refreshToken: "refresh" };
  }

  async refresh() {
    return { accessToken: "access-2", refreshToken: "refresh-2" };
  }

  async registerDevice() {
    return { device_user: "device-user-1" };
  }

  async registerPushToken(_: string, payload: { provider: string; token: string }) {
    this.registeredPushTokens.push(payload);
  }

  async requestVpnToken() {
    return {
      endpoint: {
        address: "203.0.113.10:443",
        hostname: "edge-12.vpn.example.com",
        protocol: "http2",
        dns: "1.1.1.1",
      },
      vpn_username: "dev_user_abc",
      vpn_jwt: "jwt",
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
  }

  async postMetrics(_: string, batch: { events: Array<{ type: string }> }) {
    this.metricsCalls += 1;
    return { accepted: batch.events.length, rejected: 0 };
  }
}

class FakeConnector implements VpnConnector {
  connectCalls = 0;
  disconnectCalls = 0;

  async connect(): Promise<void> {
    this.connectCalls += 1;
  }

  async disconnect(): Promise<void> {
    this.disconnectCalls += 1;
  }
}

const setup = async () => {
  const store = new InMemorySecureStore();
  const api = new FakeHttpClient();
  const auth = new AuthModule(api as never, store);
  const devices = new DeviceModule(store, api as never);
  const connector = new FakeConnector();
  const vpn = new VpnSessionModule(api as never, auth, devices, connector, "android", "1.0.0");
  const metrics = new MetricsModule(api as never, auth, devices);
  const push = new PushModule(api as never, auth, devices, store);
  const app = new AppCoreModule({ auth, devices, vpn, metrics, push });

  return { app, auth, devices, metrics, push, api, connector };
};

describe("AppCoreModule", () => {
  it("выполняет полный happy-path: login -> connect -> disconnect -> flush", async () => {
    const { app, metrics, api, connector } = await setup();

    const prepared = await app.loginAndPrepare({
      accountId: "acc1",
      email: "user@example.com",
      password: "pw",
    });

    expect(prepared.accountId).toBe("acc1");
    expect(prepared.deviceId).toBeTruthy();
    expect(prepared.deviceUser).toBe("device-user-1");

    const sessionId = await app.connectVpn();
    expect(sessionId).toBeTruthy();
    expect(connector.connectCalls).toBe(1);

    expect(metrics.queuedCount()).toBeGreaterThanOrEqual(3);

    await app.disconnectVpnAndFlushMetrics();

    expect(connector.disconnectCalls).toBe(1);
    expect(metrics.queuedCount()).toBe(0);
    expect(api.metricsCalls).toBe(1);
  });

  it("чистит данные аккаунта при logout через AuthModule hooks", async () => {
    const { app, auth, devices, push } = await setup();

    await app.loginAndPrepare({
      accountId: "acc1",
      email: "user@example.com",
      password: "pw",
    });

    await push.registerToken("fcm", "token-1");
    expect(await push.getCurrentPushToken("fcm")).toBe("token-1");
    expect(await devices.getDeviceUser("acc1")).toBe("device-user-1");

    await app.logoutActiveAccount();

    expect(auth.getActiveAccountId()).toBeNull();
    await expect(push.getCurrentPushToken("fcm")).rejects.toThrow("No active account selected");
    expect(await devices.getDeviceUser("acc1")).toBeNull();
  });

  it("при переключении аккаунта отправляет отложенный push token нужного аккаунта", async () => {
    const { app, auth, devices, push, api } = await setup();

    await app.loginAndPrepare({
      accountId: "acc1",
      email: "user1@example.com",
      password: "pw",
    });

    await auth.login("acc2", "user2@example.com", "pw");
    await auth.setActiveAccount("acc2");

    // сохраняем pending-токен в storage через неуспешную регистрацию
    const originalRegister = api.registerPushToken.bind(api);
    api.registerPushToken = async () => {
      throw new Error("network");
    };
    await expect(push.registerToken("apns", "apns-acc2")).rejects.toThrow("network");

    api.registerPushToken = originalRegister;
    await devices.registerCurrentDevice(await auth.getActiveAccessToken(), "acc2");

    await app.switchAccount("acc2");

    expect(api.registeredPushTokens.some((token) => token.token === "apns-acc2")).toBe(true);
  });
});
