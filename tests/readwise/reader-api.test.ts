import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  validateToken,
  listDocuments,
  updateDocument,
  deleteDocument,
  bulkUpdateDocuments,
  listReaderTags,
} from "../../src/readwise/reader-api.js";

describe("reader-api", () => {
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

  // ── validateToken ──

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

  // ── listDocuments ──

  describe("listDocuments", () => {
    const mockDocuments = [
      {
        id: "doc-1",
        url: "https://readwise.io/reader/doc/doc-1",
        source_url: "https://example.com/1",
        title: "Document One",
        author: "Author A",
        source: "web",
        category: "article",
        location: "later",
        tags: {},
        site_name: "Example",
        word_count: 500,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
        published_date: null,
        summary: "Summary one",
        image_url: "",
        notes: "",
        parent_id: null,
        reading_progress: 0,
      },
      {
        id: "doc-2",
        url: "https://readwise.io/reader/doc/doc-2",
        source_url: "https://example.com/2",
        title: "Document Two",
        author: "Author B",
        source: "web",
        category: "article",
        location: "new",
        tags: {},
        site_name: "Example",
        word_count: 1000,
        created_at: "2025-01-03T00:00:00Z",
        updated_at: "2025-01-04T00:00:00Z",
        published_date: "2025-01-01",
        summary: "Summary two",
        image_url: "",
        notes: "",
        parent_id: null,
        reading_progress: 0.5,
      },
    ];

    it("returns documents on success", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => ({
          count: 2,
          nextPageCursor: "abc",
          results: mockDocuments,
        }),
      });

      const result = await listDocuments();
      expect(result.count).toBe(2);
      expect(result.nextPageCursor).toBe("abc");
      expect(result.results).toHaveLength(2);
      expect(result.results[0].title).toBe("Document One");
    });

    it("maps params to query string", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => ({ count: 0, nextPageCursor: null, results: [] }),
      });

      await listDocuments({
        id: "doc-1",
        updatedAfter: "2025-01-01",
        location: "later",
        category: "article",
        tag: "science",
        withHtmlContent: true,
      });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("id")).toBe("doc-1");
      expect(calledUrl.searchParams.get("updatedAfter")).toBe("2025-01-01");
      expect(calledUrl.searchParams.get("location")).toBe("later");
      expect(calledUrl.searchParams.get("category")).toBe("article");
      expect(calledUrl.searchParams.get("tag")).toBe("science");
      expect(calledUrl.searchParams.get("withHtmlContent")).toBe("true");
    });

    it("handles empty results", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => ({ count: 0, nextPageCursor: null, results: [] }),
      });

      const result = await listDocuments();
      expect(result.count).toBe(0);
      expect(result.nextPageCursor).toBeNull();
      expect(result.results).toEqual([]);
    });

    it("passes pagination cursor", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => ({ count: 1, nextPageCursor: "next-cursor", results: [mockDocuments[0]] }),
      });

      await listDocuments({ pageCursor: "cursor-123" });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("pageCursor")).toBe("cursor-123");
    });
  });

  // ── updateDocument ──

  describe("updateDocument", () => {
    it("sends PATCH with document_id in URL and fields in body", async () => {
      const updatedDoc = {
        id: "doc-1",
        url: "https://readwise.io/reader/doc/doc-1",
        source_url: "https://example.com/1",
        title: "Updated Title",
        author: "Author A",
        source: "web",
        category: "article",
        location: "archive",
        tags: {},
        site_name: "Example",
        word_count: 500,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-05T00:00:00Z",
        published_date: null,
        summary: "",
        image_url: "",
        notes: "",
        parent_id: null,
        reading_progress: 1,
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => updatedDoc,
      });

      const result = await updateDocument({
        document_id: "doc-1",
        title: "Updated Title",
        location: "archive",
      });

      expect(result.title).toBe("Updated Title");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v3/update/doc-1/",
        expect.objectContaining({
          method: "PATCH",
          headers: {
            Authorization: "Token test-token-123",
            "Content-Type": "application/json",
          },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.title).toBe("Updated Title");
      expect(body.location).toBe("archive");
      expect(body.document_id).toBeUndefined();
    });
  });

  // ── deleteDocument ──

  describe("deleteDocument", () => {
    it("sends DELETE request with document ID in URL", async () => {
      mockFetch.mockResolvedValue({
        status: 204,
        headers: new Headers(),
      });

      await deleteDocument("doc-to-delete");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v3/delete/doc-to-delete/",
        expect.objectContaining({
          method: "DELETE",
          headers: { Authorization: "Token test-token-123" },
        }),
      );
    });
  });

  // ── bulkUpdateDocuments ──

  describe("bulkUpdateDocuments", () => {
    it("sends PATCH with array body", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
      });

      const updates = [
        { document_id: "doc-1", location: "archive" as const },
        { document_id: "doc-2", title: "New Title" },
      ];

      await bulkUpdateDocuments(updates);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v3/bulk_update/",
        expect.objectContaining({
          method: "PATCH",
          headers: {
            Authorization: "Token test-token-123",
            "Content-Type": "application/json",
          },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual(updates);
    });
  });

  // ── listReaderTags ──

  describe("listReaderTags", () => {
    it("returns array of tags", async () => {
      const mockTags = [
        { id: "tag-1", name: "science", type: "manual", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
        { id: "tag-2", name: "tech", type: "manual", created_at: "2025-01-02T00:00:00Z", updated_at: "2025-01-02T00:00:00Z" },
      ];

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockTags,
      });

      const result = await listReaderTags();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("science");
      expect(result[1].name).toBe("tech");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v3/tags/",
        expect.objectContaining({
          headers: { Authorization: "Token test-token-123" },
        }),
      );
    });
  });

  // ── Error handling ──

  describe("error handling", () => {
    it("throws ReadwiseTokenError on 401", async () => {
      mockFetch.mockResolvedValue({
        status: 401,
        headers: new Headers(),
      });
      const err = await listDocuments().catch((e) => e);
      expect(err.name).toBe("ReadwiseTokenError");
    });

    it("throws ReadwiseApiError on 429 with Retry-After", async () => {
      mockFetch.mockResolvedValue({
        status: 429,
        headers: new Headers({ "Retry-After": "30" }),
      });
      await expect(listDocuments()).rejects.toThrow(/Rate limited.*30/);
    });

    it("throws ReadwiseApiError on 500", async () => {
      mockFetch.mockResolvedValue({
        status: 500,
        headers: new Headers(),
        text: async () => "Internal Server Error",
      });
      await expect(updateDocument({ document_id: "x", title: "y" })).rejects.toThrow(/500/);
    });

    it("throws ReadwiseTokenError when no token is set", async () => {
      delete process.env.READWISE_TOKEN;
      await expect(listDocuments()).rejects.toThrow("READWISE_TOKEN");
    });
  });
});
