import { describe, expect, it } from "vitest";
import { resolveDeepLinkRoute } from "../src/index.js";

describe("resolveDeepLinkRoute", () => {
  it("маппит известные deep-link на AppRoute", () => {
    expect(resolveDeepLinkRoute("app://inbox")).toBe("Notifications");
    expect(resolveDeepLinkRoute("app://status")).toBe("Status");
    expect(resolveDeepLinkRoute("app://accounts")).toBe("Accounts");
  });

  it("нормализует query/fragment/регистр и отклоняет неизвестные ссылки", () => {
    expect(resolveDeepLinkRoute("APP://NOTIFICATIONS?utm=push#open")).toBe("Notifications");
    expect(resolveDeepLinkRoute("app://unknown")).toBeNull();
    expect(resolveDeepLinkRoute(undefined)).toBeNull();
  });
});
