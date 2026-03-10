import { z } from "zod";
import { listTabs } from "../safari/tab-list.js";
import { captureDom } from "../safari/dom-capture.js";
import { saveDocument, validateToken } from "../readwise/client.js";
import { errorToToolResult } from "../utils/errors.js";
import { logError } from "../utils/logger.js";
import { isMacOS } from "../utils/platform.js";

export const captureTabsSchema = {
  urls: z
    .array(z.string())
    .optional()
    .describe("Filter: only capture tabs matching these URLs"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to apply to all saved documents"),
  should_clean_html: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether Readwise should clean the HTML"),
  title: z.string().optional().describe("Override titles for all pages"),
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
};

export async function captureTabsHandler(params: {
  urls?: string[];
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
    if (!isMacOS()) {
      return errorToToolResult(
        new Error(
          "capture-tabs requires macOS with Safari. Use capture-page with a url parameter to save individual URLs to Readwise Reader.",
        ),
      );
    }

    const valid = await validateToken();
    if (!valid) {
      return errorToToolResult(
        new Error(
          "Readwise token is invalid. Check your READWISE_TOKEN environment variable.",
        ),
      );
    }

    let tabs = await listTabs();

    if (params.urls && params.urls.length > 0) {
      const urlSet = new Set(params.urls);
      tabs = tabs.filter((tab) => urlSet.has(tab.url));
    }

    if (tabs.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No matching Safari tabs found.",
          },
        ],
      };
    }

    const results: Array<{
      url: string;
      title: string;
      success: boolean;
      message: string;
    }> = [];

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];

      try {
        const dom = await captureDom(tab.windowIndex, tab.tabIndex);

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

        results.push({
          url: dom.url,
          title: dom.title,
          success: true,
          message: result.alreadyExists ? "already existed" : "saved",
        });
      } catch (error) {
        logError(`Failed to capture tab ${tab.url}`, error);
        results.push({
          url: tab.url,
          title: tab.title,
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    let output = `Captured ${succeeded}/${results.length} tabs`;
    if (failed > 0) output += ` (${failed} failed)`;
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
