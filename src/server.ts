import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listTabsSchema, listTabsHandler } from "./tools/list-tabs.js";
import { checkSetupSchema, checkSetupHandler } from "./tools/check-setup.js";
import {
  capturePageSchema,
  capturePageHandler,
} from "./tools/capture-page.js";
import {
  captureTabsSchema,
  captureTabsHandler,
} from "./tools/capture-tabs.js";
import {
  listDocumentsSchema,
  listDocumentsHandler,
} from "./tools/list-documents.js";
import {
  updateDocumentSchema,
  updateDocumentHandler,
} from "./tools/update-document.js";
import {
  deleteDocumentSchema,
  deleteDocumentHandler,
} from "./tools/delete-document.js";
import {
  bulkUpdateDocumentsSchema,
  bulkUpdateDocumentsHandler,
} from "./tools/bulk-update-documents.js";
import { listTagsSchema, listTagsHandler } from "./tools/list-tags.js";
import {
  createHighlightsSchema,
  createHighlightsHandler,
} from "./tools/create-highlights.js";
import {
  listHighlightsSchema,
  listHighlightsHandler,
} from "./tools/list-highlights.js";
import {
  manageHighlightSchema,
  manageHighlightHandler,
} from "./tools/manage-highlight.js";
import { listBooksSchema, listBooksHandler } from "./tools/list-books.js";
import {
  exportHighlightsSchema,
  exportHighlightsHandler,
} from "./tools/export-highlights.js";
import {
  dailyReviewSchema,
  dailyReviewHandler,
} from "./tools/daily-review.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "safari-readwise-mcp",
    version: "1.0.0",
  });

  // ── Safari tools ──

  server.tool(
    "list-tabs",
    "List all open Safari tabs with their URLs and titles",
    listTabsSchema,
    listTabsHandler,
  );

  server.tool(
    "check-setup",
    "Check Safari permissions and Readwise token validity",
    checkSetupSchema,
    checkSetupHandler,
  );

  server.tool(
    "capture-page",
    "Capture the active Safari tab's full DOM content and save it to Readwise Reader",
    capturePageSchema,
    capturePageHandler,
  );

  server.tool(
    "capture-tabs",
    "Capture multiple Safari tabs and save each to Readwise Reader",
    captureTabsSchema,
    captureTabsHandler,
  );

  // ── Reader v3 tools ──

  server.tool(
    "list-documents",
    "Search and list documents in Readwise Reader. Supports filtering by location, category, tag, and date.",
    listDocumentsSchema,
    listDocumentsHandler,
  );

  server.tool(
    "update-document",
    "Update a Reader document's metadata (title, author, location, tags, etc.)",
    updateDocumentSchema,
    updateDocumentHandler,
  );

  server.tool(
    "delete-document",
    "Delete a document from Readwise Reader",
    deleteDocumentSchema,
    deleteDocumentHandler,
  );

  server.tool(
    "bulk-update-documents",
    "Update up to 50 Reader documents at once (location, tags, metadata)",
    bulkUpdateDocumentsSchema,
    bulkUpdateDocumentsHandler,
  );

  server.tool(
    "list-tags",
    "List all tags in Readwise Reader",
    listTagsSchema,
    listTagsHandler,
  );

  // ── Classic v2 tools ──

  server.tool(
    "create-highlights",
    "Create one or more highlights in Readwise with optional book/article metadata",
    createHighlightsSchema,
    createHighlightsHandler,
  );

  server.tool(
    "list-highlights",
    "List or search highlights in Readwise. Filter by book, date, or get a specific highlight by ID.",
    listHighlightsSchema,
    listHighlightsHandler,
  );

  server.tool(
    "manage-highlight",
    "Update or delete a highlight in Readwise",
    manageHighlightSchema,
    manageHighlightHandler,
  );

  server.tool(
    "list-books",
    "List books/sources in Readwise library. Filter by category, source, or get a specific book by ID.",
    listBooksSchema,
    listBooksHandler,
  );

  server.tool(
    "export-highlights",
    "Export highlights with full book metadata, richer than list-highlights. Supports cursor-based pagination.",
    exportHighlightsSchema,
    exportHighlightsHandler,
  );

  server.tool(
    "daily-review",
    "Get today's Readwise daily review highlights",
    dailyReviewSchema,
    dailyReviewHandler,
  );

  return server;
}
