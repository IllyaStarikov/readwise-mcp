import { z } from "zod";
import { exportHighlights } from "../readwise/classic-api.js";
import { errorToToolResult } from "../utils/errors.js";

export const exportHighlightsSchema = {
  updatedAfter: z
    .string()
    .optional()
    .describe("ISO date — only export highlights updated after this date"),
  ids: z
    .array(z.number())
    .optional()
    .describe("Filter by specific book IDs"),
  pageCursor: z.string().optional().describe("Pagination cursor from a previous response"),
};

export async function exportHighlightsHandler(params: {
  updatedAfter?: string;
  ids?: number[];
  pageCursor?: string;
}) {
  try {
    const result = await exportHighlights(params);

    if (result.results.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No highlights to export." }],
      };
    }

    let output = `Exported ${result.count} book(s) with highlights`;
    if (result.nextPageCursor) {
      output += ` (showing ${result.results.length}, next cursor: ${result.nextPageCursor})`;
    }
    output += "\n\n";

    for (const book of result.results) {
      output += `━ "${book.title}" by ${book.author || "Unknown"}\n`;
      output += `  Book ID: ${book.user_book_id} | Category: ${book.category} | Source: ${book.source}\n`;
      if (book.source_url) output += `  URL: ${book.source_url}\n`;
      output += `  Highlights (${book.highlights.length}):\n\n`;

      for (const h of book.highlights) {
        output += `    - "${h.text.slice(0, 200)}${h.text.length > 200 ? "..." : ""}"\n`;
        if (h.note) output += `      Note: ${h.note}\n`;
        output += `      ID: ${h.id} | Location: ${h.location}\n\n`;
      }
    }

    return {
      content: [{ type: "text" as const, text: output.trimEnd() }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
