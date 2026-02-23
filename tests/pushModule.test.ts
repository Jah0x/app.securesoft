import { describe, expect, it } from "vitest";
import { AuthModule, DeviceModule, InMemorySecureStore, PushModule } from "../src/index.js";

class FakeHttpClient {
  registerPayload: unknown = null;
  readIds: string[] = [];

  async login() {
    return { accessToken: "access", refreshToken: "refresh" };
  }

  async refresh() {
    return { accessToken: "access2", refreshToken: "refresh2" };
  }

  async registerDevice() {
    return { device_user: "device-user-1" };
  }

  async registerPushToken(_: string, payload: unknown) {
    this.registerPayload = payload;
  }

  async listNotifications() {
    return [
      {
        id: "n1",
        title: "Оплата",
        body: "Продлите подписку",
        created_at: new Date().toISOString(),
        is_read: false,
      },
    ];
  }

  async markNotificationRead(_: string, notificationId: string) {
    this.readIds.push(notificationId);
  }
}

describe("PushModule", () => {
  it("регистрирует push token и поддерживает inbox", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const push = new PushModule(api as never, auth, new DeviceModule(store), store);

    await push.registerToken("acc1", "fcm", "fcm-token");
    const inbox = await push.listInbox();
    expect(await push.getCachedInbox()).toEqual(inbox);

    await push.markAsRead("n1");
    const cached = await push.getCachedInbox();

    expect((api.registerPayload as { provider: string }).provider).toBe("fcm");
    expect(inbox).toHaveLength(1);
    expect(api.readIds).toEqual(["n1"]);
    expect(cached[0]?.is_read).toBe(true);
  });
});
