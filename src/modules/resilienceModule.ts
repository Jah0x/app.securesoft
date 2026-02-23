import type { SecureStore } from "../storage/secureStore.js";
import type { VpnState } from "../types/contracts.js";

export interface OfflineAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type OfflineActionProcessor = (action: OfflineAction) => Promise<void>;

export class OfflineActionQueue {
  private static readonly KEY = "offline:actions";

  constructor(private readonly secureStore?: SecureStore) {}

  async enqueue(action: OfflineAction): Promise<void> {
    const queue = await this.list();
    queue.push(action);
    await this.save(queue);
  }

  async list(): Promise<OfflineAction[]> {
    if (!this.secureStore) {
      return [];
    }

    const raw = await this.secureStore.get(OfflineActionQueue.KEY);
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as OfflineAction[];
  }

  async flush(processor: OfflineActionProcessor): Promise<void> {
    const queue = await this.list();
    const failed: OfflineAction[] = [];

    for (const action of queue) {
      try {
        await processor(action);
      } catch {
        failed.push(action);
      }
    }

    await this.save(failed);
  }

  async clear(): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    await this.secureStore.delete(OfflineActionQueue.KEY);
  }

  private async save(queue: OfflineAction[]): Promise<void> {
    if (!this.secureStore) {
      return;
    }

    await this.secureStore.set(OfflineActionQueue.KEY, JSON.stringify(queue));
  }
}

export class LocalizationModule {
  private language = "ru";

  constructor(private readonly dictionary: Record<string, Record<string, string>>) {}

  setLanguage(language: string): void {
    this.language = language;
  }

  t(key: string, fallback: string): string {
    return this.dictionary[this.language]?.[key] ?? fallback;
  }
}

export interface ErrorScreenModel {
  title: string;
  description: string;
  recommendation: string;
}

export class ErrorUxModule {
  constructor(private readonly i18n: LocalizationModule) {}

  getScreenForVpnState(state: VpnState): ErrorScreenModel {
    if (state === "error_auth") {
      return {
        title: this.i18n.t("error.auth.title", "Ошибка авторизации"),
        description: this.i18n.t("error.auth.description", "Сессия истекла или токен недействителен."),
        recommendation: this.i18n.t("error.auth.recommendation", "Войдите в аккаунт заново."),
      };
    }

    if (state === "error_subscription") {
      return {
        title: this.i18n.t("error.subscription.title", "Проблема с подпиской"),
        description: this.i18n.t("error.subscription.description", "Подписка неактивна или превышен лимит устройств."),
        recommendation: this.i18n.t("error.subscription.recommendation", "Проверьте оплату в личном кабинете."),
      };
    }

    return {
      title: this.i18n.t("error.network.title", "Сетевая ошибка"),
      description: this.i18n.t("error.network.description", "Не удалось подключиться к VPN-серверу."),
      recommendation: this.i18n.t("error.network.recommendation", "Проверьте интернет и попробуйте снова."),
    };
  }
}
