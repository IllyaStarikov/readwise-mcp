import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/applescript.js", () => ({
  runAppleScript: vi.fn(),
}));

vi.mock("../../src/utils/temp-file.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/utils/temp-file.js")>();
  return {
    ...original,
    withTempFile: vi.fn(async (fn: (path: string) => Promise<any>) => {
      return fn("/tmp/test-temp.html");
    }),
    readTempFile: vi.fn(),
  };
});

import { runAppleScript } from "../../src/safari/applescript.js";
import { readTempFile } from "../../src/utils/temp-file.js";
import { captureDom } from "../../src/safari/dom-capture.js";

const mockRunAppleScript = vi.mocked(runAppleScript);
const mockReadTempFile = vi.mocked(readTempFile);

describe("captureDom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures DOM from current tab by default", async () => {
    mockRunAppleScript.mockResolvedValue({
      stdout: "https://example.com\nExample Page",
      stderr: "",
    });
    mockReadTempFile.mockResolvedValue("<html><body>Hello</body></html>");

    const result = await captureDom();
    expect(result).toEqual({
      html: "<html><body>Hello</body></html>",
      url: "https://example.com",
      title: "Example Page",
    });

    // Verify script references current tab
    const script = mockRunAppleScript.mock.calls[0][0];
    expect(script).toContain("current tab of window 1");
  });

  it("captures DOM from specific tab", async () => {
    mockRunAppleScript.mockResolvedValue({
      stdout: "https://test.com\nTest",
      stderr: "",
    });
    mockReadTempFile.mockResolvedValue("<html>test</html>");

    const result = await captureDom(2, 3);
    expect(result.url).toBe("https://test.com");

    const script = mockRunAppleScript.mock.calls[0][0];
    expect(script).toContain("tab 3 of window 2");
  });

  it("propagates AppleScript errors", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("permission denied"));
    await expect(captureDom()).rejects.toThrow("permission denied");
  });
});
