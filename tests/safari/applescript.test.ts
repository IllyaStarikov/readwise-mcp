import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAppleScript } from "../../src/safari/applescript.js";

// Mock child_process
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";

const mockExecFile = vi.mocked(execFile);

describe("runAppleScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves with stdout and stderr on success", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(null, "hello\n", "");
      return undefined as any;
    });

    const result = await runAppleScript('return "hello"');
    expect(result).toEqual({ stdout: "hello", stderr: "" });
    expect(mockExecFile).toHaveBeenCalledWith(
      "osascript",
      ["-e", 'return "hello"'],
      expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 }),
      expect.any(Function),
    );
  });

  it("throws SafariPermissionError on -1743", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(new Error("execution error: error -1743"), "", "");
      return undefined as any;
    });

    const err1 = await runAppleScript("test").catch((e) => e);
    expect(err1.name).toBe("SafariPermissionError");
    expect(err1.message).toMatch(/Allow JavaScript from Apple Events/);
  });

  it("throws SafariNotRunningError when Safari not running", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(new Error("Application isn't running"), "", "");
      return undefined as any;
    });

    const err = await runAppleScript("test").catch((e) => e);
    expect(err.name).toBe("SafariNotRunningError");
  });

  it("throws TccPermissionError on error 1002", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(new Error("not allowed assistive access"), "", "");
      return undefined as any;
    });

    const err = await runAppleScript("test").catch((e) => e);
    expect(err.name).toBe("TccPermissionError");
  });

  it("throws generic error for unknown failures", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(new Error("something weird"), "", "");
      return undefined as any;
    });

    await expect(runAppleScript("test")).rejects.toThrow("AppleScript error: something weird");
  });
});
