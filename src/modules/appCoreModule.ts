import { createUuid } from "../utils/uuid.js";
import type { AuthModule } from "./authModule.js";
import type { DeviceModule } from "./deviceModule.js";
import type { MetricsModule } from "./metricsModule.js";
import type { PushModule } from "./pushModule.js";
import type { VpnSessionModule } from "./vpnSessionModule.js";
import type { OfflineActionQueue } from "./resilienceModule.js";

export interface AppCoreModules {
  auth: AuthModule;
  devices: DeviceModule;
  vpn: VpnSessionModule;
  metrics: MetricsModule;
  push: PushModule;
  offlineQueue?: OfflineActionQueue;
}

export class AppCoreModule {
  constructor(private readonly modules: AppCoreModules) {
    this.modules.auth.onLogout(async (accountId) => {
      await Promise.all([
        this.modules.devices.clearAccountData(accountId),
        this.modules.push.clearAccountData(accountId),
      ]);
    });
  }

  async loginAndPrepare(params: {
    accountId: string;
    email: string;
    password: string;
  }): Promise<{ accountId: string; deviceId: string; deviceUser: string }> {
    const { accountId, email, password } = params;

    await this.modules.auth.login(accountId, email, password);
    return this.finishAccountPreparation(accountId);
  }

  async loginWithOAuthAndPrepare(params: {
    accountId: string;
    provider: string;
    code: string;
  }): Promise<{ accountId: string; deviceId: string; deviceUser: string }> {
    const { accountId, provider, code } = params;

    await this.modules.auth.oauthLogin(accountId, provider, code);
    return this.finishAccountPreparation(accountId);
  }

  private async finishAccountPreparation(
    accountId: string,
  ): Promise<{ accountId: string; deviceId: string; deviceUser: string }> {
    const accessToken = await this.modules.auth.getActiveAccessToken();
    const [deviceId, deviceUser] = await Promise.all([
      this.modules.devices.getOrCreateDeviceId(),
      this.modules.devices.registerCurrentDevice(accessToken, accountId),
    ]);

    await this.modules.push.flushPendingTokens();

    this.modules.metrics.enqueue(this.createEvent("user_login", { account_id: accountId }));

    return {
      accountId,
      deviceId,
      deviceUser,
    };
  }

  async switchAccount(accountId: string): Promise<void> {
    const vpnState = this.modules.vpn.getState();
    if (["preparing", "connecting", "connected", "reconnecting"].includes(vpnState)) {
      throw new Error("Cannot switch account while VPN session is active");
    }

    await this.modules.auth.setActiveAccount(accountId);
    await this.modules.push.flushPendingTokens();

    this.modules.metrics.enqueue(this.createEvent("account_switch", { account_id: accountId }));
  }

  async connectVpn(): Promise<string> {
    const startedAt = Date.now();

    this.modules.metrics.enqueue(
      this.createEvent("vpn_connect_click", { source: "main_screen" }, "user_action", "info"),
    );

    try {
      await this.modules.vpn.connect();
      await this.modules.offlineQueue?.flush(async () => undefined);

      const sessionId = this.modules.vpn.getCurrentSessionId();
      if (!sessionId) {
        throw new Error("Missing VPN session id");
      }

      this.modules.metrics.enqueue(
        this.createEvent("vpn_connect", {
          connect_ms: Date.now() - startedAt,
          state: this.modules.vpn.getState(),
          reconnect_gap_ms: this.modules.vpn.getReconnectStats().lastReconnectGapMs,
        }, "connection", "info"),
      );

      this.modules.metrics.startPeriodicFlush(sessionId);

      return sessionId;
    } catch (error) {
      await this.modules.offlineQueue?.enqueue({
        id: createUuid(),
        type: "vpn_connect_click",
        payload: { source: "main_screen" },
        createdAt: new Date().toISOString(),
      });
      this.modules.metrics.enqueue(
        this.createEvent("vpn_connect_error", {
          state: this.modules.vpn.getState(),
          reason: error instanceof Error ? error.message : "unknown",
        }, "error", "error"),
      );
      throw error;
    }
  }

  async reconnectVpnWithMetrics(maxAttempts = 3, baseDelayMs = 250): Promise<string> {
    const startedAt = Date.now();

    this.modules.metrics.enqueue(this.createEvent("vpn_reconnect_attempt", {}, "connection", "warning"));

    try {
      await this.modules.vpn.reconnectWithBackoff(maxAttempts, baseDelayMs);

      const sessionId = this.modules.vpn.getCurrentSessionId();
      if (!sessionId) {
        throw new Error("Missing VPN session id");
      }

      const reconnectStats = this.modules.vpn.getReconnectStats();
      this.modules.metrics.enqueue(
        this.createEvent(
          "vpn_reconnect_success",
          {
            reconnect_ms: Date.now() - startedAt,
            reconnect_gap_ms: reconnectStats.lastReconnectGapMs,
            reconnect_total_attempts: reconnectStats.totalAttempts,
            state: this.modules.vpn.getState(),
          },
          "connection",
          "info",
        ),
      );

      return sessionId;
    } catch (error) {
      await this.modules.offlineQueue?.enqueue({
        id: createUuid(),
        type: "vpn_connect_click",
        payload: { source: "main_screen" },
        createdAt: new Date().toISOString(),
      });
      this.modules.metrics.enqueue(
        this.createEvent(
          "vpn_reconnect_error",
          {
            reconnect_ms: Date.now() - startedAt,
            state: this.modules.vpn.getState(),
            reason: error instanceof Error ? error.message : "unknown",
          },
          "error",
          "error",
        ),
      );

      throw error;
    }
  }

  async disconnectVpnAndFlushMetrics(): Promise<void> {
    const sessionId = this.modules.vpn.getCurrentSessionId();

    this.modules.metrics.enqueue(this.createEvent("vpn_disconnect_click", { source: "main_screen" }));

    this.modules.metrics.stopPeriodicFlush();
    await this.modules.vpn.disconnect();

    if (sessionId) {
      await this.modules.metrics.flush(sessionId);
    }
  }

  async logoutActiveAccount(): Promise<void> {
    const accountId = this.modules.auth.getActiveAccountId();
    if (!accountId) {
      return;
    }

    this.modules.metrics.stopPeriodicFlush();
    await this.modules.vpn.disconnect();
    this.modules.metrics.enqueue(this.createEvent("user_logout", { account_id: accountId }));
    this.modules.metrics.clearQueue();

    await this.modules.auth.logout(accountId);
  }

  private createEvent(
    type: string,
    payload: Record<string, unknown>,
    category: "user_action" | "connection" | "error" | "security" = "connection",
    severity: "info" | "warning" | "error" = "info",
  ) {
    return {
      event_id: createUuid(),
      type,
      ts: new Date().toISOString(),
      payload: {
        ...payload,
        category,
        severity,
      },
    };
  }
}
