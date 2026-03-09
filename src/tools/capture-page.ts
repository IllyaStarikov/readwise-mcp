import { z } from "zod";
import { captureDom, openAndCaptureDom } from "../safari/dom-capture.js";
import { saveDocument, validateToken } from "../readwise/client.js";
import { errorToToolResult } from "../utils/errors.js";

export const capturePageSchema = {
  url: z
    .string()
    .url()
    .optional()
    .describe(
      "URL to open in Safari and capture. If omitted, captures the current active tab.",
    ),
  directSave: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Save URL directly to Readwise without Safari DOM capture. Readwise will fetch the content itself. Requires url parameter.",
    ),
  closeAfterCapture: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Close the Safari tab after capturing (only applies when url is provided)",
    ),
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
    .default("new")
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
  url?: string;
  directSave?: boolean;
  closeAfterCapture?: boolean;
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

    if (params.directSave) {
      if (!params.url) {
        return errorToToolResult(
          new Error("directSave requires a url parameter."),
        );
      }

      const result = await saveDocument({
        url: params.url,
        title: params.title,
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
      output += `Title: ${params.title ?? "(Readwise will extract)"}\n`;
      output += `URL: ${params.url}\n`;
      output += `Readwise URL: ${result.url}\n`;
      output += `Document ID: ${result.id}\n`;
      if (params.tags?.length)
        output += `Tags: ${params.tags.join(", ")}\n`;

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }

    const dom = params.url
      ? await openAndCaptureDom(params.url, {
          closeAfterCapture: params.closeAfterCapture,
        })
      : await captureDom();

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
