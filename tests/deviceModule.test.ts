import { describe, expect, it } from "vitest";
import { DeviceModule, InMemorySecureStore } from "../src/index.js";

class FakeHttpClient {
  async registerDevice() {
    return { device_user: "device-user-42" };
  }
}

describe("DeviceModule", () => {
  it("регистрирует device_id в ЛК и хранит device_user изолированно по аккаунтам", async () => {
    const module = new DeviceModule(new InMemorySecureStore(), new FakeHttpClient() as never);
    const deviceUser = await module.registerCurrentDevice("access", "acc1");

    expect(deviceUser).toBe("device-user-42");
    await expect(module.getDeviceUser("acc1")).resolves.toBe("device-user-42");
    await expect(module.getDeviceUser("acc2")).resolves.toBeNull();
  });
});
