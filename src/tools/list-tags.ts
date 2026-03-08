import { listReaderTags } from "../readwise/reader-api.js";
import { errorToToolResult } from "../utils/errors.js";

export const listTagsSchema = {};

export async function listTagsHandler() {
  try {
    const tags = await listReaderTags();

    if (tags.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No tags found." }],
      };
    }

    let output = `Found ${tags.length} tag(s)\n\n`;
    output += tags.map((t) => `- ${t.name}`).join("\n");

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
