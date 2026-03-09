import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  createHighlights,
  listHighlights,
  getHighlight,
  updateHighlight,
  deleteHighlight,
  listBooks,
  getBook,
  exportHighlights,
  getDailyReview,
} from "../../src/readwise/classic-api.js";

describe("classic-api", () => {
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

  // ── createHighlights ──

  describe("createHighlights", () => {
    it("sends POST with highlights body and returns book-grouped response", async () => {
      const mockResults = [
        {
          id: 100,
          title: "My Book",
          author: "Author",
          category: "articles",
          source: "api_article",
          num_highlights: 2,
          modified_highlights: [1, 2],
          cover_image_url: "",
          highlights_url: "https://readwise.io/bookreview/100",
          source_url: "https://example.com",
          asin: null,
          tags: [],
          document_note: "",
        },
      ];

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockResults,
      });

      const params = {
        highlights: [
          { text: "A great quote", title: "My Book", author: "Author" },
          { text: "Another quote", note: "my note", source_url: "https://example.com" },
        ],
      };

      const result = await createHighlights(params);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(100);
      expect(result[0].modified_highlights).toEqual([1, 2]);
      expect(result[0].title).toBe("My Book");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v2/highlights/",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Token test-token-123",
            "Content-Type": "application/json",
          },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.highlights).toHaveLength(2);
    });
  });

  // ── listHighlights ──

  describe("listHighlights", () => {
    it("returns paginated highlights", async () => {
      const mockResponse = {
        count: 50,
        next: "https://readwise.io/api/v2/highlights/?page=2",
        previous: null,
        results: [
          {
            id: 1,
            text: "Highlight text",
            note: "",
            location: 1,
            location_type: "order",
            url: null,
            color: "yellow",
            updated: "2025-01-01T00:00:00Z",
            book_id: 10,
            tags: [],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const result = await listHighlights({ book_id: 10, page_size: 20, page: 1 });

      expect(result.count).toBe(50);
      expect(result.results).toHaveLength(1);

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("book_id")).toBe("10");
      expect(calledUrl.searchParams.get("page_size")).toBe("20");
      expect(calledUrl.searchParams.get("page")).toBe("1");
    });

    it("maps updatedAfter to updated__gt param", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => ({ count: 0, next: null, previous: null, results: [] }),
      });

      await listHighlights({ updatedAfter: "2025-06-01T00:00:00Z" });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("updated__gt")).toBe("2025-06-01T00:00:00Z");
    });
  });

  // ── getHighlight ──

  describe("getHighlight", () => {
    it("fetches a single highlight by ID", async () => {
      const mockHighlight = {
        id: 42,
        text: "The highlight",
        note: "",
        location: 5,
        location_type: "page",
        url: null,
        color: "yellow",
        updated: "2025-01-01T00:00:00Z",
        book_id: 10,
        tags: [],
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockHighlight,
      });

      const result = await getHighlight(42);
      expect(result.id).toBe(42);
      expect(result.text).toBe("The highlight");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v2/highlights/42/",
        expect.objectContaining({
          headers: { Authorization: "Token test-token-123" },
        }),
      );
    });
  });

  // ── updateHighlight ──

  describe("updateHighlight", () => {
    it("sends PATCH with highlight fields", async () => {
      const mockUpdated = {
        id: 42,
        text: "Updated text",
        note: "new note",
        location: 5,
        location_type: "page",
        url: null,
        color: "blue",
        updated: "2025-01-02T00:00:00Z",
        book_id: 10,
        tags: [],
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockUpdated,
      });

      const result = await updateHighlight(42, { text: "Updated text", note: "new note", color: "blue" });

      expect(result.text).toBe("Updated text");
      expect(result.color).toBe("blue");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v2/highlights/42/",
        expect.objectContaining({
          method: "PATCH",
          headers: {
            Authorization: "Token test-token-123",
            "Content-Type": "application/json",
          },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toBe("Updated text");
      expect(body.note).toBe("new note");
      expect(body.color).toBe("blue");
    });
  });

  // ── deleteHighlight ──

  describe("deleteHighlight", () => {
    it("sends DELETE request with highlight ID in URL", async () => {
      mockFetch.mockResolvedValue({
        status: 204,
        headers: new Headers(),
      });

      await deleteHighlight(42);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v2/highlights/42/",
        expect.objectContaining({
          method: "DELETE",
          headers: { Authorization: "Token test-token-123" },
        }),
      );
    });
  });

  // ── listBooks ──

  describe("listBooks", () => {
    it("returns paginated books with query params", async () => {
      const mockResponse = {
        count: 100,
        next: "https://readwise.io/api/v2/books/?page=2",
        previous: null,
        results: [
          {
            id: 1,
            title: "My Book",
            author: "Author",
            category: "books",
            source: "kindle",
            num_highlights: 25,
            last_highlight_at: "2025-01-01T00:00:00Z",
            updated: "2025-01-01T00:00:00Z",
            cover_image_url: "https://example.com/cover.jpg",
            highlights_url: "https://readwise.io/api/v2/books/1/highlights/",
            source_url: null,
            asin: "B001234",
            tags: [],
            document_note: "",
          },
        ],
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const result = await listBooks({ category: "books", source: "kindle", page_size: 10, page: 1 });

      expect(result.count).toBe(100);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe("My Book");

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("category")).toBe("books");
      expect(calledUrl.searchParams.get("source")).toBe("kindle");
      expect(calledUrl.searchParams.get("page_size")).toBe("10");
      expect(calledUrl.searchParams.get("page")).toBe("1");
    });

    it("maps updatedAfter to updated__gt param", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => ({ count: 0, next: null, previous: null, results: [] }),
      });

      await listBooks({ updatedAfter: "2025-06-01T00:00:00Z" });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("updated__gt")).toBe("2025-06-01T00:00:00Z");
    });
  });

  // ── getBook ──

  describe("getBook", () => {
    it("fetches a single book by ID", async () => {
      const mockBook = {
        id: 99,
        title: "The Book",
        author: "Writer",
        category: "articles",
        source: "web",
        num_highlights: 5,
        last_highlight_at: null,
        updated: "2025-01-01T00:00:00Z",
        cover_image_url: "",
        highlights_url: "https://readwise.io/api/v2/books/99/highlights/",
        source_url: "https://example.com/article",
        asin: null,
        tags: [],
        document_note: "",
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockBook,
      });

      const result = await getBook(99);
      expect(result.id).toBe(99);
      expect(result.title).toBe("The Book");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v2/books/99/",
        expect.objectContaining({
          headers: { Authorization: "Token test-token-123" },
        }),
      );
    });
  });

  // ── exportHighlights ──

  describe("exportHighlights", () => {
    it("returns export data with query params", async () => {
      const mockResponse = {
        count: 1,
        nextPageCursor: null,
        results: [
          {
            user_book_id: 1,
            title: "Exported Book",
            author: "Author",
            readable_title: "Exported Book",
            source: "kindle",
            cover_image_url: "",
            unique_url: null,
            category: "books",
            document_note: "",
            readwise_url: "https://readwise.io/bookreview/1",
            source_url: null,
            asin: null,
            tags: [],
            highlights: [
              {
                id: 10,
                text: "Export highlight",
                note: "",
                location: 1,
                location_type: "page",
                url: null,
                color: "yellow",
                updated: "2025-01-01T00:00:00Z",
                tags: [],
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const result = await exportHighlights({
        updatedAfter: "2025-01-01",
        ids: [1, 2, 3],
        pageCursor: "cursor-abc",
      });

      expect(result.count).toBe(1);
      expect(result.results[0].title).toBe("Exported Book");
      expect(result.results[0].highlights).toHaveLength(1);

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get("updatedAfter")).toBe("2025-01-01");
      expect(calledUrl.searchParams.get("ids")).toBe("1,2,3");
      expect(calledUrl.searchParams.get("pageCursor")).toBe("cursor-abc");
    });
  });

  // ── getDailyReview ──

  describe("getDailyReview", () => {
    it("returns daily review response", async () => {
      const mockReview = {
        review_id: 777,
        review_url: "https://readwise.io/review/777",
        review_completed: false,
        highlights: [
          {
            id: 1,
            text: "Review highlight",
            note: "",
            title: "Source Book",
            author: "Author",
            url: null,
            source_url: null,
            source_type: "kindle",
            category: "books",
            location_type: "page",
            location: 42,
            highlighted_at: "2025-01-01T00:00:00Z",
            highlight_url: null,
            image_url: "",
            api_source: null,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers(),
        json: async () => mockReview,
      });

      const result = await getDailyReview();

      expect(result.review_id).toBe(777);
      expect(result.review_url).toBe("https://readwise.io/review/777");
      expect(result.review_completed).toBe(false);
      expect(result.highlights).toHaveLength(1);
      expect(result.highlights[0].text).toBe("Review highlight");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://readwise.io/api/v2/review/",
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
      const err = await listHighlights().catch((e) => e);
      expect(err.name).toBe("ReadwiseTokenError");
    });

    it("throws ReadwiseApiError on 429 with Retry-After", async () => {
      mockFetch.mockResolvedValue({
        status: 429,
        headers: new Headers({ "Retry-After": "45" }),
      });
      await expect(createHighlights({ highlights: [{ text: "test" }] })).rejects.toThrow(/Rate limited.*45/);
    });

    it("throws ReadwiseApiError on 500", async () => {
      mockFetch.mockResolvedValue({
        status: 500,
        headers: new Headers(),
        text: async () => "Internal Server Error",
      });
      await expect(getBook(1)).rejects.toThrow(/500/);
    });

    it("throws ReadwiseTokenError when no token is set", async () => {
      delete process.env.READWISE_TOKEN;
      await expect(listBooks()).rejects.toThrow("READWISE_TOKEN");
    });
  });
});
