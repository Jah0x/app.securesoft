import { describe, expect, it } from "vitest";
import { AuthModule, DeviceModule, InMemorySecureStore, VpnSessionModule, type VpnConnector } from "../src/index.js";

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

  async postMetrics() {
    return { accepted: 1, rejected: 0 };
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
});
