import { z } from "zod";
import { updateDocument } from "../readwise/reader-api.js";
import { errorToToolResult } from "../utils/errors.js";

export const updateDocumentSchema = {
  document_id: z.string().describe("The document ID to update"),
  title: z.string().optional().describe("New title"),
  author: z.string().optional().describe("New author"),
  summary: z.string().optional().describe("New summary"),
  published_date: z.string().optional().describe("Published date (ISO format)"),
  image_url: z.string().optional().describe("Cover image URL"),
  location: z
    .enum(["new", "later", "shortlist", "archive", "feed"])
    .optional()
    .describe("Move document to this location"),
  category: z
    .enum(["article", "email", "rss", "highlight", "note", "pdf", "epub", "tweet", "video"])
    .optional()
    .describe("Document category"),
  tags: z.array(z.string()).optional().describe("Replace tags with these"),
  notes: z.string().optional().describe("Document notes"),
  seen: z.boolean().optional().describe("Mark as seen/unseen"),
};

export async function updateDocumentHandler(params: {
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
}) {
  try {
    const updated = await updateDocument(params);

    let output = `Document updated successfully\n\n`;
    output += `ID: ${updated.id}\n`;

    const changes: string[] = [];
    if (params.title) changes.push(`Title: ${params.title}`);
    if (params.author) changes.push(`Author: ${params.author}`);
    if (params.summary) changes.push(`Summary: ${params.summary}`);
    if (params.location) changes.push(`Location: ${params.location}`);
    if (params.category) changes.push(`Category: ${params.category}`);
    if (params.tags) changes.push(`Tags: ${params.tags.join(", ")}`);
    if (params.notes) changes.push(`Notes: ${params.notes}`);
    if (params.seen !== undefined) changes.push(`Seen: ${params.seen}`);
    if (changes.length > 0) output += changes.join("\n") + "\n";

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
