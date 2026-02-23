import { HttpClient } from "../api/httpClient.js";
import { AuthModule } from "./authModule.js";
import { DeviceModule } from "./deviceModule.js";
import type { MetricsBatch, MetricsEvent } from "../types/contracts.js";

export class MetricsModule {
  private readonly queue: MetricsEvent[] = [];
  private readonly eventIds = new Set<string>();

  constructor(
    private readonly api: HttpClient,
    private readonly auth: AuthModule,
    private readonly devices: DeviceModule,
  ) {}

  enqueue(event: MetricsEvent): void {
    if (this.eventIds.has(event.event_id)) {
      return;
    }

    this.eventIds.add(event.event_id);
    this.queue.push(event);
  }

  queuedCount(): number {
    return this.queue.length;
  }

  async flush(sessionId: string, maxRetries = 3): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const accessToken = await this.auth.getActiveAccessToken();
    const deviceId = await this.devices.getOrCreateDeviceId();

    const batch: MetricsBatch = {
      device_id: deviceId,
      session_id: sessionId,
      events: [...this.queue],
    };

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        await this.api.postMetrics(accessToken, batch);
        this.queue.length = 0;
        this.eventIds.clear();
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
