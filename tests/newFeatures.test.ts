import { describe, expect, it } from "vitest";
import {
  AndroidEncryptedSecureStore,
  HttpClient,
  IosKeychainSecureStore,
  buildMainVpnViewState,
  buildNotificationsViewState,
  createReactNativeVpnBridge,
} from "../src/index.js";

describe("new features for TODO items 1-3", () => {
  it("делегирует connect/disconnect в RN native vpn bridge", async () => {
    const calls: string[] = [];
    const bridge = createReactNativeVpnBridge({
      connect: async () => {
        calls.push("connect");
      },
      disconnect: async () => {
        calls.push("disconnect");
      },
    });

    await bridge.connect({
      endpointAddress: "203.0.113.7:443",
      endpointHostname: "edge.example.com",
      protocol: "http2",
      dns: "1.1.1.1",
      tls: { sni: "edge.example.com", alpn: ["h2"] },
      auth: { username: "vpn", jwt: "jwt", basicAuth: { username: "u", password: "p" } },
      transport: { http2: true },
    });
    await bridge.disconnect();

    expect(calls).toEqual(["connect", "disconnect"]);
  });

  it("поддерживает платформенные secure store адаптеры", async () => {
    const data = new Map<string, string>();
    const backend = {
      getItem: async (key: string) => data.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: async (key: string) => {
        data.delete(key);
      },
    };

    const iosStore = new IosKeychainSecureStore(backend);
    const androidStore = new AndroidEncryptedSecureStore(backend);

    await iosStore.set("token", "abc");
    expect(await androidStore.get("token")).toBe("abc");

    await androidStore.delete("token");
    expect(await iosStore.get("token")).toBeNull();
  });

  it("формирует view-state core MVP", () => {
    const main = buildMainVpnViewState({
      vpnState: "connected",
      jwtExpiresInSeconds: 45,
      jwtTotalLifetimeSeconds: 60,
      serverName: "edge-12",
      subscriptionLabel: "Premium",
    });

    const notifications = buildNotificationsViewState([
      { id: "1", title: "a", body: "b", created_at: "2024-01-01", is_read: false },
      { id: "2", title: "c", body: "d", created_at: "2024-01-01", is_read: true },
    ]);

    expect(main.jwtTtlProgressPercent).toBe(75);
    expect(notifications.unreadCount).toBe(1);
  });

  it("вызывает новые API endpoints", async () => {
    const seen: Array<{ method: string; url: string }> = [];
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        seen.push({ method: String(init?.method ?? "GET"), url: String(input) });
        return new Response(JSON.stringify({ accessToken: "a", refreshToken: "r" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch,
    });

    await client.register({ email: "user@example.com", password: "pw" });
    await client.recoverPassword({ email: "user@example.com" });
    await client.resetPassword({ reset_token: "token", new_password: "newpw" });
    await client.listAccounts("token");
    await client.switchAccount("token", "acc1");
    await client.deleteAccount("token", "acc1");

    expect(seen).toEqual([
      { method: "POST", url: "https://api.example.com/auth/register" },
      { method: "POST", url: "https://api.example.com/auth/password/recover" },
      { method: "POST", url: "https://api.example.com/auth/password/reset" },
      { method: "GET", url: "https://api.example.com/accounts" },
      { method: "POST", url: "https://api.example.com/accounts/switch" },
      { method: "DELETE", url: "https://api.example.com/accounts/acc1" },
    ]);
  });
});
