import { z } from "zod";
import { bulkUpdateDocuments } from "../readwise/reader-api.js";
import { errorToToolResult } from "../utils/errors.js";

const updateItemSchema = z.object({
  document_id: z.string().describe("The document ID to update"),
  title: z.string().optional(),
  author: z.string().optional(),
  summary: z.string().optional(),
  published_date: z.string().optional(),
  image_url: z.string().optional(),
  location: z.enum(["new", "later", "shortlist", "archive", "feed"]).optional(),
  category: z
    .enum(["article", "email", "rss", "highlight", "note", "pdf", "epub", "tweet", "video"])
    .optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  seen: z.boolean().optional(),
});

export const bulkUpdateDocumentsSchema = {
  updates: z
    .array(updateItemSchema)
    .min(1)
    .max(50)
    .describe("Array of document updates (1-50 items). Each must include document_id plus fields to update."),
};

export async function bulkUpdateDocumentsHandler(params: {
  updates: Array<{
    document_id: string;
    title?: string;
    author?: string;
    summary?: string;
    published_date?: string;
    image_url?: string;
    location?: "new" | "later" | "shortlist" | "archive" | "feed";
    category?: "article" | "email" | "rss" | "highlight" | "note" | "pdf" | "epub" | "tweet" | "video";
    tags?: string[];
    notes?: string;
    seen?: boolean;
  }>;
}) {
  try {
    await bulkUpdateDocuments(params.updates);

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully updated ${params.updates.length} document(s).`,
        },
      ],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
