import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { log, logError } from "./utils/logger.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  log("Starting Safari-Readwise MCP server...");
  await server.connect(transport);
  log("Server connected via stdio");
}

main().catch((error) => {
  logError("Fatal error", error);
  process.exit(1);
});
