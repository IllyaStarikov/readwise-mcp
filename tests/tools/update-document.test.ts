import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/reader-api.js", () => ({
  updateDocument: vi.fn(),
}));

import { updateDocument } from "../../src/readwise/reader-api.js";
import { updateDocumentHandler } from "../../src/tools/update-document.js";

const mockUpdateDocument = vi.mocked(updateDocument);

describe("updateDocumentHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success message with updated fields from params", async () => {
    mockUpdateDocument.mockResolvedValue({
      id: "doc_123",
      url: "https://readwise.io/reader/doc_123",
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
