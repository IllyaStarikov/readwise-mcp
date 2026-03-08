import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/reader-api.js", () => ({
  listDocuments: vi.fn(),
}));

import { listDocuments } from "../../src/readwise/reader-api.js";
import { listDocumentsHandler } from "../../src/tools/list-documents.js";

const mockListDocuments = vi.mocked(listDocuments);

const mockDocument = {
  id: "doc_123",
  url: "https://readwise.io/reader/doc_123",
  source_url: "https://example.com/article",
  title: "Test Article",
  author: "Test Author",
  source: "web",
  category: "article",
  location: "later",
  tags: { tag1: "tag1" },
  site_name: "Example",
  word_count: 1000,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
  published_date: null,
  summary: "A test article",
  image_url: "",
  notes: "",
  parent_id: null,
  reading_progress: 0.5,
};

describe("listDocumentsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted list with document details", async () => {
    mockListDocuments.mockResolvedValue({
      count: 1,
      nextPageCursor: null,
      results: [mockDocument],
    });

    const result = await listDocumentsHandler({});
    const text = result.content[0].text;

    expect(text).toContain("Found 1 document(s)");
    expect(text).toContain("Test Article");
    expect(text).toContain("Test Author");
    expect(text).toContain("doc_123");
    expect(text).toContain("article");
    expect(text).toContain("later");
    expect(text).toContain("https://example.com/article");
    expect(text).toContain("tag1");
    expect(text).toContain("50%");
    expect(text).toContain("2024-01-15T00:00:00Z");
    expect((result as any).isError).toBeUndefined();
  });

  it("handles empty results", async () => {
    mockListDocuments.mockResolvedValue({
      count: 0,
      nextPageCursor: null,
      results: [],
    });

    const result = await listDocumentsHandler({});
    expect(result.content[0].text).toContain("No documents found matching the criteria.");
    expect((result as any).isError).toBeUndefined();
  });

  it("shows pagination cursor when present", async () => {
    mockListDocuments.mockResolvedValue({
      count: 100,
      nextPageCursor: "cursor_abc123",
      results: [mockDocument],
    });

    const result = await listDocumentsHandler({});
    const text = result.content[0].text;

    expect(text).toContain("cursor_abc123");
    expect(text).toContain("showing 1");
  });

  it("returns isError on failure", async () => {
    mockListDocuments.mockRejectedValue(new Error("API request failed"));

    const result = await listDocumentsHandler({});
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("API request failed");
  });
});
