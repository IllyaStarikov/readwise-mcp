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
import { captureDom, openAndCaptureDom } from "../../src/safari/dom-capture.js";

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

describe("openAndCaptureDom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens URL, waits for load, captures, and closes tab", async () => {
    // Call 1: open URL → returns window 1, tab 5
    // Call 2: poll readyState → "complete"
    // Call 3: captureDom script → URL + title
    // Call 4: close tab
    mockRunAppleScript
      .mockResolvedValueOnce({ stdout: "1\n5", stderr: "" }) // open
      .mockResolvedValueOnce({ stdout: "complete", stderr: "" }) // readyState
      .mockResolvedValueOnce({
        stdout: "https://example.com\nExample Page",
        stderr: "",
      }) // captureDom
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // close tab
    mockReadTempFile.mockResolvedValue("<html><body>Hello</body></html>");

    const result = await openAndCaptureDom("https://example.com");

    expect(result).toEqual({
      html: "<html><body>Hello</body></html>",
      url: "https://example.com",
      title: "Example Page",
    });

    // Verify open script contains the URL
    const openScript = mockRunAppleScript.mock.calls[0][0];
    expect(openScript).toContain("https://example.com");
    expect(openScript).toContain("activate");

    // Verify close was called
    const closeScript = mockRunAppleScript.mock.calls[3][0];
    expect(closeScript).toContain("close tab 5 of window 1");
  });

  it("does not close tab when closeAfterCapture is false", async () => {
    mockRunAppleScript
      .mockResolvedValueOnce({ stdout: "1\n3", stderr: "" }) // open
      .mockResolvedValueOnce({ stdout: "complete", stderr: "" }) // readyState
      .mockResolvedValueOnce({
        stdout: "https://example.com\nExample",
        stderr: "",
      }); // captureDom
    mockReadTempFile.mockResolvedValue("<html>test</html>");

    await openAndCaptureDom("https://example.com", {
      closeAfterCapture: false,
    });

    // Should be 3 calls (open, readyState, captureDom) — no close
    expect(mockRunAppleScript).toHaveBeenCalledTimes(3);
  });

  it("polls readyState multiple times until complete", async () => {
    mockRunAppleScript
      .mockResolvedValueOnce({ stdout: "1\n2", stderr: "" }) // open
      .mockResolvedValueOnce({ stdout: "loading", stderr: "" }) // readyState poll 1
      .mockResolvedValueOnce({ stdout: "interactive", stderr: "" }) // readyState poll 2
      .mockResolvedValueOnce({ stdout: "complete", stderr: "" }) // readyState poll 3
      .mockResolvedValueOnce({
        stdout: "https://example.com\nExample",
        stderr: "",
      }) // captureDom
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // close
    mockReadTempFile.mockResolvedValue("<html>test</html>");

    const result = await openAndCaptureDom("https://example.com", {
      pollIntervalMs: 10,
    });

    expect(result.url).toBe("https://example.com");
    // open + 3 polls + captureDom + close = 6
    expect(mockRunAppleScript).toHaveBeenCalledTimes(6);
  });

  it("throws timeout error when page never loads", async () => {
    mockRunAppleScript
      .mockResolvedValueOnce({ stdout: "1\n2", stderr: "" }) // open
      .mockResolvedValue({ stdout: "loading", stderr: "" }); // readyState always loading

    await expect(
      openAndCaptureDom("https://slow.example.com", {
        timeoutMs: 100,
        pollIntervalMs: 20,
      }),
    ).rejects.toThrow("Page did not finish loading within 0.1 seconds");
  });

  it("handles readyState poll errors gracefully", async () => {
    mockRunAppleScript
      .mockResolvedValueOnce({ stdout: "1\n2", stderr: "" }) // open
      .mockRejectedValueOnce(new Error("tab not ready")) // readyState poll error
      .mockResolvedValueOnce({ stdout: "complete", stderr: "" }) // readyState success
      .mockResolvedValueOnce({
        stdout: "https://example.com\nExample",
        stderr: "",
      }) // captureDom
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // close
    mockReadTempFile.mockResolvedValue("<html>test</html>");

    const result = await openAndCaptureDom("https://example.com", {
      pollIntervalMs: 10,
    });

    expect(result.url).toBe("https://example.com");
  });

  it("escapes special characters in URL for AppleScript", async () => {
    mockRunAppleScript
      .mockResolvedValueOnce({ stdout: "1\n1", stderr: "" }) // open
      .mockResolvedValueOnce({ stdout: "complete", stderr: "" }) // readyState
      .mockResolvedValueOnce({
        stdout: 'https://example.com/path?q="test"\nExample',
        stderr: "",
      }) // captureDom
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // close
    mockReadTempFile.mockResolvedValue("<html>test</html>");

    await openAndCaptureDom('https://example.com/path?q="test"', {
      pollIntervalMs: 10,
    });

    const openScript = mockRunAppleScript.mock.calls[0][0];
    // Double quotes should be escaped
    expect(openScript).toContain('\\"test\\"');
  });
});
