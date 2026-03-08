import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/classic-api.js", () => ({
  exportHighlights: vi.fn(),
}));

import { exportHighlights } from "../../src/readwise/classic-api.js";
import { exportHighlightsHandler } from "../../src/tools/export-highlights.js";

const mockExportHighlights = vi.mocked(exportHighlights);

describe("exportHighlightsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted export with books and highlights", async () => {
    mockExportHighlights.mockResolvedValue({
      count: 1,
      nextPageCursor: null,
      results: [
        {
          user_book_id: 42,
          title: "Test Book",
          author: "Author",
          readable_title: "Test Book",
          source: "kindle",
          cover_image_url: "",
          unique_url: null,
          category: "books",
          document_note: "",
          readwise_url: "https://readwise.io/bookreview/42",
          source_url: "https://example.com",
          asin: null,
          tags: [],
          highlights: [
            {
              id: 1,
              text: "A great highlight",
              note: "my note",
              location: 10,
              location_type: "page",
              url: null,
              color: "yellow",
              updated: "2024-01-01",
              tags: [],
            },
          ],
        },
      ],
    });

    const result = await exportHighlightsHandler({});

    expect(result.content[0].text).toContain("Exported 1 book(s) with highlights");
    expect(result.content[0].text).toContain('"Test Book" by Author');
    expect(result.content[0].text).toContain("Book ID: 42");
    expect(result.content[0].text).toContain('"A great highlight"');
    expect(result.content[0].text).toContain("Note: my note");
    expect(result.content[0].text).toContain("ID: 1");
    expect(result.content[0].text).toContain("Location: 10");
  });

  it("handles empty export", async () => {
    mockExportHighlights.mockResolvedValue({
      count: 0,
      nextPageCursor: null,
      results: [],
    });

    const result = await exportHighlightsHandler({});

    expect(result.content[0].text).toContain("No highlights to export.");
  });

  it("shows pagination cursor", async () => {
    mockExportHighlights.mockResolvedValue({
      count: 50,
      nextPageCursor: "abc123cursor",
      results: [
        {
          user_book_id: 1,
          title: "Book One",
          author: "Writer",
          readable_title: "Book One",
          source: "api",
          cover_image_url: "",
          unique_url: null,
          category: "articles",
          document_note: "",
          readwise_url: "https://readwise.io/bookreview/1",
          source_url: null,
          asin: null,
          tags: [],
          highlights: [
            {
              id: 10,
              text: "Some text",
              note: "",
              location: 1,
              location_type: "order",
              url: null,
              color: "yellow",
              updated: "2024-01-01",
              tags: [],
            },
          ],
        },
      ],
    });

    const result = await exportHighlightsHandler({});

    expect(result.content[0].text).toContain("next cursor: abc123cursor");
  });

  it("returns isError on failure", async () => {
    mockExportHighlights.mockRejectedValue(new Error("Rate limited"));

    const result = await exportHighlightsHandler({});

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Rate limited");
  });
});
