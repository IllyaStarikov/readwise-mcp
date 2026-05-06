# Safari-Readwise MCP Server

An MCP server that captures authenticated DOM content from Safari tabs (macOS) and provides full Readwise library management. 16 tools covering Safari tab capture, Reader document management, highlights, books, tags, export, and daily review.

On non-macOS platforms, the Safari capture tools that accept a URL (`capture-page`, `capture-urls`) auto-fall back to a direct URL save — Readwise fetches the content itself. The pure tab-capture tools (`list-tabs`, `capture-tabs`) return a clear platform error.

## Prerequisites

- **Node.js >= 18**
- **Readwise account** with an API token from https://readwise.io/access_token
- **macOS** — required only for Safari DOM capture (`list-tabs`, `capture-tabs`, and the Safari path of `capture-page`/`capture-urls`). All Readwise API tools work on any platform.

## Installation

### 1. Clone and build

```bash
git clone https://github.com/your-username/safari-readwise-mcp.git
cd safari-readwise-mcp
npm install
npm run build
```

### 2. Enable Safari JavaScript from Apple Events

The `capture-page` and `capture-tabs` tools use AppleScript to extract full DOM content from Safari. This requires a Safari setting that is **disabled by default**:

1. Open **Safari > Settings > Advanced**
2. Check **"Show features for web developers"**
3. Close Settings, then go to the **Develop** menu in the menu bar
4. Check **"Allow JavaScript from Apple Events"**

> **Without this setting**, the Safari capture tools will fail with:
> `Safari got an error: You must enable 'Allow JavaScript from Apple Events' in the Developer section of Safari Settings to use 'do JavaScript'.`
>
> The non-Safari tools (document management, highlights, books, tags, etc.) work fine without this setting — they talk directly to the Readwise API.

### 3. Provide your Readwise token

The server resolves the token in this order:

1. `READWISE_TOKEN` environment variable
2. macOS Keychain (service: `safari-readwise-mcp`, account: `$USER`) — only checked when the env var is unset
3. If neither is found, the server throws a `ReadwiseTokenError` and tells you how to fix it

#### Option A — macOS Keychain (recommended on macOS)

Avoids putting the token in a plaintext config file. Run once:

```bash
npm run setup-token
# or directly:
security add-generic-password -U -s safari-readwise-mcp -a "$USER" -w
```

Then your MCP config does **not** need an `env` block — the server reads the token from Keychain at startup:

```json
{
  "mcpServers": {
    "safari-readwise-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/safari-readwise-mcp/dist/index.js"]
    }
  }
}
```

To rotate or remove the stored token:

```bash
security add-generic-password -U -s safari-readwise-mcp -a "$USER" -w   # update
security delete-generic-password -s safari-readwise-mcp -a "$USER"      # delete
```

#### Option B — Environment variable (works everywhere)

```bash
claude mcp add safari-readwise-mcp \
  -e READWISE_TOKEN=your_token_here \
  -- node /path/to/safari-readwise-mcp/dist/index.js
```

Or manually:

```json
{
  "mcpServers": {
    "safari-readwise-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/safari-readwise-mcp/dist/index.js"],
      "env": {
        "READWISE_TOKEN": "your_token_here"
      }
    }
  }
}
```

The env var always takes precedence over Keychain, so it doubles as a per-session override.

#### Option C — Shell out to a secret manager (1Password, Bitwarden, pass, ...)

Resolve the token in the spawn command itself, leaving zero plaintext on disk:

```json
{
  "mcpServers": {
    "safari-readwise-mcp": {
      "type": "stdio",
      "command": "sh",
      "args": [
        "-c",
        "READWISE_TOKEN=$(op read 'op://Personal/Readwise/token') exec node /path/to/safari-readwise-mcp/dist/index.js"
      ]
    }
  }
}
```

Requires the secret manager's CLI to be authenticated when the MCP server starts.

## Tools

### Safari (5)

| Tool | Description |
|------|-------------|
| `list-tabs` | List open Safari tabs (macOS only) |
| `check-setup` | Diagnostic check — Safari permissions (macOS) + Readwise token |
| `capture-page` | Capture a page DOM and save to Readwise Reader. With `directSave: true` (or on non-macOS), skips Safari and saves the URL directly so Readwise fetches the content. |
| `capture-tabs` | Capture multiple Safari tabs and save to Readwise Reader (macOS only) |
| `capture-urls` | Capture a list of URLs and save to Readwise Reader. Uses Safari DOM capture on macOS, direct URL save on other platforms. |

### Reader v3 — Documents & Tags (5)

| Tool | Description |
|------|-------------|
| `list-documents` | Search/filter documents by location, category, tag, or date |
| `update-document` | Update document metadata |
| `delete-document` | Delete a document |
| `bulk-update-documents` | Update up to 50 documents at once |
| `list-tags` | List all Reader tags |

### Classic v2 — Highlights & Books (6)

| Tool | Description |
|------|-------------|
| `create-highlights` | Create highlights (batch) with book metadata |
| `list-highlights` | List/get highlights with page-based pagination |
| `manage-highlight` | Update or delete a highlight |
| `list-books` | List/get books and sources |
| `export-highlights` | Export highlights with full book metadata (cursor pagination) |
| `daily-review` | Get today's daily review highlights |

## Development

```bash
npm run build        # Build with tsup → dist/
npm run dev          # Run with tsx (dev mode)
npm run test         # Run all unit tests (vitest)
npm run test:watch   # Watch mode
npm run typecheck    # tsc --noEmit
```

Smoke tests hit the live Readwise API and are skipped without a token:

```bash
READWISE_TOKEN=your_token npm run test:smoke
```

## License

MIT
