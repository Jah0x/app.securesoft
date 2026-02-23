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
});

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
