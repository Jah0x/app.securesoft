import { describe, expect, it } from "vitest";
import {
  AndroidVpnServiceProvider,
  AuthModule,
  CORE_NAVIGATION_CONFIG,
  DeviceModule,
  InMemorySecureStore,
  IosPacketTunnelProvider,
  isTransitionAllowed,
  PushModule,
  PushPlatformCoordinator,
} from "../src/index.js";

class StaticTokenProvider {
  constructor(private readonly protocol: string, private readonly hostname = "edge.example.com") {}

  async getFreshConfig() {
    return {
      endpointAddress: "203.0.113.10:443",
      endpointHostname: this.hostname,
      protocol: this.protocol,
      dns: "1.1.1.1",
      tls: { sni: this.hostname, alpn: ["h2"] },
      auth: { username: "vpn", jwt: "jwt", basicAuth: { username: "vpn", password: "jwt" } },
      transport: { http2: this.protocol === "http2" },
    };
  }
}

class FakePushPermission {
  async requestPermission(): Promise<boolean> {
    return true;
  }
}

class FakePushTokenAdapter {
  provider = "fcm" as const;
  handler: ((payload: { title: string; body: string; deepLink?: string }) => Promise<void>) | null = null;
  openHandler: ((payload: { title: string; body: string; deepLink?: string }) => Promise<void>) | null = null;

  async getDeviceToken(): Promise<string> {
    return "device-token";
  }

  onForegroundMessage(handler: (payload: { title: string; body: string; deepLink?: string }) => Promise<void>): void {
    this.handler = handler;
  }

  onNotificationOpen(handler: (payload: { title: string; body: string; deepLink?: string }) => Promise<void>): void {
    this.openHandler = handler;
  }
}

class FakeNavigator {
  routeHistory: string[] = [];

  navigate(route: string): void {
    this.routeHistory.push(route);
  }
}

class FakeHttpClient {
  async login() {
    return { accessToken: "access", refreshToken: "refresh" };
  }

  async refresh() {
    return { accessToken: "access-2", refreshToken: "refresh-2" };
  }

  async registerDevice() {
    return { device_user: "du" };
  }

  async registerPushToken() {
    return { ok: true };
  }
}

describe("completion of unfinished TODO areas", () => {
  it("валидирует iOS/Android VPN provider contract", async () => {
    const ios = new IosPacketTunnelProvider(new StaticTokenProvider("http2"), {
      tokenTtlMs: 10_000,
      refreshBeforeExpiryMs: 9_000,
    });
    const android = new AndroidVpnServiceProvider(new StaticTokenProvider("quic"));

    await expect(ios.connect(await new StaticTokenProvider("http2").getFreshConfig())).resolves.toBeUndefined();
    await expect(android.connect(await new StaticTokenProvider("quic").getFreshConfig())).resolves.toBeUndefined();
    await expect(android.disconnect()).resolves.toBeUndefined();
  });

  it("поддерживает Navigation Stack/Tab и FSM transitions", () => {
    expect(CORE_NAVIGATION_CONFIG.stack.map((s) => s.route)).toEqual([
      "Auth",
      "MainVpn",
      "Status",
      "Notifications",
      "Accounts",
    ]);
    expect(CORE_NAVIGATION_CONFIG.tabs.map((s) => s.route)).toEqual([
      "MainVpn",
      "Status",
      "Notifications",
      "Accounts",
    ]);
    expect(isTransitionAllowed("Idle", "Authenticating")).toBe(true);
    expect(isTransitionAllowed("Connected", "Authenticating")).toBe(false);
  });

  it("bootstrap push coordinator: permission + token + ingest + route change", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "u@e.com", "pw");

    const push = new PushModule(api as never, auth, new DeviceModule(store), store);
    const tokenAdapter = new FakePushTokenAdapter();
    const navigator = new FakeNavigator();
    const coordinator = new PushPlatformCoordinator(push, new FakePushPermission(), tokenAdapter, navigator);

    await expect(coordinator.bootstrap()).resolves.toBe(true);
    await tokenAdapter.handler?.({ title: "Hello", body: "World", deepLink: "app://inbox" });
    await tokenAdapter.openHandler?.({ title: "From tray", body: "Click", deepLink: "app://status" });

    const cached = await push.getCachedInbox();
    expect(cached).toHaveLength(2);
    expect(cached.map((item) => item.title)).toEqual(["From tray", "Hello"]);
    expect(navigator.routeHistory).toEqual(["Notifications", "Status"]);
  });
});
