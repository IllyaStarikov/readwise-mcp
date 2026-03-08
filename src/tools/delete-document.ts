import { z } from "zod";
import { deleteDocument } from "../readwise/reader-api.js";
import { errorToToolResult } from "../utils/errors.js";

export const deleteDocumentSchema = {
  document_id: z.string().describe("The document ID to delete"),
};

export async function deleteDocumentHandler(params: { document_id: string }) {
  try {
    await deleteDocument(params.document_id);

    return {
      content: [
        {
          type: "text" as const,
          text: `Document ${params.document_id} deleted successfully.`,
        },
      ],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
