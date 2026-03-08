// Barrel re-exports for backward compatibility.
// Shared helpers live in shared.ts; API methods in reader-api.ts and classic-api.ts.

export { getToken, handleApiResponse } from "./shared.js";
export { validateToken, saveDocument } from "./reader-api.js";
export {
  createHighlights,
  listHighlights,
  getHighlight,
  updateHighlight,
  deleteHighlight,
  listBooks,
  getBook,
  exportHighlights,
  getDailyReview,
} from "./classic-api.js";
export type { SaveDocumentParams, SaveDocumentResponse } from "./types.js";
export type * from "./classic-types.js";
