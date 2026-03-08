import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/classic-api.js", () => ({
  listHighlights: vi.fn(),
  getHighlight: vi.fn(),
}));

import { listHighlights, getHighlight } from "../../src/readwise/classic-api.js";
import { listHighlightsHandler } from "../../src/tools/list-highlights.js";

const mockListHighlights = vi.mocked(listHighlights);
const mockGetHighlight = vi.mocked(getHighlight);

const sampleHighlight = {
  id: 1,
  text: "Test highlight text",
  note: "a note",
  location: 10,
  location_type: "page",
  url: null,
  color: "yellow",
  updated: "2024-01-01",
  book_id: 42,
  tags: [{ id: 1, name: "favorite" }],
};

describe("listHighlightsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated highlight list", async () => {
    mockListHighlights.mockResolvedValue({
      count: 2,
      next: "https://readwise.io/api/v2/highlights/?page=2",
      previous: null,
      results: [sampleHighlight, { ...sampleHighlight, id: 2, text: "Second highlight" }],
    });

    const result = await listHighlightsHandler({ page_size: 20 });

    expect(result.content[0].text).toContain("Found 2 highlight(s)");
    expect(result.content[0].text).toContain("more pages available");
    expect(result.content[0].text).toContain("ID: 1");
    expect(result.content[0].text).toContain("ID: 2");
    expect(result.content[0].text).toContain("Tags: favorite");
  });

  it("gets single highlight by ID", async () => {
    mockGetHighlight.mockResolvedValue(sampleHighlight);

    const result = await listHighlightsHandler({ id: 1 });

    expect(mockGetHighlight).toHaveBeenCalledWith(1);
    expect(result.content[0].text).toContain("ID: 1");
    expect(result.content[0].text).toContain("Book ID: 42");
    expect(result.content[0].text).toContain("Test highlight text");
  });

  it("handles empty results", async () => {
    mockListHighlights.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    const result = await listHighlightsHandler({});

    expect(result.content[0].text).toContain("No highlights found.");
  });

  it("returns isError on failure", async () => {
    mockListHighlights.mockRejectedValue(new Error("Network error"));

    const result = await listHighlightsHandler({});

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Network error");
  });
});
