import { describe, expect, it } from "vitest";
import { BillingModule, ExperienceModule, I18nModule, SplitTunnelModule } from "../src/index.js";

describe("P2 modules", () => {
  it("переключает локализацию и возвращает перевод", () => {
    const i18n = new I18nModule("en");

    expect(i18n.t("vpn.connect")).toBe("Connect");

    i18n.setLocale("ru");
    expect(i18n.t("vpn.connect")).toBe("Подключить");
  });

  it("поддерживает тёмную тему и accessibility-настройки", () => {
    const experience = new ExperienceModule();

    experience.setThemeMode("dark");
    const accessibility = experience.updateAccessibilitySettings({
      voiceOverEnabled: true,
      highContrastEnabled: true,
      dynamicTypeScale: 3,
    });

    expect(experience.getThemeMode()).toBe("dark");
    expect(accessibility.voiceOverEnabled).toBe(true);
    expect(accessibility.highContrastEnabled).toBe(true);
    expect(accessibility.dynamicTypeScale).toBe(2);
  });

  it("обрабатывает trial/renewal/cancel в биллинге", () => {
    const billing = new BillingModule();

    billing.startTrial("2030-01-01T00:00:00.000Z", "play_store");
    billing.activateSubscription("2030-02-01T00:00:00.000Z", "play_store");
    billing.cancelAutoRenew();

    expect(billing.getSnapshot().state).toBe("canceled");

    billing.expireSubscription();
    expect(billing.getSnapshot().state).toBe("expired");
  });

  it("применяет split-tunneling include/exclude правила", () => {
    const split = new SplitTunnelModule();

    split.configure("include", ["com.securesoft.browser"]);
    expect(split.shouldRouteThroughVpn("com.securesoft.browser")).toBe(true);
    expect(split.shouldRouteThroughVpn("com.messaging.app")).toBe(false);

    split.configure("exclude", ["com.streaming.app"]);
    expect(split.shouldRouteThroughVpn("com.streaming.app")).toBe(false);
    expect(split.shouldRouteThroughVpn("com.securesoft.browser")).toBe(true);
  });
});
