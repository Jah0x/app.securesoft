import { HttpClient } from "../api/httpClient.js";
import type { AppVersionInfo, Platform } from "../types/contracts.js";

export class UpdateModule {
  constructor(
    private readonly api: HttpClient,
    private readonly platform: Platform,
    private readonly appVersion: string,
  ) {}

  async checkVersion(): Promise<AppVersionInfo> {
    return this.api.getAppVersion(this.platform, this.appVersion);
  }

  async isForcedUpdateRequired(): Promise<boolean> {
    const versionInfo = await this.checkVersion();
    if (versionInfo.forced_update) {
      return true;
    }

    return compareSemver(this.appVersion, versionInfo.minimum_supported_version) < 0;
  }

  async isUpdateAvailable(): Promise<boolean> {
    const versionInfo = await this.checkVersion();
    return compareSemver(this.appVersion, versionInfo.latest_version) < 0;
  }
}

const compareSemver = (left: string, right: string): number => {
  const leftParts = left.split(".").map((value) => Number.parseInt(value, 10));
  const rightParts = right.split(".").map((value) => Number.parseInt(value, 10));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;

    if (a < b) {
      return -1;
    }

    if (a > b) {
      return 1;
    }
  }

  return 0;
};
