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

export type ConnectionUiState = "Idle" | "Authenticating" | "Connected" | "Reconnecting" | "Error";

export interface UpdateModalViewState {
  shouldShow: boolean;
  mode: "force" | "soft";
}

export const mapVpnStateToUiState = (state: VpnState): ConnectionUiState => {
  if (state === "preparing" || state === "connecting") {
    return "Authenticating";
  }

  if (state === "connected") {
    return "Connected";
  }

  if (state === "reconnecting") {
    return "Reconnecting";
  }

  if (state.startsWith("error_")) {
    return "Error";
  }

  return "Idle";
};

export const buildUpdateModalViewState = (forced: boolean, hasUpdate: boolean): UpdateModalViewState => {
  if (!forced && !hasUpdate) {
    return { shouldShow: false, mode: "soft" };
  }

  return {
    shouldShow: true,
    mode: forced ? "force" : "soft",
  };
};

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
