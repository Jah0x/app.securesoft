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
});
