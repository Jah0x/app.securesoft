import type { PushProvider } from "../types/contracts.js";
import { PushModule } from "../modules/pushModule.js";

export interface PlatformPushPermissionAdapter {
  requestPermission(): Promise<boolean>;
}

export interface PushTokenAdapter {
  provider: PushProvider;
  getDeviceToken(): Promise<string>;
  onForegroundMessage(handler: (payload: { title: string; body: string; deepLink?: string }) => Promise<void>): void;
}

export class PushPlatformCoordinator {
  constructor(
    private readonly pushModule: PushModule,
    private readonly permissionAdapter: PlatformPushPermissionAdapter,
    private readonly tokenAdapter: PushTokenAdapter,
  ) {}

  async bootstrap(): Promise<boolean> {
    const granted = await this.permissionAdapter.requestPermission();
    if (!granted) {
      return false;
    }

    const token = await this.tokenAdapter.getDeviceToken();
    await this.pushModule.registerToken(this.tokenAdapter.provider, token);

    this.tokenAdapter.onForegroundMessage(async (payload) => {
      await this.pushModule.ingestNotification({
        id: crypto.randomUUID(),
        title: payload.title,
        body: payload.body,
        deep_link: payload.deepLink,
        created_at: new Date().toISOString(),
        is_read: false,
      });
    });

    return true;
  }
}
