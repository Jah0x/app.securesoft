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
    return versionInfo.forced_update;
  }
}
