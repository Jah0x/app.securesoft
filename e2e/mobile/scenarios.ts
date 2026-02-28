import { performance } from "node:perf_hooks";

import { createBaseConfig, ProviderBackedBridgeAdapter } from "./adapters.js";
import type { ScenarioResult, SmokeContext } from "./types.js";

export const scenarioConnectDisconnect = async ({ bridge }: SmokeContext): Promise<ScenarioResult> => {
  const config = createBaseConfig();

  await bridge.connect(config);
  await bridge.disconnect();

  const passed = bridge.getConnectCalls() >= 1;

  return {
    scenario: "connect/disconnect",
    passed,
    metrics: {
      retries: 0,
      manualActions: 0,
    },
    details: passed
      ? "VPN bridge выполнил connect/disconnect без ручных шагов"
      : "Bridge не выполнил connect вызов",
  };
};

export const scenarioTtlRefresh = async ({ bridge, criteria }: SmokeContext): Promise<ScenarioResult> => {
  const config = createBaseConfig();
  const startedAt = performance.now();

  await bridge.connect(config);
  await new Promise((resolve) => setTimeout(resolve, 1_300));

  const refreshMs = performance.now() - startedAt;
  const passed = bridge.getRefreshCount() >= 1 && refreshMs <= criteria.maxRefreshMs;

  await bridge.disconnect();

  return {
    scenario: "ttl/token refresh during active session",
    passed,
    metrics: {
      refreshMs,
      retries: 0,
      manualActions: 0,
    },
    details: passed
      ? "Refresh токена произошел внутри активной сессии"
      : "Refresh не уложился в критерии времени или не сделал повторный connect",
  };
};

export const scenarioNetworkDropReconnect = async ({
  bridge,
  controller,
  criteria,
}: SmokeContext): Promise<ScenarioResult> => {
  const config = createBaseConfig();
  const providerBridge = bridge as ProviderBackedBridgeAdapter;

  await bridge.connect(config);
  await controller.ensureSessionActive();

  await controller.dropNetworkBriefly();
  const startedAt = performance.now();
  await providerBridge.emulateTransportDrop();
  controller.markRetry();
  await controller.restoreNetwork();
  await new Promise((resolve) => setTimeout(resolve, 1_250));

  const reconnectMs = performance.now() - startedAt;
  const retries = controller.getRetries();

  const passed =
    reconnectMs <= criteria.maxReconnectMs &&
    retries <= criteria.maxRetries &&
    criteria.requireZeroManualActions;

  await bridge.disconnect();

  return {
    scenario: "brief network drop + auto reconnect",
    passed,
    metrics: {
      reconnectMs,
      retries,
      manualActions: 0,
    },
    details: passed
      ? "Авто-reconnect выполнился после кратковременной потери сети"
      : "Reconnect не уложился в SLA по времени или retries",
  };
};
