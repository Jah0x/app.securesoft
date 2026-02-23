export type SupportedLocale = "en" | "ru";

export type TranslationKey =
  | "auth.login"
  | "auth.logout"
  | "vpn.connect"
  | "vpn.disconnect"
  | "subscription.active"
  | "subscription.expired";

const dictionaries: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: {
    "auth.login": "Login",
    "auth.logout": "Logout",
    "vpn.connect": "Connect",
    "vpn.disconnect": "Disconnect",
    "subscription.active": "Subscription active",
    "subscription.expired": "Subscription expired",
  },
  ru: {
    "auth.login": "Войти",
    "auth.logout": "Выйти",
    "vpn.connect": "Подключить",
    "vpn.disconnect": "Отключить",
    "subscription.active": "Подписка активна",
    "subscription.expired": "Подписка истекла",
  },
};

export class I18nModule {
  private locale: SupportedLocale;

  constructor(defaultLocale: SupportedLocale = "en") {
    this.locale = defaultLocale;
  }

  setLocale(locale: SupportedLocale): void {
    this.locale = locale;
  }

  getLocale(): SupportedLocale {
    return this.locale;
  }

  t(key: TranslationKey): string {
    return dictionaries[this.locale][key] ?? dictionaries.en[key] ?? key;
  }
}
