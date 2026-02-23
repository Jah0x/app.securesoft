import type { SecureStore } from "../storage/secureStore.js";

export interface TlsPinningAdapter {
  getServerCertificateHash(hostname: string): Promise<string>;
}

export interface DeviceIntegrityAdapter {
  isEmulator(): Promise<boolean>;
  isRootedOrJailbroken(): Promise<boolean>;
}

export class SecurityModule {
  constructor(
    private readonly secureStore: SecureStore,
    private readonly integrity: DeviceIntegrityAdapter,
    private readonly tlsAdapter?: TlsPinningAdapter,
  ) {}

  async verifyTlsPin(hostname: string, expectedSha256Hash: string): Promise<boolean> {
    if (!this.tlsAdapter) {
      return false;
    }

    const actualHash = await this.tlsAdapter.getServerCertificateHash(hostname);
    return normalizeHash(actualHash) === normalizeHash(expectedSha256Hash);
  }

  async evaluateDeviceIntegrity(): Promise<{ isTrusted: boolean; reasons: string[] }> {
    const [emulator, rooted] = await Promise.all([
      this.integrity.isEmulator(),
      this.integrity.isRootedOrJailbroken(),
    ]);

    const reasons: string[] = [];
    if (emulator) {
      reasons.push("emulator_detected");
    }

    if (rooted) {
      reasons.push("root_or_jailbreak_detected");
    }

    return {
      isTrusted: reasons.length === 0,
      reasons,
    };
  }

  async clearSensitiveData(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.secureStore.delete(key)));
  }
}

const normalizeHash = (value: string): string => value.replace(/^sha256\//i, "").trim().toLowerCase();
