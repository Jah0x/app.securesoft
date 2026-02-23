import type { NativeVpnBridge, NativeVpnConnectConfig } from "./vpnBridge.js";

export interface VpnTokenProvider {
  getFreshConfig(): Promise<NativeVpnConnectConfig>;
}

export interface MobileVpnProviderOptions {
  refreshBeforeExpiryMs?: number;
  tokenTtlMs?: number;
  reconnectDelayMs?: number;
}

abstract class BaseMobileVpnProvider implements NativeVpnBridge {
  protected connected = false;
  protected currentConfig: NativeVpnConnectConfig | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    protected readonly tokenProvider: VpnTokenProvider,
    protected readonly options: MobileVpnProviderOptions = {},
  ) {}

  async connect(config: NativeVpnConnectConfig): Promise<void> {
    this.connected = true;
    this.currentConfig = config;
    this.scheduleRefresh();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.currentConfig = null;
    this.stopTimers();
  }

  async handleTransportDrop(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.connected = false;
    this.stopTimers();

    const reconnectDelayMs = this.options.reconnectDelayMs ?? 1_000;
    this.reconnectTimer = setTimeout(() => {
      void this.reconnectWithFreshToken();
    }, reconnectDelayMs);
  }

  private scheduleRefresh(): void {
    this.stopRefreshTimer();

    const tokenTtlMs = this.options.tokenTtlMs ?? 15 * 60 * 1_000;
    const refreshBeforeExpiryMs = this.options.refreshBeforeExpiryMs ?? 2 * 60 * 1_000;
    const refreshInMs = Math.max(1_000, tokenTtlMs - refreshBeforeExpiryMs);

    this.refreshTimer = setTimeout(() => {
      void this.reconnectWithFreshToken();
    }, refreshInMs);
  }

  private async reconnectWithFreshToken(): Promise<void> {
    const freshConfig = await this.tokenProvider.getFreshConfig();
    await this.connect(freshConfig);
  }

  private stopRefreshTimer(): void {
    if (!this.refreshTimer) {
      return;
    }

    clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  private stopTimers(): void {
    this.stopRefreshTimer();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export class IosPacketTunnelProvider extends BaseMobileVpnProvider {
  readonly platform = "ios";

  async connect(config: NativeVpnConnectConfig): Promise<void> {
    if (!config.tls?.sni) {
      throw new Error("iOS NEPacketTunnelProvider requires TLS SNI");
    }

    await super.connect(config);
  }
}

export class AndroidVpnServiceProvider extends BaseMobileVpnProvider {
  readonly platform = "android";

  async connect(config: NativeVpnConnectConfig): Promise<void> {
    if (!config.transport?.http2 && config.protocol !== "quic") {
      throw new Error("Android VpnService requires HTTP2 or QUIC transport");
    }

    await super.connect(config);
  }
}
