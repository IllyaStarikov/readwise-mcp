import { z } from "zod";
import { updateHighlight, deleteHighlight } from "../readwise/classic-api.js";
import { errorToToolResult } from "../utils/errors.js";

export const manageHighlightSchema = {
  id: z.number().describe("The highlight ID"),
  action: z.enum(["update", "delete"]).describe("Action to perform"),
  text: z.string().optional().describe("New highlight text (update only)"),
  note: z.string().optional().describe("New note (update only)"),
  location: z.number().optional().describe("New location (update only)"),
  color: z.string().optional().describe("New color (update only)"),
};

export async function manageHighlightHandler(params: {
  id: number;
  action: "update" | "delete";
  text?: string;
  note?: string;
  location?: number;
  color?: string;
}) {
  try {
    if (params.action === "delete") {
      await deleteHighlight(params.id);
      return {
        content: [
          { type: "text" as const, text: `Highlight ${params.id} deleted successfully.` },
        ],
      };
    }

    const updated = await updateHighlight(params.id, {
      text: params.text,
      note: params.note,
      location: params.location,
      color: params.color,
    });

    let output = `Highlight ${params.id} updated successfully\n\n`;
    output += `"${updated.text.slice(0, 150)}${updated.text.length > 150 ? "..." : ""}"\n`;
    if (updated.note) output += `Note: ${updated.note}\n`;
    output += `Book ID: ${updated.book_id} | Color: ${updated.color}`;

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
