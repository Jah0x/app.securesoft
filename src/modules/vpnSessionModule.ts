import { HttpClient, HttpError } from "../api/httpClient.js";
import { AuthModule } from "./authModule.js";
import { DeviceModule } from "./deviceModule.js";
import { createUuid } from "../utils/uuid.js";
import type { Platform, VpnState, VpnTokenResponse } from "../types/contracts.js";

export interface VpnConnector {
  connect(config: {
    address: string;
    hostname: string;
    protocol: string;
    username: string;
    password: string;
    dns: string;
    tls?: {
      alpn?: string[];
    };
  }): Promise<void>;
  disconnect(): Promise<void>;
}

export interface NetworkStatusProvider {
  isOnline(): Promise<boolean>;
}

export interface VpnStatusSnapshot {
  state: VpnState;
  endpointHostname: string | null;
  endpointAddress: string | null;
  jwtExpiresInSeconds: number | null;
  sessionId: string | null;
}

export interface RefreshScheduler {
  schedule(handler: () => Promise<void>, delayMs: number): void;
  stop(): void;
}

export class TimeoutRefreshScheduler implements RefreshScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;

  schedule(handler: () => Promise<void>, delayMs: number): void {
    this.stop();
    this.timer = setTimeout(() => {
      void handler();
    }, Math.max(0, delayMs));
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export class VpnSessionModule {
  private state: VpnState = "idle";
  private currentToken: VpnTokenResponse | null = null;
  private currentSessionId: string | null = null;

  constructor(
    private readonly api: HttpClient,
    private readonly auth: AuthModule,
    private readonly devices: DeviceModule,
    private readonly connector: VpnConnector,
    private readonly platform: Platform,
    private readonly appVersion: string,
    private readonly networkStatus?: NetworkStatusProvider,
    private readonly scheduler: RefreshScheduler = new TimeoutRefreshScheduler(),
  ) {}

  getState(): VpnState {
    return this.state;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  getStatusSnapshot(now = new Date()): VpnStatusSnapshot {
    if (!this.currentToken) {
      return {
        state: this.state,
        endpointHostname: null,
        endpointAddress: null,
        jwtExpiresInSeconds: null,
        sessionId: this.currentSessionId,
      };
    }

    const expiresAt = new Date(this.currentToken.expires_at).getTime();
    return {
      state: this.state,
      endpointHostname: this.currentToken.endpoint.hostname,
      endpointAddress: this.currentToken.endpoint.address,
      jwtExpiresInSeconds: Math.max(0, Math.floor((expiresAt - now.getTime()) / 1000)),
      sessionId: this.currentSessionId,
    };
  }

  async connect(): Promise<void> {
    this.state = "preparing";

    try {
      if (this.networkStatus && !(await this.networkStatus.isOnline())) {
        throw new Error("OFFLINE");
      }

      const token = await this.fetchVpnToken();
      await this.applyTokenAndConnect(token);
      this.currentSessionId = createUuid();
      this.state = "connected";
      this.scheduleJwtRefresh();
    } catch (error) {
      this.state = this.classifyError(error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.scheduler.stop();
    await this.connector.disconnect();
    this.state = "disconnected";
    this.currentToken = null;
    this.currentSessionId = null;
  }

  shouldRefreshJwt(now = new Date(), refreshBeforeSeconds = 120): boolean {
    if (!this.currentToken) {
      return false;
    }

    const expiry = new Date(this.currentToken.expires_at).getTime();
    const deltaSeconds = (expiry - now.getTime()) / 1000;
    return deltaSeconds <= refreshBeforeSeconds;
  }

  async refreshJwtIfNeeded(now = new Date()): Promise<boolean> {
    if (this.state !== "connected" || !this.shouldRefreshJwt(now)) {
      return false;
    }

    const token = await this.fetchVpnToken();
    await this.applyTokenAndConnect(token);
    this.scheduleJwtRefresh();
    return true;
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

  private scheduleJwtRefresh(): void {
    if (!this.currentToken || this.state !== "connected") {
      return;
    }

    const expiryMs = new Date(this.currentToken.expires_at).getTime();
    const refreshMs = expiryMs - 90_000;
    const delayMs = refreshMs - Date.now();

    this.scheduler.schedule(async () => {
      try {
        await this.refreshJwtIfNeeded();
      } catch {
        await this.reconnectWithBackoff();
      }
    }, delayMs);
  }

  private async fetchVpnToken(): Promise<VpnTokenResponse> {
    const deviceId = await this.devices.getOrCreateDeviceId();

    this.state = "connecting";
    return this.auth.runWithAccessToken((accessToken) =>
      this.api.requestVpnToken(accessToken, {
        device_id: deviceId,
        platform: this.platform,
        app_version: this.appVersion,
      }),
    );
  }

  private async applyTokenAndConnect(token: VpnTokenResponse): Promise<void> {
    this.currentToken = token;

    await this.connector.connect({
      address: token.endpoint.address,
      hostname: token.endpoint.hostname,
      protocol: token.endpoint.protocol,
      dns: token.endpoint.dns,
      username: token.vpn_username,
      password: token.vpn_jwt,
      tls: token.tls,
    });
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
