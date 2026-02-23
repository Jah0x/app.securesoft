import { HttpClient } from "../api/httpClient.js";
import { AuthModule } from "./authModule.js";
import { DeviceModule } from "./deviceModule.js";
import type { MetricsBatch, MetricsEvent } from "../types/contracts.js";

export interface NativeVpnMetricsSnapshot {
  connect_ms?: number;
  rtt_ms?: number;
  throughput_up_kbps?: number;
  throughput_down_kbps?: number;
  error_code?: string;
  [key: string]: unknown;
}

export interface ResourceMetricsSnapshot {
  cpu_percent: number;
  memory_mb: number;
  battery_percent?: number;
  energy_mah?: number;
  [key: string]: unknown;
}

export interface NativeVpnMetricsProvider {
  collect(): Promise<NativeVpnMetricsSnapshot>;
}

export interface ResourceMetricsProvider {
  collect(): Promise<ResourceMetricsSnapshot>;
}

export interface MetricsIntervalScheduler {
  schedule(handler: () => Promise<void>, intervalMs: number): void;
  stop(): void;
}

export class IntervalMetricsScheduler implements MetricsIntervalScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

  schedule(handler: () => Promise<void>, intervalMs: number): void {
    this.stop();
    this.timer = setInterval(() => {
      void handler();
    }, Math.max(1, intervalMs));
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export class MetricsModule {
  private readonly queue: MetricsEvent[] = [];
  private readonly eventIds = new Set<string>();
  private periodicFlushSessionId: string | null = null;
  private metricsCollectionSessionId: string | null = null;

  constructor(
    private readonly api: HttpClient,
    private readonly auth: AuthModule,
    private readonly devices: DeviceModule,
    private readonly scheduler: MetricsIntervalScheduler = new IntervalMetricsScheduler(),
    private readonly collectionScheduler: MetricsIntervalScheduler = new IntervalMetricsScheduler(),
  ) {}

  enqueue(event: MetricsEvent): void {
    if (this.eventIds.has(event.event_id)) {
      return;
    }

    this.eventIds.add(event.event_id);
    this.queue.push(event);
  }

  enqueueBatch(events: MetricsEvent[]): void {
    for (const event of events) {
      this.enqueue(event);
    }
  }

  queuedCount(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue.length = 0;
    this.eventIds.clear();
  }

  startPeriodicFlush(sessionId: string, intervalMs = 120_000): void {
    this.periodicFlushSessionId = sessionId;

    this.scheduler.schedule(async () => {
      if (!this.periodicFlushSessionId || this.queue.length === 0) {
        return;
      }

      await this.flush(this.periodicFlushSessionId);
    }, intervalMs);
  }

  stopPeriodicFlush(): void {
    this.periodicFlushSessionId = null;
    this.scheduler.stop();
  }

  startPeriodicCollection(
    sessionId: string,
    providers: {
      vpn?: NativeVpnMetricsProvider;
      resources?: ResourceMetricsProvider;
    },
    intervalMs = 30_000,
  ): void {
    this.metricsCollectionSessionId = sessionId;

    this.collectionScheduler.schedule(async () => {
      if (!this.metricsCollectionSessionId || this.metricsCollectionSessionId !== sessionId) {
        return;
      }

      if (providers.vpn) {
        const snapshot = await providers.vpn.collect();
        this.enqueue({
          event_id: crypto.randomUUID(),
          type: "vpn_native_red_metrics",
          ts: new Date().toISOString(),
          payload: snapshot,
        });
      }

      if (providers.resources) {
        const snapshot = await providers.resources.collect();
        this.enqueue({
          event_id: crypto.randomUUID(),
          type: "resource_metrics",
          ts: new Date().toISOString(),
          payload: snapshot,
        });
      }

      if (this.queue.length > 0) {
        await this.flush(sessionId);
      }
    }, intervalMs);
  }

  stopPeriodicCollection(): void {
    this.metricsCollectionSessionId = null;
    this.collectionScheduler.stop();
  }

  async flush(sessionId: string, maxRetries = 3, batchSize = 50): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const deviceId = await this.devices.getOrCreateDeviceId();

    for (let offset = 0; offset < this.queue.length; offset += batchSize) {
      const chunk = this.queue.slice(offset, offset + batchSize);
      const batch: MetricsBatch = {
        device_id: deviceId,
        session_id: sessionId,
        events: chunk,
      };

      await this.sendWithRetry(batch, maxRetries);
    }

    this.clearQueue();
  }

  private async sendWithRetry(batch: MetricsBatch, maxRetries: number): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        await this.auth.runWithAccessToken((accessToken) => this.api.postMetrics(accessToken, batch));
        return;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        await wait(2 ** attempt * 100);
      }
    }
  }
}

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
