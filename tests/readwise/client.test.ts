import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateToken, saveDocument } from "../../src/readwise/client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("readwise client", () => {
  const originalEnv = process.env.READWISE_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.READWISE_TOKEN = "test-token-123";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.READWISE_TOKEN = originalEnv;
    } else {
      delete process.env.READWISE_TOKEN;
    }
  });

  describe("validateToken", () => {
    it("returns true for 204 response", async () => {
      mockFetch.mockResolvedValue({ status: 204 });
      const result = await validateToken();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v2/auth/",
        expect.objectContaining({
          headers: { Authorization: "Token test-token-123" },
        }),
      );
    });

    it("returns false for non-204 response", async () => {
      mockFetch.mockResolvedValue({ status: 401 });
      const result = await validateToken();
      expect(result).toBe(false);
    });

    it("accepts an explicit token parameter", async () => {
      mockFetch.mockResolvedValue({ status: 204 });
      await validateToken("explicit-token");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: "Token explicit-token" },
        }),
      );
    });
  });

  describe("saveDocument", () => {
    it("saves a new document (201)", async () => {
      mockFetch.mockResolvedValue({
        status: 201,
        json: async () => ({
          id: "abc123",
          url: "https://readwise.io/reader/doc/abc123",
        }),
      });

      const result = await saveDocument({
        url: "https://example.com",
        html: "<html>test</html>",
      });

      expect(result).toEqual({
        id: "abc123",
        url: "https://readwise.io/reader/doc/abc123",
        alreadyExists: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v3/save/",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Token test-token-123",
            "Content-Type": "application/json",
          },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.saved_using).toBe("safari-readwise-mcp");
    });

    it("handles duplicate document (200)", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ id: "existing", url: "https://readwise.io/reader/doc/existing" }),
      });

      const result = await saveDocument({
        url: "https://example.com",
        html: "<html>test</html>",
      });

      expect(result.alreadyExists).toBe(true);
    });

    it("throws ReadwiseTokenError on 401", async () => {
      mockFetch.mockResolvedValue({ status: 401 });
      const err = await saveDocument({ url: "https://example.com", html: "test" }).catch((e) => e);
      expect(err.name).toBe("ReadwiseTokenError");
    });

    it("throws ReadwiseApiError on 429 with Retry-After", async () => {
      mockFetch.mockResolvedValue({
        status: 429,
        headers: new Headers({ "Retry-After": "30" }),
      });
      await expect(
        saveDocument({ url: "https://example.com", html: "test" }),
      ).rejects.toThrow(/Rate limited.*30/);
    });

    it("throws ReadwiseApiError on unexpected status", async () => {
      mockFetch.mockResolvedValue({
        status: 500,
        text: async () => "Internal Server Error",
      });
      await expect(
        saveDocument({ url: "https://example.com", html: "test" }),
      ).rejects.toThrow(/500/);
    });

    it("throws ReadwiseTokenError when no token set", async () => {
      delete process.env.READWISE_TOKEN;
      await expect(
        saveDocument({ url: "https://example.com", html: "test" }),
      ).rejects.toThrow("READWISE_TOKEN");
    });

    it("sends optional fields when provided", async () => {
      mockFetch.mockResolvedValue({
        status: 201,
        json: async () => ({ id: "new", url: "https://readwise.io/doc/new" }),
      });

      await saveDocument({
        url: "https://example.com",
        html: "<html>test</html>",
        title: "My Title",
        tags: ["tag1", "tag2"],
        location: "later",
        category: "article",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.title).toBe("My Title");
      expect(body.tags).toEqual(["tag1", "tag2"]);
      expect(body.location).toBe("later");
      expect(body.category).toBe("article");
    });

    it("sends published_date and image_url when provided", async () => {
      mockFetch.mockResolvedValue({
        status: 201,
        json: async () => ({ id: "new", url: "https://readwise.io/doc/new" }),
      });

      await saveDocument({
        url: "https://example.com",
        html: "<html>test</html>",
        published_date: "2024-06-15",
        image_url: "https://example.com/cover.jpg",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.published_date).toBe("2024-06-15");
      expect(body.image_url).toBe("https://example.com/cover.jpg");
    });
  });
});
