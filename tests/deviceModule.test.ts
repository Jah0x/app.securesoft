import { describe, expect, it } from "vitest";
import { DeviceModule, InMemorySecureStore } from "../src/index.js";

class FakeHttpClient {
  async registerDevice() {
    return { device_user: "device-user-42" };
  }
}

describe("DeviceModule", () => {
  it("регистрирует device_id в ЛК и хранит device_user", async () => {
    const module = new DeviceModule(new InMemorySecureStore(), new FakeHttpClient() as never);
    const deviceUser = await module.registerCurrentDevice("access");

    expect(deviceUser).toBe("device-user-42");
    await expect(module.getDeviceUser()).resolves.toBe("device-user-42");
  });
});
