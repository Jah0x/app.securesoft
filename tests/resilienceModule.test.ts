import { describe, expect, it } from "vitest";
import {
  ErrorUxModule,
  InMemorySecureStore,
  LocalizationModule,
  OfflineActionQueue,
} from "../src/index.js";

describe("Resilience modules", () => {
  it("кеширует офлайн-действия и синхронизирует их", async () => {
    const store = new InMemorySecureStore();
    const queue = new OfflineActionQueue(store);

    await queue.enqueue({
      id: "a1",
      type: "connect_click",
      payload: { source: "main" },
      createdAt: new Date().toISOString(),
    });

    const flushed: string[] = [];
    await queue.flush(async (action) => {
      flushed.push(action.id);
    });

    expect(flushed).toEqual(["a1"]);
    await expect(queue.list()).resolves.toEqual([]);
  });

  it("возвращает локализованные модели ошибок", () => {
    const i18n = new LocalizationModule({
      en: {
        "error.network.title": "Network issue",
        "error.network.recommendation": "Check your internet and try again.",
      },
    });

    i18n.setLanguage("en");
    const module = new ErrorUxModule(i18n);
    const model = module.getScreenForVpnState("error_network");

    expect(model.title).toBe("Network issue");
    expect(model.recommendation).toContain("internet");
  });
});
