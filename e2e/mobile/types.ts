import type { NativeVpnBridge } from "../../src/native/vpnBridge.js";

export interface SmokeCriteria {
  maxReconnectMs: number;
  maxRefreshMs: number;
  maxRetries: number;
  requireZeroManualActions: boolean;
}

export interface ScenarioMetrics {
  reconnectMs?: number;
  refreshMs?: number;
  retries: number;
  manualActions: number;
}

export interface ScenarioResult {
  scenario: string;
  passed: boolean;
  metrics: ScenarioMetrics;
  details: string;
}

export interface DeviceFarmController {
  ensureSessionActive(): Promise<void>;
  dropNetworkBriefly(): Promise<void>;
  restoreNetwork(): Promise<void>;
  markRetry(): void;
  getRetries(): number;
}

export interface BridgeAdapter extends NativeVpnBridge {
  getConnectCalls(): number;
  getRefreshCount(): number;
}

export interface SmokeContext {
  bridge: BridgeAdapter;
  controller: DeviceFarmController;
  criteria: SmokeCriteria;
}
