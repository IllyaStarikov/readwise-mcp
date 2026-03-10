import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { validateToken } from "../src/readwise/reader-api.js";
import {
  saveDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  bulkUpdateDocuments,
  listReaderTags,
} from "../src/readwise/reader-api.js";
import {
  createHighlights,
  getHighlight,
  listHighlights,
  updateHighlight,
  deleteHighlight,
  listBooks,
  getBook,
  exportHighlights,
  getDailyReview,
} from "../src/readwise/classic-api.js";
import { listDocumentsHandler } from "../src/tools/list-documents.js";
import { updateDocumentHandler } from "../src/tools/update-document.js";
import { bulkUpdateDocumentsHandler } from "../src/tools/bulk-update-documents.js";
import { listTagsHandler } from "../src/tools/list-tags.js";
import { createHighlightsHandler } from "../src/tools/create-highlights.js";
import { listHighlightsHandler } from "../src/tools/list-highlights.js";
import { manageHighlightHandler } from "../src/tools/manage-highlight.js";
import { listBooksHandler } from "../src/tools/list-books.js";
import { exportHighlightsHandler } from "../src/tools/export-highlights.js";
import { dailyReviewHandler } from "../src/tools/daily-review.js";
import { checkSetupHandler } from "../src/tools/check-setup.js";
import { listTabsHandler } from "../src/tools/list-tabs.js";
import { capturePageHandler } from "../src/tools/capture-page.js";
import { captureUrlsHandler } from "../src/tools/capture-urls.js";

// ── Constants & shared state ──

const READWISE_TOKEN = process.env.READWISE_TOKEN;
const TEST_RUN_ID = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const TEST_TITLE = `[SMOKE TEST] ${TEST_RUN_ID}`;
const TEST_URL = `https://example.com/smoke-test/${TEST_RUN_ID}`;
const TEST_HTML = `<html><body><h1>${TEST_TITLE}</h1><p>Smoke test content.</p></body></html>`;
const TEST_TAG = `smoke-test-${TEST_RUN_ID}`;

let createdDocumentId: string;
let createdDocumentId2: string;
const createdHighlightIds: number[] = [];
let createdBookId: number;

// Snapshot of initial state for post-cleanup verification
let initialDocumentIds: string[] = [];
let initialTagNames: string[] = [];

const IS_MACOS = process.platform === "darwin";

function rateLimitDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1500));
}

function getToolText(result: { content: Array<{ type: string; text: string }> }): string {
  return result.content[0].text;
}

// ── Smoke Tests ──

describe.skipIf(!READWISE_TOKEN)("Smoke Tests", { timeout: 120_000 }, () => {
  beforeAll(async () => {
    // Snapshot initial state
    const docsResult = await listDocuments({});
    initialDocumentIds = docsResult.results.map((d) => d.id);
    await rateLimitDelay();
    const tags = await listReaderTags();
    initialTagNames = tags.map((t) => t.name);
  });

  afterAll(async () => {
    // Cleanup: delete all created highlights
    for (const id of createdHighlightIds) {
      try {
        await deleteHighlight(id);
        await rateLimitDelay();
      } catch {
        // Best-effort cleanup
      }
    }

    // Cleanup: delete all created documents
    for (const id of [createdDocumentId, createdDocumentId2]) {
      if (!id) continue;
      try {
        await deleteDocument(id);
        await rateLimitDelay();
      } catch {
        // Best-effort cleanup
      }
    }

    // Verify: no test documents remain
    await rateLimitDelay();
    const docsAfter = await listDocuments({});
    const testDocsRemaining = docsAfter.results.filter((d) =>
      d.title?.includes(TEST_RUN_ID),
    );
    if (testDocsRemaining.length > 0) {
      console.warn(
        `WARNING: ${testDocsRemaining.length} test document(s) not cleaned up`,
      );
    }

    // Verify: original documents still exist
    const currentDocIds = docsAfter.results.map((d) => d.id);
    for (const id of initialDocumentIds) {
      if (!currentDocIds.includes(id)) {
        console.warn(`WARNING: Original document ${id} missing after cleanup`);
      }
    }

    // Verify: original tags still exist
    await rateLimitDelay();
    const tagsAfter = await listReaderTags();
    const currentTagNames = tagsAfter.map((t) => t.name);
    for (const name of initialTagNames) {
      if (!currentTagNames.includes(name)) {
        console.warn(`WARNING: Original tag "${name}" missing after cleanup`);
      }
    }
  }, 60_000);

  // ── Auth ──

  describe("Auth", () => {
    it("validateToken() with valid token returns true", async () => {
      const result = await validateToken();
      expect(result).toBe(true);
    });

    it("validateToken() with invalid token returns false", async () => {
      await rateLimitDelay();
      const result = await validateToken("invalid_token_xyz");
      expect(result).toBe(false);
    });
  });

  // ── Reader v3 API - Document Lifecycle ──

  describe("Reader v3 API - Document Lifecycle", () => {
    it("saveDocument creates doc 1", async () => {
      await rateLimitDelay();
      const result = await saveDocument({
        url: TEST_URL,
        html: TEST_HTML,
        title: TEST_TITLE,
        tags: [TEST_TAG],
        location: "new",
      });
      expect(result.id).toBeTruthy();
      expect(result.alreadyExists).toBe(false);
      createdDocumentId = result.id;
    });

    it("saveDocument same URL+html returns alreadyExists=true", async () => {
      await rateLimitDelay();
      const result = await saveDocument({
        url: TEST_URL,
        html: TEST_HTML,
        title: TEST_TITLE,
      });
      expect(result.alreadyExists).toBe(true);
      expect(result.id).toBe(createdDocumentId);
    });

    it("saveDocument creates doc 2 for bulk testing", async () => {
      await rateLimitDelay();
      const result = await saveDocument({
        url: `${TEST_URL}-2`,
        html: `<html><body><h1>${TEST_TITLE} #2</h1></body></html>`,
        title: `${TEST_TITLE} #2`,
        location: "new",
      });
      expect(result.id).toBeTruthy();
      expect(result.alreadyExists).toBe(false);
      createdDocumentId2 = result.id;
    });

    it("listDocuments finds doc 1 by ID", async () => {
      await rateLimitDelay();
      const result = await listDocuments({ id: createdDocumentId });
      expect(result.results.length).toBe(1);
      expect(result.results[0].id).toBe(createdDocumentId);
      expect(result.results[0].title).toBe(TEST_TITLE);
    });

    it("updateDocument modifies title and location", async () => {
      await rateLimitDelay();
      const updated = await updateDocument({
        document_id: createdDocumentId,
        title: `${TEST_TITLE} (updated)`,
        location: "later",
      });
      expect(updated.id).toBe(createdDocumentId);
    });

    it("listDocuments verifies update persisted", async () => {
      await rateLimitDelay();
      const result = await listDocuments({ id: createdDocumentId });
      expect(result.results[0].title).toBe(`${TEST_TITLE} (updated)`);
      expect(result.results[0].location).toBe("later");
    });

    it("bulkUpdateDocuments updates both docs", async () => {
      await rateLimitDelay();
      await bulkUpdateDocuments([
        { document_id: createdDocumentId, location: "archive" },
        { document_id: createdDocumentId2, location: "archive" },
      ]);
    });

    it("listDocuments verifies bulk update", async () => {
      await rateLimitDelay();
      const r1 = await listDocuments({ id: createdDocumentId });
      expect(r1.results[0].location).toBe("archive");

      await rateLimitDelay();
      const r2 = await listDocuments({ id: createdDocumentId2 });
      expect(r2.results[0].location).toBe("archive");
    });

    it("listReaderTags finds test tag", async () => {
      await rateLimitDelay();
      const tags = await listReaderTags();
      expect(Array.isArray(tags)).toBe(true);
      const testTag = tags.find((t) => t.name === TEST_TAG);
      expect(testTag).toBeDefined();
      expect(testTag!.name).toBe(TEST_TAG);
    });
  });

  // ── Classic v2 API - Highlights Lifecycle ──

  describe("Classic v2 API - Highlights Lifecycle", () => {
    it("createHighlights creates 2 highlights", async () => {
      await rateLimitDelay();
      const results = await createHighlights({
        highlights: [
          {
            text: `${TEST_RUN_ID} highlight one`,
            title: TEST_TITLE,
            author: "Smoke Test",
            source_url: TEST_URL,
            category: "articles",
            note: "First smoke test highlight",
          },
          {
            text: `${TEST_RUN_ID} highlight two`,
            title: TEST_TITLE,
            author: "Smoke Test",
            source_url: TEST_URL,
            category: "articles",
            note: "Second smoke test highlight",
          },
        ],
      });
      // API returns book-grouped results with modified_highlights
      expect(results.length).toBeGreaterThanOrEqual(1);
      const book = results[0];
      expect(book.id).toBeGreaterThan(0);
      expect(book.modified_highlights.length).toBe(2);
      createdBookId = book.id;
      createdHighlightIds.push(...book.modified_highlights);
    });

    it("getHighlight retrieves by ID", async () => {
      await rateLimitDelay();
      const h = await getHighlight(createdHighlightIds[0]);
      expect(h.id).toBe(createdHighlightIds[0]);
      expect(h.text).toContain(TEST_RUN_ID);
    });

    it("listHighlights filters by book_id", async () => {
      await rateLimitDelay();
      const result = await listHighlights({ book_id: createdBookId });
      expect(result.count).toBeGreaterThanOrEqual(2);
      const ids = result.results.map((h) => h.id);
      expect(ids).toContain(createdHighlightIds[0]);
      expect(ids).toContain(createdHighlightIds[1]);
    });

    it("updateHighlight modifies text and note", async () => {
      await rateLimitDelay();
      const updated = await updateHighlight(createdHighlightIds[0], {
        text: `${TEST_RUN_ID} highlight one (updated)`,
        note: "Updated note",
      });
      expect(updated.text).toContain("(updated)");
      expect(updated.note).toBe("Updated note");
    });

    it("getHighlight verifies update", async () => {
      await rateLimitDelay();
      const h = await getHighlight(createdHighlightIds[0]);
      expect(h.text).toContain("(updated)");
      expect(h.note).toBe("Updated note");
    });

    it("listBooks finds test book", async () => {
      await rateLimitDelay();
      const result = await listBooks({ page_size: 100 });
      const testBook = result.results.find((b) => b.id === createdBookId);
      expect(testBook).toBeDefined();
      expect(testBook!.title).toBe(TEST_TITLE);
    });

    it("getBook retrieves by ID", async () => {
      await rateLimitDelay();
      const book = await getBook(createdBookId);
      expect(book.id).toBe(createdBookId);
      expect(book.title).toBe(TEST_TITLE);
      expect(book.num_highlights).toBeGreaterThanOrEqual(2);
    });

    it("exportHighlights exports by book ID", async () => {
      await rateLimitDelay();
      const result = await exportHighlights({ ids: [createdBookId] });
      expect(result.results.length).toBeGreaterThanOrEqual(1);
      const testBook = result.results.find(
        (b) => b.user_book_id === createdBookId,
      );
      expect(testBook).toBeDefined();
      expect(testBook!.highlights.length).toBeGreaterThanOrEqual(2);
    });

    it("getDailyReview returns valid structure", async () => {
      await rateLimitDelay();
      const review = await getDailyReview();
      expect(review).toHaveProperty("review_id");
      expect(review).toHaveProperty("review_url");
      expect(review).toHaveProperty("review_completed");
      expect(review).toHaveProperty("highlights");
      expect(Array.isArray(review.highlights)).toBe(true);
    });
  });

  // ── Tool Handlers - Reader v3 ──

  describe("Tool Handlers - Reader v3", () => {
    it("listDocumentsHandler returns formatted text", async () => {
      await rateLimitDelay();
      const result = await listDocumentsHandler({ id: createdDocumentId });
      const text = getToolText(result);
      expect(text).toContain("document(s)");
      expect(text).toContain(createdDocumentId);
    });

    it("updateDocumentHandler returns success message", async () => {
      await rateLimitDelay();
      const result = await updateDocumentHandler({
        document_id: createdDocumentId,
        title: `${TEST_TITLE} (handler update)`,
      });
      const text = getToolText(result);
      expect(text).toContain("Document updated successfully");
      expect(text).toContain("handler update");
    });

    it("bulkUpdateDocumentsHandler returns success count", async () => {
      await rateLimitDelay();
      const result = await bulkUpdateDocumentsHandler({
        updates: [
          { document_id: createdDocumentId, location: "later" },
          { document_id: createdDocumentId2, location: "later" },
        ],
      });
      const text = getToolText(result);
      expect(text).toContain("Successfully updated 2 document(s)");
    });

    it("listTagsHandler returns tag list", async () => {
      await rateLimitDelay();
      const result = await listTagsHandler();
      const text = getToolText(result);
      expect(text).toContain("tag(s)");
      expect(text).toContain("- ");
    });
  });

  // ── Tool Handlers - Classic v2 ──

  describe("Tool Handlers - Classic v2", () => {
    it("createHighlightsHandler creates and returns formatted output", async () => {
      await rateLimitDelay();
      const result = await createHighlightsHandler({
        highlights: [
          {
            text: `${TEST_RUN_ID} handler highlight`,
            title: `${TEST_TITLE} (handler)`,
            author: "Smoke Test Handler",
            category: "articles",
          },
        ],
      });
      const text = getToolText(result);
      expect(text).toContain("Created 1 highlight(s)");
      expect(text).toContain("Book ID:");
      expect(text).toContain("Highlight IDs:");

      // Parse highlight IDs for cleanup
      const match = text.match(/Highlight IDs:\s+([\d, ]+)/);
      if (match) {
        const ids = match[1].split(",").map((s) => Number(s.trim()));
        createdHighlightIds.push(...ids);
      }
    });

    it("listHighlightsHandler lists by book_id", async () => {
      await rateLimitDelay();
      const result = await listHighlightsHandler({ book_id: createdBookId });
      const text = getToolText(result);
      expect(text).toContain("highlight(s)");
      expect(text).toContain("ID:");
    });

    it("listHighlightsHandler gets by specific ID", async () => {
      await rateLimitDelay();
      const result = await listHighlightsHandler({
        id: createdHighlightIds[0],
      });
      const text = getToolText(result);
      expect(text).toContain(`ID: ${createdHighlightIds[0]}`);
    });

    it("manageHighlightHandler updates a highlight", async () => {
      await rateLimitDelay();
      const result = await manageHighlightHandler({
        id: createdHighlightIds[0],
        action: "update",
        note: "Handler-updated note",
      });
      const text = getToolText(result);
      expect(text).toContain("updated successfully");
      expect(text).toContain("Handler-updated note");
    });

    it("listBooksHandler lists all books", async () => {
      await rateLimitDelay();
      const result = await listBooksHandler({});
      const text = getToolText(result);
      expect(text).toContain("book(s)");
      expect(text).toContain("ID:");
    });

    it("listBooksHandler gets by specific ID", async () => {
      await rateLimitDelay();
      const result = await listBooksHandler({ id: createdBookId });
      const text = getToolText(result);
      expect(text).toContain(`ID: ${createdBookId}`);
      expect(text).toContain(TEST_TITLE);
    });

    it("exportHighlightsHandler returns export format", async () => {
      await rateLimitDelay();
      const result = await exportHighlightsHandler({
        ids: [createdBookId],
      });
      const text = getToolText(result);
      expect(text).toContain("Exported");
      expect(text).toContain("book(s) with highlights");
      expect(text).toContain("Highlights (");
    });

    it("dailyReviewHandler returns response format", async () => {
      await rateLimitDelay();
      const result = await dailyReviewHandler();
      const text = getToolText(result);
      expect(
        text.includes("Daily Review") ||
          text.includes("No highlights in today's daily review"),
      ).toBe(true);
    });
  });

  // ── Safari Tools ──

  describe.skipIf(!IS_MACOS)("Safari Tools", () => {
    it("checkSetupHandler returns diagnostics format", async () => {
      await rateLimitDelay();
      const result = await checkSetupHandler();
      const text = getToolText(result);
      expect(text).toContain("Safari-Readwise MCP Setup Diagnostics");
      expect(text).toContain("Readwise Token");
      expect(text).toMatch(/\[(OK|FAIL)\]/);
    });

    it("listTabsHandler returns response format", async () => {
      await rateLimitDelay();
      const result = await listTabsHandler();
      const text = getToolText(result);
      expect(
        text.includes("Window") || text.includes("No Safari tabs are open"),
      ).toBe(true);
    });

    it("capturePageHandler with url opens, captures, and saves", async () => {
      await rateLimitDelay();
      const result = await capturePageHandler({
        url: "https://example.com",
        closeAfterCapture: true,
        location: "new",
        tags: [TEST_TAG],
      });
      const text = getToolText(result);
      expect(text).toContain("Readwise Reader");
      expect(text).toContain("Document ID:");

      // Cleanup created document
      const idMatch = text.match(/Document ID:\s*(\S+)/);
      if (idMatch) {
        await rateLimitDelay();
        await deleteDocument(idMatch[1]);
      }
    });

    it("captureUrlsHandler captures multiple URLs", async () => {
      await rateLimitDelay();
      const result = await captureUrlsHandler({
        urls: ["https://example.com", "https://example.org"],
        closeAfterCapture: true,
        location: "new",
        tags: [TEST_TAG],
      });
      const text = getToolText(result);
      expect(text).toContain("Captured");
      expect(text).toContain("URLs");
      expect(text).toContain("[OK]");
    });
  });
});
