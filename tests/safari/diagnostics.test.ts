import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/applescript.js", () => ({
  runAppleScript: vi.fn(),
}));

import { runAppleScript } from "../../src/safari/applescript.js";
import {
  checkSafariRunning,
  checkJavaScriptPermission,
  checkAutomationPermission,
} from "../../src/safari/diagnostics.js";
import {
  SafariNotRunningError,
  SafariPermissionError,
  TccPermissionError,
} from "../../src/utils/errors.js";

const mockRunAppleScript = vi.mocked(runAppleScript);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkSafariRunning", () => {
  it("returns ok when AppleScript succeeds", async () => {
    mockRunAppleScript.mockResolvedValue({ stdout: "true", stderr: "" });
    const result = await checkSafariRunning();
    expect(result).toEqual({
      name: "Safari Running",
      ok: true,
      message: "Safari is running",
    });
  });

  it("returns the SafariNotRunningError message when Safari is not running", async () => {
    mockRunAppleScript.mockRejectedValue(new SafariNotRunningError());
    const result = await checkSafariRunning();
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Safari is not running. Please open Safari first.");
  });

  it("falls through to a generic message for unknown errors", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("weird error"));
    const result = await checkSafariRunning();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Could not check");
    expect(result.message).toContain("weird error");
  });

  it("stringifies non-Error rejections", async () => {
    mockRunAppleScript.mockRejectedValue("oops");
    const result = await checkSafariRunning();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("oops");
  });
});

describe("checkJavaScriptPermission", () => {
  it("returns ok when JavaScript executes successfully", async () => {
    mockRunAppleScript.mockResolvedValue({ stdout: "2", stderr: "" });
    const result = await checkJavaScriptPermission();
    expect(result).toEqual({
      name: "JavaScript from Apple Events",
      ok: true,
      message: "JavaScript execution is allowed",
    });
  });

  it("maps SafariPermissionError to its message", async () => {
    mockRunAppleScript.mockRejectedValue(new SafariPermissionError());
    const result = await checkJavaScriptPermission();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Allow JavaScript from Apple Events");
  });

  it("maps SafariNotRunningError to a 'no open tabs' message", async () => {
    mockRunAppleScript.mockRejectedValue(new SafariNotRunningError());
    const result = await checkJavaScriptPermission();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Safari is not running or has no open tabs");
  });

  it("maps TccPermissionError to its message", async () => {
    mockRunAppleScript.mockRejectedValue(new TccPermissionError());
    const result = await checkJavaScriptPermission();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Privacy & Security");
  });

  it("falls through to a generic message for unknown errors", async () => {
    mockRunAppleScript.mockRejectedValue(new Error("syntax glitch"));
    const result = await checkJavaScriptPermission();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Could not check");
    expect(result.message).toContain("syntax glitch");
  });
});

describe("checkAutomationPermission", () => {
  it("returns ok when AppleScript can read the window name", async () => {
    mockRunAppleScript.mockResolvedValue({ stdout: "Test", stderr: "" });
    const result = await checkAutomationPermission();
    expect(result).toEqual({
      name: "Automation Permission",
      ok: true,
      message: "Terminal can control Safari",
    });
  });

  it("maps TccPermissionError to its message", async () => {
    mockRunAppleScript.mockRejectedValue(new TccPermissionError());
    const result = await checkAutomationPermission();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Privacy & Security");
  });

  it("maps SafariNotRunningError to a 'not running' message", async () => {
    mockRunAppleScript.mockRejectedValue(new SafariNotRunningError());
    const result = await checkAutomationPermission();
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Cannot check — Safari is not running");
  });

  it("treats unknown errors as ok=true (assumes no windows are open)", async () => {
    // If the failure isn't a permission error, automation is likely fine —
    // Safari may simply have no open windows.
    mockRunAppleScript.mockRejectedValue(new Error("no window 1"));
    const result = await checkAutomationPermission();
    expect(result.ok).toBe(true);
    expect(result.message).toContain("but Safari may have no windows open");
  });
});
