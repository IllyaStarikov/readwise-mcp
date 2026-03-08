import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/classic-api.js", () => ({
  updateHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
}));

import { updateHighlight, deleteHighlight } from "../../src/readwise/classic-api.js";
import { manageHighlightHandler } from "../../src/tools/manage-highlight.js";

const mockUpdateHighlight = vi.mocked(updateHighlight);
const mockDeleteHighlight = vi.mocked(deleteHighlight);

describe("manageHighlightHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("update action returns updated highlight info", async () => {
    mockUpdateHighlight.mockResolvedValue({
      id: 1,
      text: "Updated text",
      note: "updated note",
      location: 5,
      location_type: "page",
      url: null,
      color: "blue",
      updated: "2024-01-15",
      book_id: 42,
      tags: [],
    });

    const result = await manageHighlightHandler({
      id: 1,
      action: "update",
      text: "Updated text",
      note: "updated note",
    });

    expect(mockUpdateHighlight).toHaveBeenCalledWith(1, {
      text: "Updated text",
      note: "updated note",
      location: undefined,
      color: undefined,
    });
    expect(result.content[0].text).toContain("Highlight 1 updated successfully");
    expect(result.content[0].text).toContain('"Updated text"');
    expect(result.content[0].text).toContain("Note: updated note");
    expect(result.content[0].text).toContain("Book ID: 42");
    expect(result.content[0].text).toContain("Color: blue");
  });

  it("delete action returns confirmation", async () => {
    mockDeleteHighlight.mockResolvedValue(undefined);

    const result = await manageHighlightHandler({
      id: 99,
      action: "delete",
    });

    expect(mockDeleteHighlight).toHaveBeenCalledWith(99);
    expect(result.content[0].text).toContain("Highlight 99 deleted successfully.");
  });

  it("returns isError on failure", async () => {
    mockUpdateHighlight.mockRejectedValue(new Error("Not found"));

    const result = await manageHighlightHandler({
      id: 1,
      action: "update",
      text: "new text",
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Not found");
  });
});
