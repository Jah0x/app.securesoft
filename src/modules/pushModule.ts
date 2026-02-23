import { HttpClient } from "../api/httpClient.js";
import type { SecureStore } from "../storage/secureStore.js";
import { AuthModule } from "./authModule.js";
import { DeviceModule } from "./deviceModule.js";
import type { PushNotification, PushProvider } from "../types/contracts.js";

export class PushModule {
  private static readonly INBOX_KEY_PREFIX = "push:inbox";

  constructor(
    private readonly api: HttpClient,
    private readonly auth: AuthModule,
    private readonly devices: DeviceModule,
    private readonly secureStore?: SecureStore,
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
    const inbox = await this.auth.runWithAccessToken((accessToken) => this.api.listNotifications(accessToken));
    await this.saveInbox(inbox);
    return inbox;
  }

  async getCachedInbox(): Promise<PushNotification[]> {
    if (!this.secureStore) {
      return [];
    }

    const key = this.inboxKey();
    if (!key) {
      return [];
    }

    const raw = await this.secureStore.get(key);
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as PushNotification[];
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.auth.runWithAccessToken((accessToken) => this.api.markNotificationRead(accessToken, notificationId));

    if (!this.secureStore) {
      return;
    }

    const inbox = await this.getCachedInbox();
    const next = inbox.map((notification) =>
      notification.id === notificationId ? { ...notification, is_read: true } : notification,
    );
    await this.saveInbox(next);
  }

  private inboxKey(): string | null {
    const accountId = this.auth.getActiveAccountId();
    if (!accountId) {
      return null;
    }

    return `${PushModule.INBOX_KEY_PREFIX}:${accountId}`;
  }

  private async saveInbox(inbox: PushNotification[]): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    const key = this.inboxKey();
    if (!key) {
      return;
    }

    await this.secureStore.set(key, JSON.stringify(inbox));
  }
}
