export type Platform = "ios" | "android";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface DeviceRegistrationResponse {
  device_user: string;
}


export interface RegisterRequest {
  email: string;
  password: string;
}

export interface PasswordRecoveryRequest {
  email: string;
}

export interface PasswordResetRequest {
  reset_token: string;
  new_password: string;
}

export interface AccountInfo {
  account_id: string;
  email: string;
  subscription_tier: string;
  is_active: boolean;
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

export interface VpnPublicKeyResponse {
  public_key: string;
  algorithm?: string;
  key_id?: string;
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

export type PushProvider = "apns" | "fcm";

export interface PushTokenRegistration {
  device_id: string;
  account_id: string;
  provider: PushProvider;
  token: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  deep_link?: string;
  created_at: string;
  is_read: boolean;
}

export interface AppVersionInfo {
  latest_version: string;
  minimum_supported_version: string;
  forced_update: boolean;
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
