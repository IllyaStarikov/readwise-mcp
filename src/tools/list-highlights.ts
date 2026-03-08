import { z } from "zod";
import { listHighlights, getHighlight } from "../readwise/classic-api.js";
import { errorToToolResult } from "../utils/errors.js";
import type { HighlightResult } from "../readwise/classic-types.js";

export const listHighlightsSchema = {
  id: z.number().optional().describe("Get a specific highlight by ID"),
  book_id: z.number().optional().describe("Filter highlights by book ID"),
  page_size: z
    .number()
    .optional()
    .default(20)
    .describe("Number of results per page (default 20)"),
  page: z.number().optional().describe("Page number for pagination"),
  updatedAfter: z
    .string()
    .optional()
    .describe("ISO date — only highlights updated after this date"),
};

function formatHighlight(h: HighlightResult, index: number): string {
  let out = `${index}. ID: ${h.id} | Book ID: ${h.book_id}\n`;
  out += `   "${h.text.slice(0, 150)}${h.text.length > 150 ? "..." : ""}"\n`;
  if (h.note) out += `   Note: ${h.note}\n`;
  if (h.location) out += `   Location: ${h.location} (${h.location_type})\n`;
  if (h.tags.length > 0) out += `   Tags: ${h.tags.map((t) => t.name).join(", ")}\n`;
  out += `   Updated: ${h.updated}`;
  return out;
}

export async function listHighlightsHandler(params: {
  id?: number;
  book_id?: number;
  page_size?: number;
  page?: number;
  updatedAfter?: string;
}) {
  try {
    if (params.id) {
      const h = await getHighlight(params.id);
      const output = formatHighlight(h, 1);
      return {
        content: [{ type: "text" as const, text: output }],
      };
    }

    const result = await listHighlights({
      book_id: params.book_id,
      page_size: params.page_size,
      page: params.page,
      updatedAfter: params.updatedAfter,
    });

    if (result.results.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No highlights found." }],
      };
    }

    const hasMore = result.next !== null;
    let output = `Found ${result.count} highlight(s)`;
    if (hasMore) output += ` (showing ${result.results.length}, more pages available)`;
    output += "\n\n";

    output += result.results.map((h, i) => formatHighlight(h, i + 1)).join("\n\n");

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
