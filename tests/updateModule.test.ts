import { describe, expect, it } from "vitest";
import { UpdateModule } from "../src/index.js";

class FakeHttpClient {
  constructor(private readonly versionPayload: { latest_version: string; minimum_supported_version: string; forced_update: boolean }) {}

  async getAppVersion() {
    return this.versionPayload;
  }
}

describe("UpdateModule", () => {
  it("возвращает необходимость forced update", async () => {
    const module = new UpdateModule(
      new FakeHttpClient({
        latest_version: "2.0.0",
        minimum_supported_version: "1.5.0",
        forced_update: true,
      }) as never,
      "ios",
      "1.0.0",
    );
    await expect(module.isForcedUpdateRequired()).resolves.toBe(true);
  });

  it("определяет update availability и minimum supported version", async () => {
    const module = new UpdateModule(
      new FakeHttpClient({
        latest_version: "2.0.0",
        minimum_supported_version: "1.5.0",
        forced_update: false,
      }) as never,
      "ios",
      "1.4.9",
    );

    await expect(module.isUpdateAvailable()).resolves.toBe(true);
    await expect(module.isForcedUpdateRequired()).resolves.toBe(true);
  });

  it("возвращает blocking/soft policy для update UI", async () => {
    const blocking = new UpdateModule(
      new FakeHttpClient({
        latest_version: "2.0.0",
        minimum_supported_version: "1.5.0",
        forced_update: false,
      }) as never,
      "android",
      "1.4.9",
    );

    await expect(
      blocking.getUpdatePolicy({ ios: "https://apps.apple.com/app/id1", android: "https://play.google.com/store/apps/details?id=app" }),
    ).resolves.toEqual({
      mode: "blocking",
      latestVersion: "2.0.0",
      minimumSupportedVersion: "1.5.0",
      redirectUrl: "https://play.google.com/store/apps/details?id=app",
    });

    const soft = new UpdateModule(
      new FakeHttpClient({
        latest_version: "2.0.0",
        minimum_supported_version: "1.0.0",
        forced_update: false,
      }) as never,
      "ios",
      "1.6.0",
    );

    await expect(
      soft.getUpdatePolicy({ ios: "https://apps.apple.com/app/id1", android: "https://play.google.com/store/apps/details?id=app" }),
    ).resolves.toEqual({
      mode: "soft",
      latestVersion: "2.0.0",
      minimumSupportedVersion: "1.0.0",
      redirectUrl: "https://apps.apple.com/app/id1",
    });
  });

});
