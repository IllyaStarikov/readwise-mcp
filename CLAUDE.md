# Safari-Readwise MCP Server

MCP server for macOS that captures authenticated DOM content from Safari tabs and provides full Readwise library management via 15 tools.

## Quick Reference

```bash
npm run build        # Build with tsup → dist/
npm run dev          # Run with tsx (dev mode)
npm run test         # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run typecheck    # tsc --noEmit
```

## Architecture

```
src/
├── index.ts              # Entry point — stdio transport
├── server.ts             # MCP server — registers all 15 tools
├── readwise/
│   ├── shared.ts         # getToken(), handleApiResponse() — used by both API modules
│   ├── reader-api.ts     # Reader v3 API: auth, save, list/update/delete documents, tags
│   ├── classic-api.ts    # Classic v2 API: highlights CRUD, books, export, daily review
│   ├── client.ts         # Barrel re-exports (backward compat for existing imports)
│   ├── types.ts          # Reader v3 types
│   └── classic-types.ts  # Classic v2 types
├── safari/
│   ├── applescript.ts    # osascript runner with error classification
│   ├── diagnostics.ts    # Permission/setup checks
│   ├── dom-capture.ts    # Captures full DOM via Safari JavaScript bridge
│   └── tab-list.ts       # Lists open Safari tabs via AppleScript
├── tools/                # One file per MCP tool (schema + handler)
│   ├── list-tabs.ts
│   ├── check-setup.ts
│   ├── capture-page.ts
│   ├── capture-tabs.ts
│   ├── list-documents.ts
│   ├── update-document.ts
│   ├── delete-document.ts
│   ├── bulk-update-documents.ts
│   ├── list-tags.ts
│   ├── create-highlights.ts
│   ├── list-highlights.ts
│   ├── manage-highlight.ts
│   ├── list-books.ts
│   ├── export-highlights.ts
│   └── daily-review.ts
└── utils/
    ├── errors.ts         # Error classes + errorToToolResult helper
    ├── logger.ts         # stderr logger
    └── temp-file.ts      # Temp file for large DOM transfers
```

## Key Patterns

- **Tool structure**: Each tool exports `{toolName}Schema` (Zod shape object) and `{toolName}Handler` (async function). Both registered in `server.ts`.
- **Error handling**: All tool handlers wrap logic in try/catch and return `errorToToolResult(error)` on failure. API layer throws `ReadwiseTokenError` (401/missing token) or `ReadwiseApiError` (429/other HTTP errors).
- **API response handling**: `shared.ts:handleApiResponse()` is the single error handler for all API calls. `saveDocument` is the exception — it checks 200/201 itself, then delegates non-2xx to `handleApiResponse`.
- **Pagination**: v3 tools use cursor-based (`pageCursor`/`nextPageCursor`), v2 tools use page-based (`page`/`page_size`, `next`/`previous`).
- **Output format**: All tools return human-readable text. No JSON responses — the text is structured enough for LLMs to parse.
- **Barrel re-exports**: `client.ts` re-exports from `shared.ts`, `reader-api.ts`, and `classic-api.ts` so any function can be imported via `"./readwise/client.js"`.

## Environment

- **READWISE_TOKEN** (required): API token from https://readwise.io/access_token
- macOS only (Safari AppleScript integration)
- Node >= 18 (uses native `fetch`)

## Testing

Tests are in `tests/` mirroring `src/` structure. All API calls are mocked via `vi.fn()` on `global.fetch` or `vi.mock()`. No real API calls in tests.

- 24 test files, 117 tests
- API layer tests verify URL construction, headers, body serialization, and error mapping
- Tool handler tests verify output formatting, empty states, pagination display, and error propagation

## Tools (15 total)

### Safari (4)
| Tool | Description |
|------|-------------|
| `list-tabs` | List open Safari tabs |
| `check-setup` | Diagnostic check (Safari permissions + Readwise token) |
| `capture-page` | Capture active tab DOM → Readwise Reader |
| `capture-tabs` | Capture multiple tabs → Readwise Reader (rate-limited) |

### Reader v3 (5)
| Tool | Description |
|------|-------------|
| `list-documents` | Search/filter documents (location, category, tag, date) |
| `update-document` | Update document metadata |
| `delete-document` | Delete a document |
| `bulk-update-documents` | Update up to 50 documents at once |
| `list-tags` | List all Reader tags |

### Classic v2 (6)
| Tool | Description |
|------|-------------|
| `create-highlights` | Create highlights (batch) with book metadata |
| `list-highlights` | List/get highlights (page-based pagination) |
| `manage-highlight` | Update or delete a highlight |
| `list-books` | List/get books/sources |
| `export-highlights` | Export highlights with full book metadata (cursor pagination) |
| `daily-review` | Get today's daily review highlights |

## Design Decisions & Trade-offs

- **`validateToken()` pre-check in capture tools**: `capture-page` and `capture-tabs` call `validateToken()` before `saveDocument()`. This is an extra network round-trip since `saveDocument` already throws `ReadwiseTokenError` on 401, but it provides a friendlier error message before attempting DOM capture. Kept intentionally.
- **`saveDocument` special 200/201 handling**: Unlike all other API functions that delegate entirely to `handleApiResponse()`, `saveDocument` checks 200 (already exists) and 201 (created) itself, then delegates non-2xx to `handleApiResponse`. This is because it needs to distinguish between the two success statuses to set `alreadyExists`.
- **`list-documents` schema `withHtmlContent` default**: `.optional().default(false)` is technically unnecessary since the API layer treats `undefined` as falsy, but it's harmless and makes the default explicit in the schema.
