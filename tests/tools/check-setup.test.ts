import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/diagnostics.js", () => ({
  checkSafariRunning: vi.fn(),
  checkJavaScriptPermission: vi.fn(),
  checkAutomationPermission: vi.fn(),
}));

vi.mock("../../src/readwise/client.js", () => ({
  validateToken: vi.fn(),
}));

vi.mock("../../src/utils/platform.js", () => ({
  isMacOS: vi.fn(),
}));

import {
  checkSafariRunning,
  checkJavaScriptPermission,
  checkAutomationPermission,
} from "../../src/safari/diagnostics.js";
import { validateToken } from "../../src/readwise/client.js";
import { isMacOS } from "../../src/utils/platform.js";
import { checkSetupHandler } from "../../src/tools/check-setup.js";

const mockCheckSafari = vi.mocked(checkSafariRunning);
const mockCheckJS = vi.mocked(checkJavaScriptPermission);
const mockCheckAuto = vi.mocked(checkAutomationPermission);
const mockValidateToken = vi.mocked(validateToken);
const mockIsMacOS = vi.mocked(isMacOS);

describe("checkSetupHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMacOS.mockReturnValue(true);
  });

  it("returns all-pass report", async () => {
    mockCheckSafari.mockResolvedValue({ name: "Safari Running", ok: true, message: "running" });
    mockCheckAuto.mockResolvedValue({ name: "Automation", ok: true, message: "ok" });
    mockCheckJS.mockResolvedValue({ name: "JS Permission", ok: true, message: "ok" });
    mockValidateToken.mockResolvedValue(true);

    const result = await checkSetupHandler();
    expect(result.content[0].text).toContain("All checks passed");
    expect(result.content[0].text).not.toContain("[FAIL]");
  });

  it("returns failure report when checks fail", async () => {
    mockCheckSafari.mockResolvedValue({ name: "Safari Running", ok: false, message: "not running" });
    mockCheckAuto.mockResolvedValue({ name: "Automation", ok: true, message: "ok" });
    mockCheckJS.mockResolvedValue({ name: "JS Permission", ok: false, message: "disabled" });
    mockValidateToken.mockResolvedValue(false);

    const result = await checkSetupHandler();
    expect(result.content[0].text).toContain("[FAIL]");
    expect(result.content[0].text).toContain("Some checks failed");
  });

  it("never returns isError", async () => {
    mockCheckSafari.mockResolvedValue({ name: "Safari Running", ok: false, message: "fail" });
    mockCheckAuto.mockResolvedValue({ name: "Automation", ok: false, message: "fail" });
    mockCheckJS.mockResolvedValue({ name: "JS Permission", ok: false, message: "fail" });
    mockValidateToken.mockRejectedValue(new Error("network error"));

    const result = await checkSetupHandler();
    expect((result as any).isError).toBeUndefined();
  });

  describe("non-macOS platform", () => {
    beforeEach(() => {
      mockIsMacOS.mockReturnValue(false);
    });

    it("only checks Readwise token, skips Safari diagnostics", async () => {
      mockValidateToken.mockResolvedValue(true);

      const result = await checkSetupHandler();

      expect(result.content[0].text).toContain("Safari features unavailable");
      expect(result.content[0].text).toContain("[OK] Readwise Token");
      expect(result.content[0].text).toContain("Safari capture tools require macOS");
      expect(mockCheckSafari).not.toHaveBeenCalled();
      expect(mockCheckAuto).not.toHaveBeenCalled();
      expect(mockCheckJS).not.toHaveBeenCalled();
    });

    it("reports token failure on non-macOS", async () => {
      mockValidateToken.mockResolvedValue(false);

      const result = await checkSetupHandler();

      expect(result.content[0].text).toContain("[FAIL] Readwise Token");
      expect(result.content[0].text).toContain("token check failed");
    });
  });
});
