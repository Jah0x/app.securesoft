import { describe, expect, it } from "vitest";
import { UpdateModule } from "../src/index.js";

class FakeHttpClient {
  async getAppVersion() {
    return {
      latest_version: "2.0.0",
      minimum_supported_version: "1.5.0",
      forced_update: true,
    };
  }
}

describe("UpdateModule", () => {
  it("возвращает необходимость forced update", async () => {
    const module = new UpdateModule(new FakeHttpClient() as never, "ios", "1.0.0");
    await expect(module.isForcedUpdateRequired()).resolves.toBe(true);
  });
});
