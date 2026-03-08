import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/applescript.js", () => ({
  runAppleScript: vi.fn(),
}));

import { runAppleScript } from "../../src/safari/applescript.js";
import { listTabs } from "../../src/safari/tab-list.js";

const mockRunAppleScript = vi.mocked(runAppleScript);

describe("listTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses tab output correctly", async () => {
    mockRunAppleScript.mockResolvedValue({
      stdout: "1\t1\thttps://example.com\tExample\n1\t2\thttps://test.com\tTest Page\n",
      stderr: "",
    });

    const tabs = await listTabs();
    expect(tabs).toEqual([
      { windowIndex: 1, tabIndex: 1, url: "https://example.com", title: "Example" },
      { windowIndex: 1, tabIndex: 2, url: "https://test.com", title: "Test Page" },
    ]);
  });

  it("returns empty array for no tabs", async () => {
    mockRunAppleScript.mockResolvedValue({ stdout: "", stderr: "" });
    const tabs = await listTabs();
    expect(tabs).toEqual([]);
  });

  it("handles multiple windows", async () => {
    mockRunAppleScript.mockResolvedValue({
      stdout: "1\t1\thttps://a.com\tA\n2\t1\thttps://b.com\tB\n",
      stderr: "",
    });

    const tabs = await listTabs();
    expect(tabs).toHaveLength(2);
    expect(tabs[0].windowIndex).toBe(1);
    expect(tabs[1].windowIndex).toBe(2);
  });

  it("propagates errors from AppleScript", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("Safari not running"));
    await expect(listTabs()).rejects.toThrow("Safari not running");
  });
});
