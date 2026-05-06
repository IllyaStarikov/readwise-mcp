import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/reader-api.js", () => ({
  updateDocument: vi.fn(),
}));

import { updateDocument } from "../../src/readwise/reader-api.js";
import { updateDocumentHandler } from "../../src/tools/update-document.js";
import { ReadwiseApiError, ReadwiseTokenError } from "../../src/utils/errors.js";

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

  it("emits a partial update with only the changed field", async () => {
    mockUpdateDocument.mockResolvedValue({
      id: "doc_42",
      url: "https://readwise.io/reader/doc_42",
    });

    const result = await updateDocumentHandler({
      document_id: "doc_42",
      tags: ["llm", "research"],
    });

    const text = result.content[0].text;
    expect(text).toContain("doc_42");
    expect(text).toContain("Tags: llm, research");
    expect(text).not.toContain("Title:");
    expect(text).not.toContain("Author:");
    expect(text).not.toContain("Category:");
  });

  it("includes seen=false in output (boolean field, not just truthy)", async () => {
    mockUpdateDocument.mockResolvedValue({
      id: "doc_seen",
      url: "https://readwise.io/reader/doc_seen",
    });

    const result = await updateDocumentHandler({
      document_id: "doc_seen",
      seen: false,
    });

    expect(result.content[0].text).toContain("Seen: false");
  });

  it("surfaces ReadwiseApiError on 500", async () => {
    mockUpdateDocument.mockRejectedValue(
      new ReadwiseApiError(
        "update document: Readwise API returned 500: db down",
        500,
      ),
    );

    const result = await updateDocumentHandler({
      document_id: "doc_1",
      title: "x",
    });
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("500");
  });

  it("surfaces ReadwiseTokenError on 401", async () => {
    mockUpdateDocument.mockRejectedValue(new ReadwiseTokenError());

    const result = await updateDocumentHandler({
      document_id: "doc_1",
      title: "x",
    });
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("READWISE_TOKEN");
  });
});
