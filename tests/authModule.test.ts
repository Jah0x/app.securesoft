import { describe, expect, it } from "vitest";
import { AuthModule, HttpError, InMemorySecureStore } from "../src/index.js";

class FakeHttpClient {
  refreshCalls = 0;

  async login() {
    return { accessToken: "stale-access", refreshToken: "refresh-1" };
  }

  async oauthLogin() {
    return { accessToken: "oauth-access", refreshToken: "oauth-refresh" };
  }

  async refresh() {
    this.refreshCalls += 1;
    await wait(20);
    return { accessToken: "fresh-access", refreshToken: "refresh-2" };
  }
}

describe("AuthModule", () => {
  it("защищает refresh от гонок при параллельных 401", async () => {
    const api = new FakeHttpClient();
    const auth = new AuthModule(api as never, new InMemorySecureStore());
    await auth.login("acc1", "user@example.com", "pw");

    const protectedRequest = async () =>
      auth.runWithAccessToken(async (token) => {
        if (token === "stale-access") {
          throw new HttpError(401, "/resource");
        }

        return token;
      });

    const [result1, result2] = await Promise.all([protectedRequest(), protectedRequest()]);

    expect(result1).toBe("fresh-access");
    expect(result2).toBe("fresh-access");
    expect(api.refreshCalls).toBe(1);
  });

  it("сохраняет список аккаунтов и активный аккаунт между перезапусками", async () => {
    const store = new InMemorySecureStore();
    const api = new FakeHttpClient();

    const auth = new AuthModule(api as never, store);
    await auth.login("acc1", "user@example.com", "pw");
    await auth.oauthLogin("acc2", "google", "oauth-code");

    expect(await auth.listAccounts()).toEqual(["acc1", "acc2"]);

    const hydrated = new AuthModule(api as never, store);
    const accountId = await hydrated.hydrateActiveAccount();

    expect(accountId).toBe("acc2");
    expect(hydrated.getActiveAccountId()).toBe("acc2");

    await hydrated.logout("acc2");
    expect(await hydrated.listAccounts()).toEqual(["acc1"]);
    expect(hydrated.getActiveAccountId()).toBeNull();
  });
});

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
