import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/reader-api.js", () => ({
  bulkUpdateDocuments: vi.fn(),
}));

import { bulkUpdateDocuments } from "../../src/readwise/reader-api.js";
import { bulkUpdateDocumentsHandler } from "../../src/tools/bulk-update-documents.js";
import { ReadwiseApiError, ReadwiseTokenError } from "../../src/utils/errors.js";

const mockBulkUpdateDocuments = vi.mocked(bulkUpdateDocuments);

describe("bulkUpdateDocumentsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success count message", async () => {
    mockBulkUpdateDocuments.mockResolvedValue(undefined);

    const updates = [
      { document_id: "doc_1", location: "archive" as const },
      { document_id: "doc_2", location: "archive" as const },
      { document_id: "doc_3", title: "New Title" },
    ];

    const result = await bulkUpdateDocumentsHandler({ updates });

    expect(result.content[0].text).toContain("Successfully updated 3 document(s)");
    expect((result as any).isError).toBeUndefined();
    expect(mockBulkUpdateDocuments).toHaveBeenCalledWith(updates);
  });

  it("returns isError on failure", async () => {
    mockBulkUpdateDocuments.mockRejectedValue(new Error("Rate limited"));

    const result = await bulkUpdateDocumentsHandler({
      updates: [{ document_id: "doc_1", location: "archive" }],
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Rate limited");
  });

  it("propagates ReadwiseTokenError messages", async () => {
    mockBulkUpdateDocuments.mockRejectedValue(new ReadwiseTokenError());

    const result = await bulkUpdateDocumentsHandler({
      updates: [{ document_id: "doc_1", location: "archive" }],
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("READWISE_TOKEN");
  });

  it("propagates ReadwiseApiError messages with status detail", async () => {
    mockBulkUpdateDocuments.mockRejectedValue(
      new ReadwiseApiError("bulk update: Readwise API returned 500: server error", 500),
    );

    const result = await bulkUpdateDocumentsHandler({
      updates: [{ document_id: "doc_1", title: "x" }],
    });

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("500");
    expect(result.content[0].text).toContain("server error");
  });

  it("reports the singular count for a single update", async () => {
    mockBulkUpdateDocuments.mockResolvedValue(undefined);

    const result = await bulkUpdateDocumentsHandler({
      updates: [{ document_id: "doc_1", title: "x" }],
    });

    expect(result.content[0].text).toContain("Successfully updated 1 document(s)");
  });
});
