import type { SecureStore } from "../storage/secureStore.js";
import { createUuid } from "../utils/uuid.js";

export class DeviceModule {
  private static readonly DEVICE_KEY = "device:id";

  constructor(private readonly secureStore: SecureStore) {}

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.secureStore.get(DeviceModule.DEVICE_KEY);
    if (existing) {
      return existing;
    }

    const next = createUuid();
    await this.secureStore.set(DeviceModule.DEVICE_KEY, next);
    return next;
  }

  async clearDevice(): Promise<void> {
    await this.secureStore.delete(DeviceModule.DEVICE_KEY);
  }
}
