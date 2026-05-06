import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/reader-api.js", () => ({
  deleteDocument: vi.fn(),
}));

import { deleteDocument } from "../../src/readwise/reader-api.js";
import { deleteDocumentHandler } from "../../src/tools/delete-document.js";
import { ReadwiseApiError, ReadwiseTokenError } from "../../src/utils/errors.js";

const mockDeleteDocument = vi.mocked(deleteDocument);

describe("deleteDocumentHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deletion confirmation with document ID", async () => {
    mockDeleteDocument.mockResolvedValue(undefined);

    const result = await deleteDocumentHandler({ document_id: "doc_123" });

    expect(result.content[0].text).toContain("doc_123");
    expect(result.content[0].text).toContain("deleted successfully");
    expect((result as any).isError).toBeUndefined();
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc_123");
  });

  it("returns isError on failure", async () => {
    mockDeleteDocument.mockRejectedValue(new Error("Permission denied"));

    const result = await deleteDocumentHandler({ document_id: "doc_123" });
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Permission denied");
  });

  it("surfaces ReadwiseApiError 404 when the document does not exist", async () => {
    mockDeleteDocument.mockRejectedValue(
      new ReadwiseApiError(
        "delete document: Readwise API returned 404: not found",
        404,
      ),
    );

    const result = await deleteDocumentHandler({ document_id: "missing" });
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("404");
    expect(result.content[0].text).toContain("not found");
  });

  it("surfaces ReadwiseTokenError on 401", async () => {
    mockDeleteDocument.mockRejectedValue(new ReadwiseTokenError());

    const result = await deleteDocumentHandler({ document_id: "doc_123" });
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("READWISE_TOKEN");
  });
});
