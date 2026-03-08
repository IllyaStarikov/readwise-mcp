import { z } from "zod";
import { listBooks, getBook } from "../readwise/classic-api.js";
import { errorToToolResult } from "../utils/errors.js";
import type { BookResult } from "../readwise/classic-types.js";

export const listBooksSchema = {
  id: z.number().optional().describe("Get a specific book by ID"),
  category: z.string().optional().describe("Filter by category (e.g. books, articles, tweets, podcasts)"),
  source: z.string().optional().describe("Filter by source"),
  page_size: z
    .number()
    .optional()
    .default(20)
    .describe("Number of results per page (default 20)"),
  page: z.number().optional().describe("Page number for pagination"),
  updatedAfter: z
    .string()
    .optional()
    .describe("ISO date — only books updated after this date"),
};

function formatBook(b: BookResult, index: number): string {
  let out = `${index}. "${b.title}" by ${b.author || "Unknown"}\n`;
  out += `   ID: ${b.id} | Category: ${b.category} | Source: ${b.source}\n`;
  out += `   Highlights: ${b.num_highlights}`;
  if (b.last_highlight_at) out += ` | Last highlight: ${b.last_highlight_at}`;
  out += "\n";
  if (b.source_url) out += `   URL: ${b.source_url}\n`;
  if (b.tags.length > 0) out += `   Tags: ${b.tags.map((t) => t.name).join(", ")}\n`;
  out += `   Updated: ${b.updated}`;
  return out;
}

export async function listBooksHandler(params: {
  id?: number;
  category?: string;
  source?: string;
  page_size?: number;
  page?: number;
  updatedAfter?: string;
}) {
  try {
    if (params.id) {
      const b = await getBook(params.id);
      const output = formatBook(b, 1);
      return {
        content: [{ type: "text" as const, text: output }],
      };
    }

    const result = await listBooks({
      category: params.category,
      source: params.source,
      page_size: params.page_size,
      page: params.page,
      updatedAfter: params.updatedAfter,
    });

    if (result.results.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No books found." }],
      };
    }

    const hasMore = result.next !== null;
    let output = `Found ${result.count} book(s)`;
    if (hasMore) output += ` (showing ${result.results.length}, more pages available)`;
    output += "\n\n";

    output += result.results.map((b, i) => formatBook(b, i + 1)).join("\n\n");

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
