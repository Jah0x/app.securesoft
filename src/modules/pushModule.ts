import { HttpClient } from "../api/httpClient.js";
import type { SecureStore } from "../storage/secureStore.js";
import { AuthModule } from "./authModule.js";
import { DeviceModule } from "./deviceModule.js";
import type { PushNotification, PushProvider, PushTokenRegistration } from "../types/contracts.js";

interface PendingPushToken {
  provider: PushProvider;
  token: string;
}

export interface PushPermissionAdapter {
  requestPermission(): Promise<boolean>;
}

export interface PushRuntimeAdapter {
  onForegroundMessage(handler: (notification: PushNotification) => Promise<void>): void;
  onBackgroundMessage(handler: (notification: PushNotification) => Promise<void>): void;
}

export class PushModule {
  private static readonly INBOX_KEY_PREFIX = "push:inbox";
  private static readonly TOKEN_KEY_PREFIX = "push:token";
  private static readonly PENDING_TOKENS_KEY_PREFIX = "push:pending_tokens";

  constructor(
    private readonly api: HttpClient,
    private readonly auth: AuthModule,
    private readonly devices: DeviceModule,
    private readonly secureStore?: SecureStore,
    private readonly permissions?: PushPermissionAdapter,
    private readonly runtime?: PushRuntimeAdapter,
  ) {}

  async registerToken(provider: PushProvider, token: string): Promise<void> {
    const accountId = this.requireAccountId();

    try {
      await this.sendTokenToBackend({ accountId, provider, token });
      await this.savePushToken(accountId, provider, token);
      await this.removePendingToken(accountId, provider);
    } catch (error) {
      await this.savePendingToken(accountId, provider, token);
      throw error;
    }
  }

  async flushPendingTokens(): Promise<void> {
    const accountId = this.requireAccountId();
    const pending = await this.getPendingTokens(accountId);
    for (const token of pending) {
      await this.sendTokenToBackend({ accountId, provider: token.provider, token: token.token });
      await this.savePushToken(accountId, token.provider, token.token);
      await this.removePendingToken(accountId, token.provider);
    }
  }

  async getCurrentPushToken(provider: PushProvider): Promise<string | null> {
    if (!this.secureStore) {
      return null;
    }

    const accountId = this.requireAccountId();
    return this.secureStore.get(this.pushTokenKey(accountId, provider));
  }


  async requestPermission(): Promise<boolean> {
    if (!this.permissions) {
      return true;
    }

    return this.permissions.requestPermission();
  }

  enableRuntimeHandling(): void {
    if (!this.runtime) {
      return;
    }

    this.runtime.onForegroundMessage(async (notification) => {
      await this.upsertInboxNotification(notification);
    });

    this.runtime.onBackgroundMessage(async (notification) => {
      await this.upsertInboxNotification(notification);
    });
  }

  async clearAccountData(accountId: string): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    await this.secureStore.delete(this.inboxKey(accountId));
    await this.secureStore.delete(this.pushTokenKey(accountId, "apns"));
    await this.secureStore.delete(this.pushTokenKey(accountId, "fcm"));
    await this.secureStore.delete(this.pendingTokensKey(accountId));
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

    const accountId = this.auth.getActiveAccountId();
    if (!accountId) {
      return [];
    }

    const raw = await this.secureStore.get(this.inboxKey(accountId));
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as PushNotification[];
  }


  async ingestNotification(notification: PushNotification): Promise<void> {
    await this.upsertInboxNotification(notification);
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

  private requireAccountId(): string {
    const accountId = this.auth.getActiveAccountId();
    if (!accountId) {
      throw new Error("No active account selected");
    }

    return accountId;
  }

  private async sendTokenToBackend(params: PendingPushToken & { accountId: string }): Promise<void> {
    const deviceId = await this.devices.getOrCreateDeviceId();
    const payload: PushTokenRegistration = {
      device_id: deviceId,
      account_id: params.accountId,
      provider: params.provider,
      token: params.token,
    };

    await this.auth.runWithAccessToken((accessToken) => this.api.registerPushToken(accessToken, payload));
  }

  private async savePushToken(accountId: string, provider: PushProvider, token: string): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    await this.secureStore.set(this.pushTokenKey(accountId, provider), token);
  }

  private pushTokenKey(accountId: string, provider: PushProvider): string {
    return `${PushModule.TOKEN_KEY_PREFIX}:${accountId}:${provider}`;
  }

  private pendingTokensKey(accountId: string): string {
    return `${PushModule.PENDING_TOKENS_KEY_PREFIX}:${accountId}`;
  }

  private inboxKey(accountId: string): string {
    return `${PushModule.INBOX_KEY_PREFIX}:${accountId}`;
  }

  private async getPendingTokens(accountId: string): Promise<PendingPushToken[]> {
    if (!this.secureStore) {
      return [];
    }

    const raw = await this.secureStore.get(this.pendingTokensKey(accountId));
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as PendingPushToken[];
  }

  private async savePendingToken(accountId: string, provider: PushProvider, token: string): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    const pending = await this.getPendingTokens(accountId);
    const filtered = pending.filter((item) => item.provider !== provider);
    filtered.push({ provider, token });
    await this.secureStore.set(this.pendingTokensKey(accountId), JSON.stringify(filtered));
  }

  private async removePendingToken(accountId: string, provider: PushProvider): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    const pending = await this.getPendingTokens(accountId);
    const filtered = pending.filter((item) => item.provider !== provider);
    await this.secureStore.set(this.pendingTokensKey(accountId), JSON.stringify(filtered));
  }


  private async upsertInboxNotification(notification: PushNotification): Promise<void> {
    const cached = await this.getCachedInbox();
    const withoutSameId = cached.filter((item) => item.id !== notification.id);
    withoutSameId.unshift(notification);
    await this.saveInbox(withoutSameId);
  }

  private async saveInbox(inbox: PushNotification[]): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    const accountId = this.auth.getActiveAccountId();
    if (!accountId) {
      return;
    }

    await this.secureStore.set(this.inboxKey(accountId), JSON.stringify(inbox));
  }
}
