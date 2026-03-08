import { z } from "zod";
import { createHighlights } from "../readwise/classic-api.js";
import { errorToToolResult } from "../utils/errors.js";

const highlightItemSchema = z.object({
  text: z.string().describe("The highlight text (required)"),
  title: z.string().optional().describe("Book/article title"),
  author: z.string().optional().describe("Author name"),
  source_url: z.string().optional().describe("URL of the source"),
  source_type: z.string().optional().describe("Source type identifier"),
  category: z
    .enum(["books", "articles", "tweets", "podcasts", "supplementals"])
    .optional()
    .describe("Source category"),
  note: z.string().optional().describe("Note attached to the highlight"),
  location: z.number().optional().describe("Location/position in the source"),
  location_type: z
    .enum(["page", "order", "time_offset"])
    .optional()
    .describe("Type of location value"),
  highlighted_at: z.string().optional().describe("When the highlight was made (ISO date)"),
  highlight_url: z.string().optional().describe("Direct URL to the highlight"),
  image_url: z.string().optional().describe("Image URL for the highlight"),
});

export const createHighlightsSchema = {
  highlights: z
    .array(highlightItemSchema)
    .min(1)
    .describe("Array of highlights to create"),
};

export async function createHighlightsHandler(params: {
  highlights: Array<{
    text: string;
    title?: string;
    author?: string;
    source_url?: string;
    source_type?: string;
    category?: "books" | "articles" | "tweets" | "podcasts" | "supplementals";
    note?: string;
    location?: number;
    location_type?: "page" | "order" | "time_offset";
    highlighted_at?: string;
    highlight_url?: string;
    image_url?: string;
  }>;
}) {
  try {
    const results = await createHighlights(params);

    let output = `Created ${results.length} highlight(s)\n\n`;
    for (const h of results) {
      output += `- ID: ${h.id} | Book ID: ${h.book_id}\n`;
      output += `  "${h.text.slice(0, 100)}${h.text.length > 100 ? "..." : ""}"\n`;
      if (h.note) output += `  Note: ${h.note}\n`;
      output += "\n";
    }

    return {
      content: [{ type: "text" as const, text: output.trimEnd() }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
