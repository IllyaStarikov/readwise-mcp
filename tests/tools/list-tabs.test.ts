import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/tab-list.js", () => ({
  listTabs: vi.fn(),
}));

vi.mock("../../src/utils/platform.js", () => ({
  isMacOS: vi.fn(),
}));

import { listTabs } from "../../src/safari/tab-list.js";
import { isMacOS } from "../../src/utils/platform.js";
import { listTabsHandler } from "../../src/tools/list-tabs.js";

const mockListTabs = vi.mocked(listTabs);
const mockIsMacOS = vi.mocked(isMacOS);

describe("listTabsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMacOS.mockReturnValue(true);
  });

  it("returns formatted tab list", async () => {
    mockListTabs.mockResolvedValue([
      { windowIndex: 1, tabIndex: 1, url: "https://a.com", title: "Page A" },
      { windowIndex: 1, tabIndex: 2, url: "https://b.com", title: "Page B" },
    ]);

    const result = await listTabsHandler();
    expect(result.content[0].text).toContain("Page A");
    expect(result.content[0].text).toContain("Page B");
    expect(result.content[0].text).toContain("2 tab(s)");
    expect(result.content[0].text).toContain("1 window(s)");
  });

  it("returns message when no tabs", async () => {
    mockListTabs.mockResolvedValue([]);
    const result = await listTabsHandler();
    expect(result.content[0].text).toContain("No Safari tabs");
  });

  it("returns error result on failure", async () => {
    mockListTabs.mockRejectedValue(new Error("Safari not running"));
    const result = await listTabsHandler();
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Safari not running");
  });

  it("returns error on non-macOS", async () => {
    mockIsMacOS.mockReturnValue(false);

    const result = await listTabsHandler();

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("requires macOS");
    expect(mockListTabs).not.toHaveBeenCalled();
  });
});
