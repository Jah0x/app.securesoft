import type {
  AppVersionInfo,
  DeviceRegistrationResponse,
  LoginResponse,
  MetricsBatch,
  MetricsResponse,
  PushNotification,
  PushTokenRegistration,
  VpnTokenRequest,
  VpnTokenResponse,
} from "../types/contracts.js";

export interface HttpClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`HTTP ${status} for ${path}`);
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.post<LoginResponse>("/auth/login", { email, password });
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    return this.post<LoginResponse>("/auth/refresh", { refresh_token: refreshToken });
  }

  async oauthLogin(provider: string, code: string): Promise<LoginResponse> {
    return this.post<LoginResponse>("/auth/oauth", { provider, code });
  }

  async registerDevice(accessToken: string, deviceId: string): Promise<DeviceRegistrationResponse> {
    return this.post<DeviceRegistrationResponse>("/devices/register", { device_id: deviceId }, accessToken);
  }

  async requestVpnToken(accessToken: string, payload: VpnTokenRequest): Promise<VpnTokenResponse> {
    return this.post<VpnTokenResponse>("/vpn/token", payload, accessToken);
  }

  async postMetrics(accessToken: string, batch: MetricsBatch): Promise<MetricsResponse> {
    return this.post<MetricsResponse>("/api/v1/metrics/client", batch, accessToken);
  }

  async registerPushToken(accessToken: string, payload: PushTokenRegistration): Promise<void> {
    await this.post<unknown>("/push/register", payload, accessToken);
  }

  async listNotifications(accessToken: string): Promise<PushNotification[]> {
    return this.get<PushNotification[]>("/push/inbox", accessToken);
  }

  async markNotificationRead(accessToken: string, notificationId: string): Promise<void> {
    await this.post<unknown>(`/push/inbox/${notificationId}/read`, {}, accessToken);
  }

  async getAppVersion(platform: string, appVersion: string): Promise<AppVersionInfo> {
    return this.get<AppVersionInfo>(`/app/version?platform=${platform}&app_version=${appVersion}`);
  }

  private async post<T>(path: string, payload: unknown, accessToken?: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new HttpError(response.status, path);
    }

    return (await response.json()) as T;
  }

  private async get<T>(path: string, accessToken?: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (!response.ok) {
      throw new HttpError(response.status, path);
    }

    return (await response.json()) as T;
  }
}
