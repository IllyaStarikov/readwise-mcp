import { listTabs } from "../safari/tab-list.js";
import { errorToToolResult } from "../utils/errors.js";
import { isMacOS } from "../utils/platform.js";

export const listTabsSchema = {};

export async function listTabsHandler() {
  try {
    if (!isMacOS()) {
      return errorToToolResult(
        new Error("list-tabs requires macOS with Safari."),
      );
    }

    const tabs = await listTabs();

    if (tabs.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No Safari tabs are open." }],
      };
    }

    const grouped = new Map<number, typeof tabs>();
    for (const tab of tabs) {
      const existing = grouped.get(tab.windowIndex) ?? [];
      existing.push(tab);
      grouped.set(tab.windowIndex, existing);
    }

    let output = "";
    for (const [windowIndex, windowTabs] of grouped) {
      output += `Window ${windowIndex}:\n`;
      for (const tab of windowTabs) {
        output += `  [${tab.tabIndex}] ${tab.title}\n      ${tab.url}\n`;
      }
      output += "\n";
    }

    output += `Total: ${tabs.length} tab(s) in ${grouped.size} window(s)`;

    return {
      content: [{ type: "text" as const, text: output }],
    };
  } catch (error) {
    return errorToToolResult(error);
  }
}
