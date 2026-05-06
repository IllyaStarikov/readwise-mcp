import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../src/utils/keychain.js", () => ({
  KEYCHAIN_SERVICE: "safari-readwise-mcp",
  getTokenFromKeychain: vi.fn(() => null),
}));

vi.mock("../../src/utils/platform.js", () => ({
  isMacOS: vi.fn(() => true),
}));

import {
  getToken,
  handleApiResponse,
  _resetTokenCache,
} from "../../src/readwise/shared.js";
import { getTokenFromKeychain } from "../../src/utils/keychain.js";
import { isMacOS } from "../../src/utils/platform.js";

const mockGetTokenFromKeychain = vi.mocked(getTokenFromKeychain);
const mockIsMacOS = vi.mocked(isMacOS);

describe("shared helpers", () => {
  const originalEnv = process.env.READWISE_TOKEN;

  beforeEach(() => {
    _resetTokenCache();
    mockGetTokenFromKeychain.mockClear();
    mockGetTokenFromKeychain.mockReturnValue(null);
    // Default: assume macOS so the Keychain code path is exercised
    // regardless of the host that runs the tests (CI uses Linux).
    mockIsMacOS.mockReturnValue(true);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.READWISE_TOKEN = originalEnv;
    } else {
      delete process.env.READWISE_TOKEN;
    }
  });

  describe("getToken", () => {
    it("returns token from env", () => {
      process.env.READWISE_TOKEN = "my-token";
      expect(getToken()).toBe("my-token");
    });

    it("env wins over Keychain", () => {
      process.env.READWISE_TOKEN = "from-env";
      mockGetTokenFromKeychain.mockReturnValue("from-keychain");
      expect(getToken()).toBe("from-env");
      expect(mockGetTokenFromKeychain).not.toHaveBeenCalled();
    });

    it("falls back to Keychain on macOS when env is unset", () => {
      delete process.env.READWISE_TOKEN;
      mockGetTokenFromKeychain.mockReturnValue("from-keychain");
      expect(getToken()).toBe("from-keychain");
    });

    it("memoizes the Keychain lookup across calls", () => {
      delete process.env.READWISE_TOKEN;
      mockGetTokenFromKeychain.mockReturnValue("cached-token");
      getToken();
      getToken();
      getToken();
      expect(mockGetTokenFromKeychain).toHaveBeenCalledTimes(1);
    });

    it("memoizes a Keychain miss too (does not retry the shellout)", () => {
      delete process.env.READWISE_TOKEN;
      mockGetTokenFromKeychain.mockReturnValue(null);
      expect(() => getToken()).toThrow();
      expect(() => getToken()).toThrow();
      expect(mockGetTokenFromKeychain).toHaveBeenCalledTimes(1);
    });

    it("on macOS, missing-token error message mentions setup-token", () => {
      delete process.env.READWISE_TOKEN;
      mockGetTokenFromKeychain.mockReturnValue(null);
      const err = (() => {
        try {
          getToken();
          return null;
        } catch (e) {
          return e;
        }
      })();
      expect(err).toBeTruthy();
      expect((err as Error).name).toBe("ReadwiseTokenError");
      expect((err as Error).message).toContain("READWISE_TOKEN");
      expect((err as Error).message).toContain("setup-token");
    });

    it("on non-macOS, never touches the Keychain and uses the env-only error message", () => {
      mockIsMacOS.mockReturnValue(false);
      delete process.env.READWISE_TOKEN;
      mockGetTokenFromKeychain.mockReturnValue("would-not-be-used");

      const err = (() => {
        try {
          getToken();
          return null;
        } catch (e) {
          return e;
        }
      })();
      expect(err).toBeTruthy();
      expect((err as Error).name).toBe("ReadwiseTokenError");
      expect((err as Error).message).toContain("READWISE_TOKEN");
      expect((err as Error).message).not.toContain("Keychain");
      expect((err as Error).message).not.toContain("setup-token");
      expect(mockGetTokenFromKeychain).not.toHaveBeenCalled();
    });
  });

  describe("handleApiResponse", () => {
    it("does not throw for 200", async () => {
      const response = new Response("ok", { status: 200 });
      await expect(handleApiResponse(response, "test")).resolves.toBeUndefined();
    });

    it("does not throw for 204", async () => {
      const response = new Response(null, { status: 204 });
      await expect(handleApiResponse(response, "test")).resolves.toBeUndefined();
    });

    it("throws ReadwiseTokenError on 401", async () => {
      const response = new Response("unauthorized", { status: 401 });
      const err = await handleApiResponse(response, "test").catch((e) => e);
      expect(err.name).toBe("ReadwiseTokenError");
    });

    it("throws ReadwiseApiError on 429 with Retry-After", async () => {
      const response = new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "45" },
      });
      await expect(handleApiResponse(response, "test")).rejects.toThrow(
        /Rate limited.*45/,
      );
    });

    it("throws ReadwiseApiError on 500 with context prefix", async () => {
      const response = new Response("server error", { status: 500 });
      await expect(handleApiResponse(response, "List docs")).rejects.toThrow(
        /List docs: Readwise API returned 500/,
      );
    });

    it("throws ReadwiseApiError on 404", async () => {
      const response = new Response("not found", { status: 404 });
      const err = await handleApiResponse(response, "test").catch((e) => e);
      expect(err.name).toBe("ReadwiseApiError");
      expect(err.status).toBe(404);
    });
  });
});
