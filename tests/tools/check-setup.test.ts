import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/diagnostics.js", () => ({
  checkSafariRunning: vi.fn(),
  checkJavaScriptPermission: vi.fn(),
  checkAutomationPermission: vi.fn(),
}));

vi.mock("../../src/readwise/client.js", () => ({
  validateToken: vi.fn(),
}));

import {
  checkSafariRunning,
  checkJavaScriptPermission,
  checkAutomationPermission,
} from "../../src/safari/diagnostics.js";
import { validateToken } from "../../src/readwise/client.js";
import { checkSetupHandler } from "../../src/tools/check-setup.js";

const mockCheckSafari = vi.mocked(checkSafariRunning);
const mockCheckJS = vi.mocked(checkJavaScriptPermission);
const mockCheckAuto = vi.mocked(checkAutomationPermission);
const mockValidateToken = vi.mocked(validateToken);

describe("checkSetupHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
