import { HttpClient } from "../api/httpClient.js";
import type { AppVersionInfo, Platform, VpnTokenResponse } from "../types/contracts.js";

export type UpdateMode = "none" | "soft" | "blocking";

export interface UpdatePolicy {
  mode: UpdateMode;
  latestVersion: string;
  minimumSupportedVersion: string;
  redirectUrl: string | null;
}

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

  getPolicyFromVpnToken(token: VpnTokenResponse): UpdatePolicy {
    if (!token.update?.forced) {
      return {
        mode: "none",
        latestVersion: token.update?.latest_version ?? this.appVersion,
        minimumSupportedVersion: token.update?.min_supported_version ?? this.appVersion,
        redirectUrl: null,
      };
    }

    return {
      mode: "blocking",
      latestVersion: token.update.latest_version ?? this.appVersion,
      minimumSupportedVersion: token.update.min_supported_version ?? this.appVersion,
      redirectUrl: token.update.store_url ?? null,
    };
  }

  async getUpdatePolicy(storeUrls: { ios: string; android: string }): Promise<UpdatePolicy> {
    const versionInfo = await this.checkVersion();
    const minSupportedReached = compareSemver(this.appVersion, versionInfo.minimum_supported_version) >= 0;

    if (compareSemver(this.appVersion, versionInfo.latest_version) >= 0) {
      return {
        mode: "none",
        latestVersion: versionInfo.latest_version,
        minimumSupportedVersion: versionInfo.minimum_supported_version,
        redirectUrl: null,
      };
    }

    return {
      mode: versionInfo.forced_update || !minSupportedReached ? "blocking" : "soft",
      latestVersion: versionInfo.latest_version,
      minimumSupportedVersion: versionInfo.minimum_supported_version,
      redirectUrl: this.platform === "ios" ? storeUrls.ios : storeUrls.android,
    };
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
