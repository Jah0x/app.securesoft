import type { PushProvider } from "../types/contracts.js";
import { PushModule } from "../modules/pushModule.js";
import type { AppRoute } from "../ui/coreMvp.js";
import { resolveDeepLinkRoute } from "../ui/deepLinkRouter.js";

export interface PlatformPushPermissionAdapter {
  requestPermission(): Promise<boolean>;
}

export interface PushTokenAdapter {
  provider: PushProvider;
  getDeviceToken(): Promise<string>;
  onForegroundMessage(handler: (payload: { title: string; body: string; deepLink?: string }) => Promise<void>): void;
  onNotificationOpen?(handler: (payload: { title: string; body: string; deepLink?: string }) => Promise<void>): void;
}

export interface PushNavigationAdapter {
  navigate(route: AppRoute): void;
}

export class PushPlatformCoordinator {
  constructor(
    private readonly pushModule: PushModule,
    private readonly permissionAdapter: PlatformPushPermissionAdapter,
    private readonly tokenAdapter: PushTokenAdapter,
    private readonly navigation?: PushNavigationAdapter,
  ) {}

  async bootstrap(): Promise<boolean> {
    const granted = await this.permissionAdapter.requestPermission();
    if (!granted) {
      return false;
    }

    const token = await this.tokenAdapter.getDeviceToken();
    await this.pushModule.registerToken(this.tokenAdapter.provider, token);

    const handlePayload = async (payload: { title: string; body: string; deepLink?: string }): Promise<void> => {
      await this.pushModule.ingestNotification({
        id: crypto.randomUUID(),
        title: payload.title,
        body: payload.body,
        deep_link: payload.deepLink,
        created_at: new Date().toISOString(),
        is_read: false,
      });

      const route = resolveDeepLinkRoute(payload.deepLink);
      if (route) {
        this.navigation?.navigate(route);
      }
    };

    this.tokenAdapter.onForegroundMessage(handlePayload);
    this.tokenAdapter.onNotificationOpen?.(handlePayload);

    return true;
  }
}
