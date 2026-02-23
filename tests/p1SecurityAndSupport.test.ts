import { describe, expect, it } from "vitest";
import { InMemorySecureStore, SecurityModule, SupportModule, UpdateModule } from "../src/index.js";

describe("P1 security + support", () => {
  it("проверяет tls pinning и integrity флаги", async () => {
    const module = new SecurityModule(
      new InMemorySecureStore(),
      {
        isEmulator: async () => true,
        isRootedOrJailbroken: async () => true,
      },
      {
        getServerCertificateHash: async () => "sha256/ABCD",
      },
    );

    await expect(module.verifyTlsPin("edge.example.com", "abcd")).resolves.toBe(true);
    await expect(module.evaluateDeviceIntegrity()).resolves.toEqual({
      isTrusted: false,
      reasons: ["emulator_detected", "root_or_jailbreak_detected"],
    });
  });

  it("очищает чувствительные ключи из secure store", async () => {
    const store = new InMemorySecureStore();
    await store.set("auth:acc:tokens", "secret");
    await store.set("device:id", "device");

    const module = new SecurityModule(store, {
      isEmulator: async () => false,
      isRootedOrJailbroken: async () => false,
    });

    await module.clearSensitiveData(["auth:acc:tokens", "device:id"]);

    await expect(store.get("auth:acc:tokens")).resolves.toBeNull();
    await expect(store.get("device:id")).resolves.toBeNull();
  });

  it("сохраняет отправленные support-тикеты локально", async () => {
    const sent: string[] = [];
    const support = new SupportModule(new InMemorySecureStore(), {
      send: async (ticket) => {
        sent.push(ticket.id);
      },
    });

    await support.submit({
      id: "t-1",
      accountId: "acc-1",
      subject: "VPN issue",
      message: "Cannot reconnect",
      createdAt: "2026-01-01T00:00:00.000Z",
      channel: "email",
    });

    expect(sent).toEqual(["t-1"]);
    await expect(support.list("acc-1")).resolves.toHaveLength(1);
  });

  it("читает mandatory update флаг из /vpn/token", () => {
    const module = new UpdateModule({
      getAppVersion: async () => ({ latest_version: "1.0.0", minimum_supported_version: "1.0.0", forced_update: false }),
    } as never, "ios", "1.0.0");

    expect(
      module.getPolicyFromVpnToken({
        endpoint: { address: "198.51.100.10:443", hostname: "edge.example.com", protocol: "http2", dns: "1.1.1.1" },
        vpn_username: "u",
        vpn_jwt: "j",
        expires_at: "2030-01-01T00:00:00.000Z",
        update: {
          forced: true,
          min_supported_version: "2.0.0",
          latest_version: "2.1.0",
          store_url: "https://apps.apple.com/app/id1",
        },
      }),
    ).toEqual({
      mode: "blocking",
      latestVersion: "2.1.0",
      minimumSupportedVersion: "2.0.0",
      redirectUrl: "https://apps.apple.com/app/id1",
    });
  });
});
