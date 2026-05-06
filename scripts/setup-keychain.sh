#!/bin/bash
set -euo pipefail

if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "This script uses macOS Keychain. On other platforms, set the READWISE_TOKEN environment variable in your MCP client config." >&2
  exit 1
fi

read -r -s -p "Readwise API token (https://readwise.io/access_token): " TOKEN
echo
if [[ -z "$TOKEN" ]]; then
  echo "No token entered. Aborting." >&2
  exit 1
fi

security add-generic-password -U -s safari-readwise-mcp -a "$USER" -w "$TOKEN"
echo "Token saved to macOS Keychain (service: safari-readwise-mcp, account: $USER)."
echo "You can now omit READWISE_TOKEN from your MCP client config."
