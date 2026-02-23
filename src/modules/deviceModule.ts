import { HttpClient } from "../api/httpClient.js";
import type { SecureStore } from "../storage/secureStore.js";
import { createUuid } from "../utils/uuid.js";

export class DeviceModule {
  private static readonly DEVICE_KEY = "device:id";
  private static readonly DEVICE_USER_KEY = "device:user";

  constructor(
    private readonly secureStore: SecureStore,
    private readonly api?: HttpClient,
  ) {}

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.secureStore.get(DeviceModule.DEVICE_KEY);
    if (existing) {
      return existing;
    }

    const next = createUuid();
    await this.secureStore.set(DeviceModule.DEVICE_KEY, next);
    return next;
  }

  async registerCurrentDevice(accessToken: string): Promise<string> {
    if (!this.api) {
      throw new Error("HttpClient is required for device registration");
    }

    const deviceId = await this.getOrCreateDeviceId();
    const response = await this.api.registerDevice(accessToken, deviceId);
    await this.secureStore.set(DeviceModule.DEVICE_USER_KEY, response.device_user);
    return response.device_user;
  }

  async getDeviceUser(): Promise<string | null> {
    return this.secureStore.get(DeviceModule.DEVICE_USER_KEY);
  }

  async clearDevice(): Promise<void> {
    await this.secureStore.delete(DeviceModule.DEVICE_KEY);
    await this.secureStore.delete(DeviceModule.DEVICE_USER_KEY);
  }
}
