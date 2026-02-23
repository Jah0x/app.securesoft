import { HttpClient } from "../api/httpClient.js";
import { AuthModule } from "./authModule.js";
import { DeviceModule } from "./deviceModule.js";
import type { PushNotification, PushProvider } from "../types/contracts.js";

export class PushModule {
  constructor(
    private readonly api: HttpClient,
    private readonly auth: AuthModule,
    private readonly devices: DeviceModule,
  ) {}

  async registerToken(accountId: string, provider: PushProvider, token: string): Promise<void> {
    const deviceId = await this.devices.getOrCreateDeviceId();

    await this.auth.runWithAccessToken((accessToken) =>
      this.api.registerPushToken(accessToken, {
        device_id: deviceId,
        account_id: accountId,
        provider,
        token,
      }),
    );
  }

  async listInbox(): Promise<PushNotification[]> {
    return this.auth.runWithAccessToken((accessToken) => this.api.listNotifications(accessToken));
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.auth.runWithAccessToken((accessToken) => this.api.markNotificationRead(accessToken, notificationId));
  }
}
