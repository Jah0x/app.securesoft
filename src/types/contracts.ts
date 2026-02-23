export type Platform = "ios" | "android";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface VpnTokenRequest {
  device_id: string;
  platform: Platform;
  app_version: string;
}

export interface VpnTokenResponse {
  endpoint: {
    address: string;
    hostname: string;
    protocol: string;
    dns: string;
  };
  vpn_username: string;
  vpn_jwt: string;
  expires_at: string;
  tls?: {
    alpn?: string[];
  };
}

export interface MetricsEvent {
  event_id: string;
  type: string;
  ts: string;
  payload: Record<string, unknown>;
}

export interface MetricsBatch {
  device_id: string;
  session_id: string;
  events: MetricsEvent[];
}

export interface MetricsResponse {
  accepted: number;
  rejected: number;
}

export type VpnState =
  | "idle"
  | "preparing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error_auth"
  | "error_subscription"
  | "error_network";
