// Barrel re-exports for backward compatibility.
// Shared helpers live in shared.ts; API methods in reader-api.ts and classic-api.ts.

export { getToken, handleApiResponse } from "./shared.js";
export { validateToken, saveDocument } from "./reader-api.js";
export type { SaveDocumentParams, SaveDocumentResponse } from "./types.js";
