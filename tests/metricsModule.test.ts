import { describe, expect, it } from "vitest";
import { AuthModule, DeviceModule, InMemorySecureStore, MetricsModule } from "../src/index.js";

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
});
