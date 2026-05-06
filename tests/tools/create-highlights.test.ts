import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/classic-api.js", () => ({
  createHighlights: vi.fn(),
}));

import { createHighlights } from "../../src/readwise/classic-api.js";
import { createHighlightsHandler } from "../../src/tools/create-highlights.js";
import { ReadwiseApiError, ReadwiseTokenError } from "../../src/utils/errors.js";

const mockCreateHighlights = vi.mocked(createHighlights);

describe("createHighlightsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted list of created highlights with IDs", async () => {
    mockCreateHighlights.mockResolvedValue([
      {
        id: 42,
        title: "Test Book",
        author: "Author",
        category: "articles",
        source: "api_article",
        num_highlights: 1,
        modified_highlights: [1],
        cover_image_url: "",
        highlights_url: "https://readwise.io/bookreview/42",
        source_url: null,
        asin: null,
        tags: [],
        document_note: "",
      },
    ]);

    const result = await createHighlightsHandler({
      highlights: [{ text: "Test highlight", note: "note" }],
    });

    expect(result.content[0].text).toContain("Created 1 highlight(s)");
    expect(result.content[0].text).toContain("Book ID: 42");
    expect(result.content[0].text).toContain("Highlight IDs: 1");
    expect(result.content[0].text).toContain('"Test Book"');
  });

  it("aggregates highlights across multiple books", async () => {
    mockCreateHighlights.mockResolvedValue([
      {
        id: 1,
        title: "Book One",
        author: "Author A",
        category: "articles",
        source: "api_article",
        num_highlights: 2,
        modified_highlights: [10, 11],
        cover_image_url: "",
        highlights_url: "https://readwise.io/bookreview/1",
        source_url: null,
        asin: null,
        tags: [],
        document_note: "",
      },
      {
        id: 2,
        title: "Book Two",
        author: "",
        category: "articles",
        source: "api_article",
        num_highlights: 1,
        modified_highlights: [12],
        cover_image_url: "",
        highlights_url: "https://readwise.io/bookreview/2",
        source_url: null,
        asin: null,
        tags: [],
        document_note: "",
      },
    ]);

    const result = await createHighlightsHandler({
      highlights: [
        { text: "h1", title: "Book One" },
        { text: "h2", title: "Book One" },
        { text: "h3", title: "Book Two" },
      ],
    });

    const text = result.content[0].text;
    expect(text).toContain("Created 3 highlight(s) in 2 book(s)");
    expect(text).toContain("Book One");
    expect(text).toContain("Book Two");
    expect(text).toContain("by Unknown");
    expect(text).toContain("Highlight IDs: 10, 11");
    expect(text).toContain("Highlight IDs: 12");
  });

  it("returns isError on failure", async () => {
    mockCreateHighlights.mockRejectedValue(new Error("API failure"));

    const result = await createHighlightsHandler({
      highlights: [{ text: "fail" }],
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("API failure");
  });

  it("propagates ReadwiseTokenError messages", async () => {
    mockCreateHighlights.mockRejectedValue(new ReadwiseTokenError());

    const result = await createHighlightsHandler({
      highlights: [{ text: "fail" }],
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("READWISE_TOKEN");
  });

  it("propagates ReadwiseApiError 500 with body detail", async () => {
    mockCreateHighlights.mockRejectedValue(
      new ReadwiseApiError(
        "create highlights: Readwise API returned 500: db down",
        500,
      ),
    );

    const result = await createHighlightsHandler({
      highlights: [{ text: "fail" }],
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("500");
    expect(result.content[0].text).toContain("db down");
  });
});
