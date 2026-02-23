export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface NativeSecureStoreBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class InMemorySecureStore implements SecureStore {
  private readonly data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

export class IosKeychainSecureStore implements SecureStore {
  constructor(private readonly backend: NativeSecureStoreBackend) {}

  async get(key: string): Promise<string | null> {
    return this.backend.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.backend.setItem(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.backend.removeItem(key);
  }
}

export class AndroidEncryptedSecureStore implements SecureStore {
  constructor(private readonly backend: NativeSecureStoreBackend) {}

  async get(key: string): Promise<string | null> {
    return this.backend.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.backend.setItem(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.backend.removeItem(key);
  }
}
