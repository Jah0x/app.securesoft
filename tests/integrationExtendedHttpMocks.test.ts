import { describe, expect, it } from "vitest";
import { AuthModule, DeviceModule, InMemorySecureStore, PushModule } from "../src/index.js";

class ExtendedHttpMock {
  private shouldFailPush = true;

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
    if (this.shouldFailPush) {
      this.shouldFailPush = false;
      throw new Error("temporary upstream error");
    }
  }
}

describe("Integration with extended HTTP mocks", () => {
  it("ретраит pending push token после временной ошибки API", async () => {
    const api = new ExtendedHttpMock();
    const store = new InMemorySecureStore();
    const auth = new AuthModule(api as never, store);
    const devices = new DeviceModule(store, api as never);
    const push = new PushModule(api as never, auth, devices, store);

    await auth.login("acc-int", "int@example.com", "pw");
    await devices.registerCurrentDevice(await auth.getActiveAccessToken(), "acc-int");

    await expect(push.registerToken("fcm", "token-1")).rejects.toThrow("temporary upstream error");

    await expect(push.flushPendingTokens()).resolves.toBeUndefined();
    expect(await push.getCurrentPushToken("fcm")).toBe("token-1");
  });
});
