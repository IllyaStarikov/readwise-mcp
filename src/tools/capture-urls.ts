import { z } from "zod";
import { openAndCaptureDom } from "../safari/dom-capture.js";
import { saveDocument, validateToken } from "../readwise/client.js";
import { errorToToolResult } from "../utils/errors.js";
import { logError } from "../utils/logger.js";
import { isMacOS } from "../utils/platform.js";

export const captureUrlsSchema = {
  urls: z
    .array(z.string().url())
    .min(1)
    .describe("URLs to capture and save to Readwise Reader"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to apply to all saved documents"),
  should_clean_html: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether Readwise should clean the HTML"),
  author: z.string().optional().describe("Set the author for all pages"),
  summary: z.string().optional().describe("Set a summary for all pages"),
  location: z
    .enum(["new", "later", "shortlist", "archive", "feed"])
    .optional()
    .default("new")
    .describe("Where to place documents in Reader"),
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
  notes: z.string().optional().describe("Notes to attach to all documents"),
  closeAfterCapture: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Close each Safari tab after capturing (macOS only, ignored on other platforms)",
    ),
};

export async function captureUrlsHandler(params: {
  urls: string[];
  tags?: string[];
  should_clean_html?: boolean;
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
  closeAfterCapture?: boolean;
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

    const results: Array<{
      url: string;
      title: string;
      success: boolean;
      message: string;
    }> = [];

    for (const url of params.urls) {
      try {
        if (isMacOS()) {
          const dom = await openAndCaptureDom(url, {
            closeAfterCapture: params.closeAfterCapture,
          });

          const result = await saveDocument({
            url: dom.url,
            html: dom.html,
            title: dom.title,
            author: params.author,
            summary: params.summary,
            tags: params.tags,
            should_clean_html: params.should_clean_html,
            location: params.location,
            category: params.category,
            notes: params.notes,
          });

          results.push({
            url: dom.url,
            title: dom.title,
            success: true,
            message: result.alreadyExists ? "already existed" : "saved",
          });
        } else {
          const result = await saveDocument({
            url,
            author: params.author,
            summary: params.summary,
            tags: params.tags,
            should_clean_html: params.should_clean_html,
            location: params.location,
            category: params.category,
            notes: params.notes,
          });

          results.push({
            url,
            title: "(Readwise will extract)",
            success: true,
            message: result.alreadyExists
              ? "already existed"
              : "saved (direct — Readwise will fetch content)",
          });
        }
      } catch (error) {
        logError(`Failed to capture URL ${url}`, error);
        results.push({
          url,
          title: url,
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    let output = `Captured ${succeeded}/${results.length} URLs`;
    if (failed > 0) output += ` (${failed} failed)`;
    if (!isMacOS()) output += " (direct save — Safari unavailable)";
    output += "\n\n";

    for (const r of results) {
      const icon = r.success ? "[OK]" : "[FAIL]";
      output += `${icon} ${r.title}\n    ${r.url}\n    ${r.message}\n\n`;
    }

    return {
      content: [{ type: "text" as const, text: output.trimEnd() }],
      isError: failed > 0 && succeeded === 0 ? (true as const) : undefined,
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
