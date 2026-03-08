import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/reader-api.js", () => ({
  updateDocument: vi.fn(),
}));

import { updateDocument } from "../../src/readwise/reader-api.js";
import { updateDocumentHandler } from "../../src/tools/update-document.js";

const mockUpdateDocument = vi.mocked(updateDocument);

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

describe("updateDocumentHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success message with updated fields", async () => {
    mockUpdateDocument.mockResolvedValue({
      ...mockDocument,
      title: "Updated Title",
      location: "archive",
    });

    const result = await updateDocumentHandler({
      document_id: "doc_123",
      title: "Updated Title",
      location: "archive",
    });

    const text = result.content[0].text;
    expect(text).toContain("Document updated successfully");
    expect(text).toContain("Updated Title");
    expect(text).toContain("doc_123");
    expect(text).toContain("archive");
    expect(text).toContain("tag1");
    expect((result as any).isError).toBeUndefined();

    expect(mockUpdateDocument).toHaveBeenCalledWith({
      document_id: "doc_123",
      title: "Updated Title",
      location: "archive",
    });
  });

  it("returns isError on failure", async () => {
    mockUpdateDocument.mockRejectedValue(new Error("Document not found"));

    const result = await updateDocumentHandler({ document_id: "bad_id" });
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Document not found");
  });
});
