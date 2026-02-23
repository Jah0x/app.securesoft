import { HttpClient } from "../api/httpClient.js";
import { AuthModule } from "./authModule.js";
import { DeviceModule } from "./deviceModule.js";
import type { Platform, VpnState, VpnTokenResponse } from "../types/contracts.js";

export interface VpnConnector {
  connect(config: {
    address: string;
    hostname: string;
    protocol: string;
    username: string;
    password: string;
    dns: string;
  }): Promise<void>;
  disconnect(): Promise<void>;
}

export class VpnSessionModule {
  private state: VpnState = "idle";
  private currentToken: VpnTokenResponse | null = null;

  constructor(
    private readonly api: HttpClient,
    private readonly auth: AuthModule,
    private readonly devices: DeviceModule,
    private readonly connector: VpnConnector,
    private readonly platform: Platform,
    private readonly appVersion: string,
  ) {}

  getState(): VpnState {
    return this.state;
  }

  async connect(): Promise<void> {
    this.state = "preparing";

    try {
      const accessToken = await this.auth.getActiveAccessToken();
      const deviceId = await this.devices.getOrCreateDeviceId();

      this.state = "connecting";
      const token = await this.api.requestVpnToken(accessToken, {
        device_id: deviceId,
        platform: this.platform,
        app_version: this.appVersion,
      });
      this.currentToken = token;

      await this.connector.connect({
        address: token.endpoint.address,
        hostname: token.endpoint.hostname,
        protocol: token.endpoint.protocol,
        dns: token.endpoint.dns,
        username: token.vpn_username,
        password: token.vpn_jwt,
      });

      this.state = "connected";
    } catch (error) {
      this.state = this.classifyError(error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.connector.disconnect();
    this.state = "disconnected";
    this.currentToken = null;
  }

  shouldRefreshJwt(now = new Date()): boolean {
    if (!this.currentToken) {
      return false;
    }

    const expiry = new Date(this.currentToken.expires_at).getTime();
    const deltaSeconds = (expiry - now.getTime()) / 1000;
    return deltaSeconds <= 120;
  }

  async reconnect(): Promise<void> {
    this.state = "reconnecting";
    await this.disconnect();
    await this.connect();
  }

  private classifyError(error: unknown): VpnState {
    if (!(error instanceof Error)) {
      return "error_network";
    }

    if (error.message.includes("HTTP 401")) {
      return "error_auth";
    }

    if (error.message.includes("HTTP 402") || error.message.includes("HTTP 403")) {
      return "error_subscription";
    }

    return "error_network";
  }
}
