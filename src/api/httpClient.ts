import type {
  LoginResponse,
  MetricsBatch,
  MetricsResponse,
  VpnTokenRequest,
  VpnTokenResponse,
} from "../types/contracts.js";

export interface HttpClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
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

  async requestVpnToken(accessToken: string, payload: VpnTokenRequest): Promise<VpnTokenResponse> {
    return this.post<VpnTokenResponse>("/vpn/token", payload, accessToken);
  }

  async postMetrics(accessToken: string, batch: MetricsBatch): Promise<MetricsResponse> {
    return this.post<MetricsResponse>("/api/v1/metrics/client", batch, accessToken);
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
      throw new Error(`HTTP ${response.status} for ${path}`);
    }

    return (await response.json()) as T;
  }
}
