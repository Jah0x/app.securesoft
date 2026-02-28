import { performance } from "node:perf_hooks";

import {
  AndroidVpnServiceProvider,
  type MobileVpnProviderOptions,
  type VpnTokenProvider,
} from "../../src/native/mobileVpnProviders.js";
import {
  type NativeVpnConnectConfig,
  TestNativeVpnBridge,
} from "../../src/native/vpnBridge.js";
import type { BridgeAdapter, DeviceFarmController } from "./types.js";

const baseConfig = (): NativeVpnConnectConfig => ({
  endpointAddress: "10.10.0.10",
  endpointHostname: "vpn.securesoft.example",
  protocol: "quic",
  dns: "1.1.1.1",
  transport: { http2: true },
  tls: { sni: "vpn.securesoft.example", alpn: ["h3", "h2"] },
  auth: {
    username: "smoke-user",
    jwt: `jwt-${Date.now()}`,
  },
});

class SequentialTokenProvider implements VpnTokenProvider {
  private index = 0;

  get refreshCount(): number {
    return this.index;
  }

  async getFreshConfig(): Promise<NativeVpnConnectConfig> {
    this.index += 1;
    return {
      ...baseConfig(),
      auth: {
        username: "smoke-user",
        jwt: `jwt-refresh-${this.index}`,
      },
    };
  }
}

export class ProviderBackedBridgeAdapter implements BridgeAdapter {
  private readonly provider: AndroidVpnServiceProvider;
  private readonly fallbackBridge = new TestNativeVpnBridge();
  private readonly tokenProvider = new SequentialTokenProvider();

  constructor(options: MobileVpnProviderOptions = {}) {
    this.provider = new AndroidVpnServiceProvider(this.tokenProvider, options);
  }

  async connect(config: NativeVpnConnectConfig): Promise<void> {
    await this.fallbackBridge.connect(config);
    await this.provider.connect(config);
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect();
    await this.fallbackBridge.disconnect();
  }

  async emulateTransportDrop(): Promise<number> {
    const startedAt = performance.now();
    await this.provider.handleTransportDrop();
    return performance.now() - startedAt;
  }

  getConnectCalls(): number {
    return this.fallbackBridge.connectCalls;
  }

  getRefreshCount(): number {
    return this.tokenProvider.refreshCount;
  }
}

export class SimulatedDeviceFarmController implements DeviceFarmController {
  private retries = 0;

  async ensureSessionActive(): Promise<void> {
    return;
  }

  async dropNetworkBriefly(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  async restoreNetwork(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  markRetry(): void {
    this.retries += 1;
  }

  getRetries(): number {
    return this.retries;
  }
}

export const createBaseConfig = baseConfig;
