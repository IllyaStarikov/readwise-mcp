import { z } from "zod";
import { captureDom } from "../safari/dom-capture.js";
import { saveDocument } from "../readwise/client.js";
import { validateToken } from "../readwise/client.js";
import { errorToToolResult } from "../utils/errors.js";

export const capturePageSchema = {
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to apply to the saved document"),
  should_clean_html: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether Readwise should clean the HTML"),
  title: z.string().optional().describe("Override the page title"),
  author: z.string().optional().describe("Set the author"),
  summary: z.string().optional().describe("Set a summary"),
  location: z
    .enum(["new", "later", "shortlist", "archive", "feed"])
    .optional()
    .describe("Where to place the document in Reader"),
  category: z
    .enum([
      "article",
      "email",
      "rss",
      "highlight",
      "note",
      "pdf",
      "epub",
      "tweet",
      "video",
    ])
    .optional()
    .describe("Document category"),
  notes: z.string().optional().describe("Notes to attach to the document"),
};

export async function capturePageHandler(params: {
  tags?: string[];
  should_clean_html?: boolean;
  title?: string;
  author?: string;
  summary?: string;
  location?: "new" | "later" | "shortlist" | "archive" | "feed";
  category?:
    | "article"
    | "email"
    | "rss"
    | "highlight"
    | "note"
    | "pdf"
    | "epub"
    | "tweet"
    | "video";
  notes?: string;
}) {
  try {
    const valid = await validateToken();
    if (!valid) {
      return errorToToolResult(
        new Error(
          "Readwise token is invalid. Check your READWISE_TOKEN environment variable.",
        ),
      );
    }

    const dom = await captureDom();

    const result = await saveDocument({
      url: dom.url,
      html: dom.html,
      title: params.title ?? dom.title,
      author: params.author,
      summary: params.summary,
      tags: params.tags,
      should_clean_html: params.should_clean_html,
      location: params.location,
      category: params.category,
      notes: params.notes,
    });

    const status = result.alreadyExists
      ? "Already existed in Readwise Reader (content not updated)"
      : "Saved to Readwise Reader";

    let output = `${status}\n\n`;
    output += `Title: ${params.title ?? dom.title}\n`;
    output += `URL: ${dom.url}\n`;
    output += `Readwise URL: ${result.url}\n`;
    output += `Document ID: ${result.id}\n`;
    if (params.tags?.length)
      output += `Tags: ${params.tags.join(", ")}\n`;

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
