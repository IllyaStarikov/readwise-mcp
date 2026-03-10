import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";

describe("server registration", () => {
  it("registers all 16 tools", () => {
    const server = createServer();

    // Access the internal tool registry (plain object keyed by tool name)
    const registeredTools = (server as any)._registeredTools as Record<string, unknown>;
    const toolNames = Object.keys(registeredTools);

    const expectedTools = [
      // Safari (5)
      "list-tabs",
      "check-setup",
      "capture-page",
      "capture-tabs",
      "capture-urls",
      // Reader v3 (5)
      "list-documents",
      "update-document",
      "delete-document",
      "bulk-update-documents",
      "list-tags",
      // Classic v2 (6)
      "create-highlights",
      "list-highlights",
      "manage-highlight",
      "list-books",
      "export-highlights",
      "daily-review",
    ];

    expect(toolNames).toHaveLength(16);

    for (const name of expectedTools) {
      expect(toolNames, `Missing tool: ${name}`).toContain(name);
    }
  });
});
