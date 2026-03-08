import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listTabsSchema, listTabsHandler } from "./tools/list-tabs.js";
import { checkSetupSchema, checkSetupHandler } from "./tools/check-setup.js";
import {
  capturePageSchema,
  capturePageHandler,
} from "./tools/capture-page.js";
import {
  captureTabsSchema,
  captureTabsHandler,
} from "./tools/capture-tabs.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "safari-readwise-mcp",
    version: "1.0.0",
  });

  server.tool(
    "list-tabs",
    "List all open Safari tabs with their URLs and titles",
    listTabsSchema,
    listTabsHandler,
  );

  server.tool(
    "check-setup",
    "Check Safari permissions and Readwise token validity",
    checkSetupSchema,
    checkSetupHandler,
  );

  server.tool(
    "capture-page",
    "Capture the active Safari tab's full DOM content and save it to Readwise Reader",
    capturePageSchema,
    capturePageHandler,
  );

  server.tool(
    "capture-tabs",
    "Capture multiple Safari tabs and save each to Readwise Reader",
    captureTabsSchema,
    captureTabsHandler,
  );

  return server;
}
