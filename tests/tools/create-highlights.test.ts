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
        id: 1,
        text: "Test highlight",
        note: "note",
        location: 0,
        location_type: "order",
        url: null,
        color: "yellow",
        updated: "2024-01-01",
        book_id: 42,
        tags: [],
      },
    ]);

    const result = await createHighlightsHandler({
      highlights: [{ text: "Test highlight", note: "note" }],
    });

    expect(result.content[0].text).toContain("Created 1 highlight(s)");
    expect(result.content[0].text).toContain("ID: 1");
    expect(result.content[0].text).toContain("Book ID: 42");
    expect(result.content[0].text).toContain('"Test highlight"');
    expect(result.content[0].text).toContain("Note: note");
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
