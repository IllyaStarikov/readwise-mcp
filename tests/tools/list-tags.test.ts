import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/reader-api.js", () => ({
  listReaderTags: vi.fn(),
}));

import { listReaderTags } from "../../src/readwise/reader-api.js";
import { listTagsHandler } from "../../src/tools/list-tags.js";

const mockListReaderTags = vi.mocked(listReaderTags);

describe("listTagsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted tag list", async () => {
    mockListReaderTags.mockResolvedValue([
      { id: "t1", name: "javascript", type: "manual", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      { id: "t2", name: "reading-list", type: "manual", created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" },
      { id: "t3", name: "ai", type: "manual", created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-03T00:00:00Z" },
    ]);

    const result = await listTagsHandler();
    const text = result.content[0].text;

    expect(text).toContain("Found 3 tag(s)");
    expect(text).toContain("- javascript");
    expect(text).toContain("- reading-list");
    expect(text).toContain("- ai");
    expect((result as any).isError).toBeUndefined();
  });

  it("handles empty tags", async () => {
    mockListReaderTags.mockResolvedValue([]);

    const result = await listTagsHandler();
    expect(result.content[0].text).toContain("No tags found.");
    expect((result as any).isError).toBeUndefined();
  });

  it("returns isError on failure", async () => {
    mockListReaderTags.mockRejectedValue(new Error("Unauthorized"));

    const result = await listTagsHandler();
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Unauthorized");
  });
});
