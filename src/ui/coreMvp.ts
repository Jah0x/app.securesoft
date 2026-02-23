import type { PushNotification, VpnState } from "../types/contracts.js";

export type AppRoute = "Auth" | "MainVpn" | "Status" | "Notifications" | "Accounts";

export interface AuthViewState {
  mode: "login" | "register" | "recover";
  availableOAuthProviders: string[];
}

export interface MainVpnViewState {
  vpnState: VpnState;
  jwtTtlProgressPercent: number;
  serverName: string | null;
  subscriptionLabel: string;
}

export interface StatusViewState {
  throughputKbps: number;
  rttMs: number;
  redCounters: {
    requestRate: number;
    errorRate: number;
    durationMsP95: number;
  };
  trafficBytes: number;
}

export interface AccountsViewState {
  activeAccountId: string | null;
  accounts: string[];
}

export interface NotificationsViewState {
  inbox: PushNotification[];
  unreadCount: number;
}

export const buildMainVpnViewState = (input: {
  vpnState: VpnState;
  jwtExpiresInSeconds: number | null;
  jwtTotalLifetimeSeconds: number;
  serverName: string | null;
  subscriptionLabel: string;
}): MainVpnViewState => {
  const jwtTtlProgressPercent =
    input.jwtExpiresInSeconds === null || input.jwtTotalLifetimeSeconds <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((input.jwtExpiresInSeconds / input.jwtTotalLifetimeSeconds) * 100)));

  return {
    vpnState: input.vpnState,
    jwtTtlProgressPercent,
    serverName: input.serverName,
    subscriptionLabel: input.subscriptionLabel,
  };
};

export const buildNotificationsViewState = (inbox: PushNotification[]): NotificationsViewState => ({
  inbox,
  unreadCount: inbox.filter((item) => !item.is_read).length,
});
