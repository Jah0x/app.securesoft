import { HttpClient, HttpError } from "../api/httpClient.js";
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

export interface NetworkStatusProvider {
  isOnline(): Promise<boolean>;
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
    private readonly networkStatus?: NetworkStatusProvider,
  ) {}

  getState(): VpnState {
    return this.state;
  }

  async connect(): Promise<void> {
    this.state = "preparing";

    try {
      if (this.networkStatus && !(await this.networkStatus.isOnline())) {
        throw new Error("OFFLINE");
      }

      const deviceId = await this.devices.getOrCreateDeviceId();

      this.state = "connecting";
      const token = await this.auth.runWithAccessToken((accessToken) =>
        this.api.requestVpnToken(accessToken, {
          device_id: deviceId,
          platform: this.platform,
          app_version: this.appVersion,
        }),
      );
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

  async reconnectWithBackoff(maxAttempts = 3, baseDelayMs = 250): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await this.reconnect();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          break;
        }

        await wait(baseDelayMs * 2 ** attempt);
      }
    }

    throw lastError;
  }

  private classifyError(error: unknown): VpnState {
    if (error instanceof HttpError && error.status === 401) {
      return "error_auth";
    }

    if (error instanceof HttpError && (error.status === 402 || error.status === 403)) {
      return "error_subscription";
    }

    return "error_network";
  }
}

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
