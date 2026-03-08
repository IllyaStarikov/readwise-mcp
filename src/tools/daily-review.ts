import { getDailyReview } from "../readwise/classic-api.js";
import { errorToToolResult } from "../utils/errors.js";

export const dailyReviewSchema = {};

export async function dailyReviewHandler() {
  try {
    const review = await getDailyReview();

    if (review.highlights.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No highlights in today's daily review." }],
      };
    }

    let output = `Daily Review (${review.highlights.length} highlight(s))\n`;
    output += `Review URL: ${review.review_url}\n`;
    output += `Completed: ${review.review_completed ? "Yes" : "No"}\n\n`;

    for (let i = 0; i < review.highlights.length; i++) {
      const h = review.highlights[i];
      output += `${i + 1}. "${h.text.slice(0, 200)}${h.text.length > 200 ? "..." : ""}"\n`;
      output += `   From: "${h.title}" by ${h.author || "Unknown"}\n`;
      output += `   ID: ${h.id} | Category: ${h.category}\n`;
      if (h.note) output += `   Note: ${h.note}\n`;
      if (h.source_url) output += `   URL: ${h.source_url}\n`;
      output += "\n";
    }

    return {
      content: [{ type: "text" as const, text: output.trimEnd() }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
