export type ThemeMode = "light" | "dark" | "system";

export interface AccessibilitySettings {
  voiceOverEnabled: boolean;
  talkBackEnabled: boolean;
  highContrastEnabled: boolean;
  dynamicTypeScale: number;
}

export type QuickAction = "connect_vpn" | "disconnect_vpn";

export class ExperienceModule {
  private themeMode: ThemeMode = "system";
  private accessibility: AccessibilitySettings = {
    voiceOverEnabled: false,
    talkBackEnabled: false,
    highContrastEnabled: false,
    dynamicTypeScale: 1,
  };

  setThemeMode(mode: ThemeMode): void {
    this.themeMode = mode;
  }

  getThemeMode(): ThemeMode {
    return this.themeMode;
  }

  updateAccessibilitySettings(next: Partial<AccessibilitySettings>): AccessibilitySettings {
    this.accessibility = {
      ...this.accessibility,
      ...next,
      dynamicTypeScale: Math.min(2, Math.max(0.8, next.dynamicTypeScale ?? this.accessibility.dynamicTypeScale)),
    };

    return this.accessibility;
  }

  getAccessibilitySettings(): AccessibilitySettings {
    return this.accessibility;
  }

  resolveQuickAction(action: QuickAction): { intent: string; preferredRoute: string } {
    if (action === "connect_vpn") {
      return { intent: "vpn_connect", preferredRoute: "MainVpn" };
    }

    return { intent: "vpn_disconnect", preferredRoute: "MainVpn" };
  }
}
