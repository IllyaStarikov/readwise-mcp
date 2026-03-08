import { describe, it, expect, afterEach } from "vitest";
import { getToken, handleApiResponse } from "../../src/readwise/shared.js";

describe("shared helpers", () => {
  const originalEnv = process.env.READWISE_TOKEN;

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

    it("throws ReadwiseTokenError when not set", () => {
      delete process.env.READWISE_TOKEN;
      expect(() => getToken()).toThrow("READWISE_TOKEN");
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
