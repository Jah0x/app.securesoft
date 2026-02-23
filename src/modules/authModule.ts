import { HttpClient, HttpError } from "../api/httpClient.js";
import type { SecureStore } from "../storage/secureStore.js";

interface AccountTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthModule {
  private static readonly ACTIVE_ACCOUNT_KEY = "auth:active_account";
  private static readonly ACCOUNTS_KEY = "auth:accounts";

  private activeAccountId: string | null = null;
  private refreshInFlight: Promise<void> | null = null;
  private logoutHandlers: Array<(accountId: string) => Promise<void>> = [];

  constructor(
    private readonly api: HttpClient,
    private readonly secureStore: SecureStore,
  ) {}

  async login(accountId: string, email: string, password: string): Promise<void> {
    const tokens = await this.api.login(email, password);
    await this.saveTokens(accountId, tokens);
    await this.addAccount(accountId);
    await this.setActiveAccount(accountId);
  }

  async oauthLogin(accountId: string, provider: string, code: string): Promise<void> {
    const tokens = await this.api.oauthLogin(provider, code);
    await this.saveTokens(accountId, tokens);
    await this.addAccount(accountId);
    await this.setActiveAccount(accountId);
  }

  async hydrateActiveAccount(): Promise<string | null> {
    const accountId = await this.secureStore.get(AuthModule.ACTIVE_ACCOUNT_KEY);
    this.activeAccountId = accountId;
    return this.activeAccountId;
  }

  onLogout(handler: (accountId: string) => Promise<void>): void {
    this.logoutHandlers.push(handler);
  }

  async refreshActiveAccount(): Promise<void> {
    await this.refreshActiveAccountSafe();
  }

  async refreshActiveAccountSafe(): Promise<void> {
    if (this.refreshInFlight) {
      await this.refreshInFlight;
      return;
    }

    this.refreshInFlight = this.doRefreshActiveAccount();
    try {
      await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async runWithAccessToken<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
    const token = await this.getActiveAccessToken();
    try {
      return await operation(token);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) {
        throw error;
      }

      await this.refreshActiveAccountSafe();
      const refreshed = await this.getActiveAccessToken();
      return operation(refreshed);
    }
  }

  private async doRefreshActiveAccount(): Promise<void> {
    const accountId = this.requireActiveAccount();
    const tokens = await this.getTokens(accountId);
    const next = await this.api.refresh(tokens.refreshToken);
    await this.saveTokens(accountId, next);
  }

  async logout(accountId: string): Promise<void> {
    await this.secureStore.delete(this.tokensKey(accountId));
    await this.removeAccount(accountId);

    for (const handler of this.logoutHandlers) {
      await handler(accountId);
    }

    if (this.activeAccountId === accountId) {
      this.activeAccountId = null;
      await this.secureStore.delete(AuthModule.ACTIVE_ACCOUNT_KEY);
    }
  }

  async setActiveAccount(accountId: string): Promise<void> {
    await this.getTokens(accountId);
    this.activeAccountId = accountId;
    await this.secureStore.set(AuthModule.ACTIVE_ACCOUNT_KEY, accountId);
  }

  async listAccounts(): Promise<string[]> {
    const raw = await this.secureStore.get(AuthModule.ACCOUNTS_KEY);
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as string[];
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

  private async addAccount(accountId: string): Promise<void> {
    const accounts = await this.listAccounts();
    if (accounts.includes(accountId)) {
      return;
    }

    accounts.push(accountId);
    await this.secureStore.set(AuthModule.ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  private async removeAccount(accountId: string): Promise<void> {
    const accounts = await this.listAccounts();
    const filtered = accounts.filter((value) => value !== accountId);
    await this.secureStore.set(AuthModule.ACCOUNTS_KEY, JSON.stringify(filtered));
  }
}
