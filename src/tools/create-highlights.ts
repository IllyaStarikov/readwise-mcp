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

    let totalHighlights = 0;
    for (const book of results) {
      totalHighlights += book.modified_highlights.length;
    }

    let output = `Created ${totalHighlights} highlight(s) in ${results.length} book(s)\n\n`;
    for (const book of results) {
      output += `Book: "${book.title}" by ${book.author || "Unknown"}\n`;
      output += `  Book ID: ${book.id}\n`;
      output += `  Highlight IDs: ${book.modified_highlights.join(", ")}\n`;
      output += "\n";
    }

    return {
      content: [{ type: "text" as const, text: output.trimEnd() }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
