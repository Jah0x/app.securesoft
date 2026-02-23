import { describe, expect, it } from "vitest";
import {
  AuthModule,
  DeviceModule,
  InMemorySecureStore,
  MetricsModule,
  type MetricsIntervalScheduler,
} from "../src/index.js";

class FakeHttpClient {
  metricsCalls = 0;

  async login() {
    return { accessToken: "access", refreshToken: "refresh" };
  }

  async refresh() {
    return { accessToken: "access2", refreshToken: "refresh2" };
  }

  async requestVpnToken() {
    throw new Error("not used");
  }

  async postMetrics() {
    this.metricsCalls += 1;
    return { accepted: 1, rejected: 0 };
  }
}

class FakeIntervalScheduler implements MetricsIntervalScheduler {
  handler: (() => Promise<void>) | null = null;
  intervalMs = 0;
  stopped = false;

  schedule(handler: () => Promise<void>, intervalMs: number): void {
    this.handler = handler;
    this.intervalMs = intervalMs;
    this.stopped = false;
  }

  stop(): void {
    this.stopped = true;
    this.handler = null;
  }

  async tick(): Promise<void> {
    if (!this.handler) {
      return;
    }

    await this.handler();
  }
}

describe("MetricsModule", () => {
  it("дедуплицирует события и очищает очередь после flush", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const metrics = new MetricsModule(api as never, auth, new DeviceModule(store));

    metrics.enqueue({
      event_id: "e1",
      type: "vpn_connect",
      ts: new Date().toISOString(),
      payload: { connect_ms: 1000 },
    });

    metrics.enqueue({
      event_id: "e1",
      type: "vpn_connect",
      ts: new Date().toISOString(),
      payload: { connect_ms: 1000 },
    });

    expect(metrics.queuedCount()).toBe(1);

    await metrics.flush("s1");

    expect(metrics.queuedCount()).toBe(0);
    expect(api.metricsCalls).toBe(1);
  });

  it("режет большую очередь на батчи", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const metrics = new MetricsModule(api as never, auth, new DeviceModule(store));

    metrics.enqueueBatch(
      Array.from({ length: 120 }, (_, index) => ({
        event_id: `e-${index}`,
        type: "vpn_connect",
        ts: new Date().toISOString(),
        payload: { connect_ms: 1000 + index },
      })),
    );

    await metrics.flush("s1", 3, 50);

    expect(api.metricsCalls).toBe(3);
  });

  it("поддерживает периодическую отправку метрик", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");

    const scheduler = new FakeIntervalScheduler();
    const metrics = new MetricsModule(api as never, auth, new DeviceModule(store), scheduler);

    metrics.enqueue({
      event_id: "e1",
      type: "vpn_connect",
      ts: new Date().toISOString(),
      payload: { connect_ms: 1000 },
    });

    metrics.startPeriodicFlush("session-1", 5000);

    expect(scheduler.intervalMs).toBe(5000);

    await scheduler.tick();

    expect(api.metricsCalls).toBe(1);
    expect(metrics.queuedCount()).toBe(0);

    metrics.stopPeriodicFlush();
    expect(scheduler.stopped).toBe(true);
  });
});
