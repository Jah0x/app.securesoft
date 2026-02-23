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

class E2EFakeApi {
  async login() {
    return { accessToken: "access", refreshToken: "refresh" };
  }
  async refresh() {
    return { accessToken: "access-2", refreshToken: "refresh-2" };
  }
  async registerDevice() {
    return { device_user: "device-user-e2e" };
  }
  async registerPushToken() {}
  async postMetrics(_: string, batch: { events: unknown[] }) {
    return { accepted: batch.events.length, rejected: 0 };
  }
  async requestVpnToken() {
    return {
      endpoint: {
        address: "198.51.100.10:443",
        hostname: "edge.vpn.example.com",
        protocol: "http2",
        dns: "9.9.9.9",
      },
      vpn_username: "u",
      vpn_jwt: "jwt",
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
  }
  async logout() {}
}

class E2EConnector implements VpnConnector {
  async connect() {}
  async disconnect() {}
}

describe("E2E flow simulation", () => {
  it("проходит сценарий login → token → connect → reconnect → logout", async () => {
    const store = new InMemorySecureStore();
    const api = new E2EFakeApi();
    const auth = new AuthModule(api as never, store);
    const devices = new DeviceModule(store, api as never);
    const vpn = new VpnSessionModule(api as never, auth, devices, new E2EConnector(), "android", "1.0.0");
    const metrics = new MetricsModule(api as never, auth, devices);
    const push = new PushModule(api as never, auth, devices, store);
    const core = new AppCoreModule({ auth, devices, vpn, metrics, push });

    const prepared = await core.loginAndPrepare({
      accountId: "acc-e2e",
      email: "e2e@example.com",
      password: "pw",
    });

    expect(prepared.deviceUser).toBe("device-user-e2e");

    const session = await core.connectVpn();
    expect(session).toBeTruthy();

    const reconnectSession = await core.reconnectVpnWithMetrics(2, 1);
    expect(reconnectSession).toBeTruthy();

    await core.disconnectVpnAndFlushMetrics();
    await core.logoutActiveAccount();
    expect(auth.getActiveAccountId()).toBeNull();
  });
});
