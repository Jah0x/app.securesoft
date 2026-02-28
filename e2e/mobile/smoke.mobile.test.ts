import { describe, expect, it } from "vitest";

import { ProviderBackedBridgeAdapter, SimulatedDeviceFarmController } from "./adapters.js";
import { createAppiumController, createDetoxController } from "./deviceFarmControllers.js";
import {
  scenarioConnectDisconnect,
  scenarioNetworkDropReconnect,
  scenarioTtlRefresh,
} from "./scenarios.js";
import type { DeviceFarmController, SmokeCriteria } from "./types.js";

const criteria: SmokeCriteria = {
  maxReconnectMs: Number(process.env.SMOKE_MAX_RECONNECT_MS ?? 3_500),
  maxRefreshMs: Number(process.env.SMOKE_MAX_REFRESH_MS ?? 2_500),
  maxRetries: Number(process.env.SMOKE_MAX_RETRIES ?? 2),
  requireZeroManualActions: true,
};

const resolveController = (): DeviceFarmController => {
  const driver = process.env.MOBILE_SMOKE_DRIVER ?? "simulated";

  if (driver === "appium") {
    return createAppiumController();
  }

  if (driver === "detox") {
    return createDetoxController();
  }

  return new SimulatedDeviceFarmController();
};

describe("mobile e2e smoke runner", () => {
  it("runs connect/disconnect scenario", async () => {
    const result = await scenarioConnectDisconnect({
      bridge: new ProviderBackedBridgeAdapter({ tokenTtlMs: 9_000 }),
      controller: resolveController(),
      criteria,
    });

    expect(result.passed, result.details).toBe(true);
  });

  it("runs ttl/token refresh scenario", async () => {
    const result = await scenarioTtlRefresh({
      bridge: new ProviderBackedBridgeAdapter({
        tokenTtlMs: 2_000,
        refreshBeforeExpiryMs: 1_000,
      }),
      controller: resolveController(),
      criteria,
    });

    expect(result.passed, result.details).toBe(true);
  });

  it("runs network drop + reconnect scenario", async () => {
    const result = await scenarioNetworkDropReconnect({
      bridge: new ProviderBackedBridgeAdapter({ reconnectDelayMs: 1_000, tokenTtlMs: 15_000 }),
      controller: resolveController(),
      criteria,
    });

    expect(result.passed, result.details).toBe(true);
  });
});
