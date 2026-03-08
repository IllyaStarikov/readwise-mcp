import { z } from "zod";
import { listDocuments } from "../readwise/reader-api.js";
import { errorToToolResult } from "../utils/errors.js";
import type { ReaderDocument } from "../readwise/types.js";

export const listDocumentsSchema = {
  id: z.string().optional().describe("Filter by specific document ID"),
  updatedAfter: z
    .string()
    .optional()
    .describe("ISO date string — only return documents updated after this date"),
  location: z
    .enum(["new", "later", "shortlist", "archive", "feed"])
    .optional()
    .describe("Filter by document location"),
  category: z
    .enum(["article", "email", "rss", "highlight", "note", "pdf", "epub", "tweet", "video"])
    .optional()
    .describe("Filter by document category"),
  tag: z.string().optional().describe("Filter by tag name"),
  withHtmlContent: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include full HTML content in results (default false)"),
  pageCursor: z.string().optional().describe("Pagination cursor from a previous response"),
};

function formatDocument(doc: ReaderDocument, index: number): string {
  const tags = Object.keys(doc.tags);
  let out = `${index}. "${doc.title}" by ${doc.author || "Unknown"}\n`;
  out += `   ID: ${doc.id} | Category: ${doc.category} | Location: ${doc.location}\n`;
  out += `   URL: ${doc.source_url || doc.url}\n`;
  if (tags.length > 0) out += `   Tags: ${tags.join(", ")}\n`;
  if (doc.reading_progress > 0) out += `   Progress: ${Math.round(doc.reading_progress * 100)}%\n`;
  out += `   Updated: ${doc.updated_at}`;
  return out;
}

export async function listDocumentsHandler(params: {
  id?: string;
  updatedAfter?: string;
  location?: "new" | "later" | "shortlist" | "archive" | "feed";
  category?: "article" | "email" | "rss" | "highlight" | "note" | "pdf" | "epub" | "tweet" | "video";
  tag?: string;
  withHtmlContent?: boolean;
  pageCursor?: string;
}) {
  try {
    const result = await listDocuments({
      id: params.id,
      updatedAfter: params.updatedAfter,
      location: params.location,
      category: params.category,
      tag: params.tag,
      withHtmlContent: params.withHtmlContent,
      pageCursor: params.pageCursor,
    });

    if (result.results.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No documents found matching the criteria." }],
      };
    }

    let output = `Found ${result.count} document(s)`;
    if (result.nextPageCursor) {
      output += ` (showing ${result.results.length}, next cursor: ${result.nextPageCursor})`;
    }
    output += "\n\n";

    output += result.results.map((doc, i) => formatDocument(doc, i + 1)).join("\n\n");

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
