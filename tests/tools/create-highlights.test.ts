import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/classic-api.js", () => ({
  createHighlights: vi.fn(),
}));

import { createHighlights } from "../../src/readwise/classic-api.js";
import { createHighlightsHandler } from "../../src/tools/create-highlights.js";

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

  it("returns isError on failure", async () => {
    mockCreateHighlights.mockRejectedValue(new Error("API failure"));

    const result = await createHighlightsHandler({
      highlights: [{ text: "fail" }],
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("API failure");
  });
});
