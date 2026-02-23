import { describe, expect, it } from "vitest";
import {
  AuthModule,
  DeviceModule,
  InMemorySecureStore,
  PushModule,
  type PushPermissionAdapter,
  type PushRuntimeAdapter,
} from "../src/index.js";



class FakePermissions implements PushPermissionAdapter {
  async requestPermission(): Promise<boolean> {
    return true;
  }
}

class FakeRuntime implements PushRuntimeAdapter {
  private foregroundHandler: ((notification: any) => Promise<void>) | null = null;
  private backgroundHandler: ((notification: any) => Promise<void>) | null = null;

  onForegroundMessage(handler: (notification: any) => Promise<void>): void {
    this.foregroundHandler = handler;
  }

  onBackgroundMessage(handler: (notification: any) => Promise<void>): void {
    this.backgroundHandler = handler;
  }

  async emitForeground(notification: any): Promise<void> {
    await this.foregroundHandler?.(notification);
  }

  async emitBackground(notification: any): Promise<void> {
    await this.backgroundHandler?.(notification);
  }
}

class FakeHttpClient {
  registerPayload: unknown = null;
  readIds: string[] = [];
  failRegister = false;

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
    if (this.failRegister) {
      throw new Error("network");
    }

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

    await push.registerToken("fcm", "fcm-token");
    const inbox = await push.listInbox();
    expect(await push.getCachedInbox()).toEqual(inbox);

    await push.markAsRead("n1");
    const cached = await push.getCachedInbox();

    expect((api.registerPayload as { provider: string }).provider).toBe("fcm");
    expect(await push.getCurrentPushToken("fcm")).toBe("fcm-token");
    expect(inbox).toHaveLength(1);
    expect(api.readIds).toEqual(["n1"]);
    expect(cached[0]?.is_read).toBe(true);
  });

  it("кеширует token при ошибке и отправляет позже", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const push = new PushModule(api as never, auth, new DeviceModule(store), store);

    api.failRegister = true;
    await expect(push.registerToken("apns", "ios-token")).rejects.toThrow("network");

    api.failRegister = false;
    await push.flushPendingTokens();

    expect((api.registerPayload as { token: string }).token).toBe("ios-token");
    expect(await push.getCurrentPushToken("apns")).toBe("ios-token");
  });

  it("обрабатывает foreground/background и запрашивает разрешение", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const runtime = new FakeRuntime();
    const push = new PushModule(api as never, auth, new DeviceModule(store), store, new FakePermissions(), runtime);

    await expect(push.requestPermission()).resolves.toBe(true);

    push.enableRuntimeHandling();

    await runtime.emitForeground({
      id: "n2",
      title: "Foreground",
      body: "msg",
      created_at: new Date().toISOString(),
      is_read: false,
    });

    await runtime.emitBackground({
      id: "n3",
      title: "Background",
      body: "msg",
      created_at: new Date().toISOString(),
      is_read: false,
    });

    const cached = await push.getCachedInbox();
    expect(cached.map((item) => item.id)).toEqual(["n3", "n2"]);
  });

});
