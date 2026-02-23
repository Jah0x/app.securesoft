import { HttpClient } from "../api/httpClient.js";
import type { SecureStore } from "../storage/secureStore.js";

interface AccountTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthModule {
  private activeAccountId: string | null = null;

  constructor(
    private readonly api: HttpClient,
    private readonly secureStore: SecureStore,
  ) {}

  async login(accountId: string, email: string, password: string): Promise<void> {
    const tokens = await this.api.login(email, password);
    await this.saveTokens(accountId, tokens);
    await this.setActiveAccount(accountId);
  }

  async refreshActiveAccount(): Promise<void> {
    const accountId = this.requireActiveAccount();
    const tokens = await this.getTokens(accountId);
    const next = await this.api.refresh(tokens.refreshToken);
    await this.saveTokens(accountId, next);
  }

  async logout(accountId: string): Promise<void> {
    await this.secureStore.delete(this.tokensKey(accountId));
    if (this.activeAccountId === accountId) {
      this.activeAccountId = null;
    }
  }

  async setActiveAccount(accountId: string): Promise<void> {
    await this.getTokens(accountId);
    this.activeAccountId = accountId;
  }

  getActiveAccountId(): string | null {
    return this.activeAccountId;
  }

  async getActiveAccessToken(): Promise<string> {
    const accountId = this.requireActiveAccount();
    const tokens = await this.getTokens(accountId);
    return tokens.accessToken;
  }

  private requireActiveAccount(): string {
    if (!this.activeAccountId) {
      throw new Error("No active account selected");
    }

    return this.activeAccountId;
  }

  private async saveTokens(accountId: string, tokens: AccountTokens): Promise<void> {
    await this.secureStore.set(this.tokensKey(accountId), JSON.stringify(tokens));
  }

  private async getTokens(accountId: string): Promise<AccountTokens> {
    const raw = await this.secureStore.get(this.tokensKey(accountId));
    if (!raw) {
      throw new Error(`Missing tokens for account ${accountId}`);
    }

    return JSON.parse(raw) as AccountTokens;
  }

  private tokensKey(accountId: string): string {
    return `auth:${accountId}:tokens`;
  }
}
