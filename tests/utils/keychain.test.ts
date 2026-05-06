import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "node:child_process";
import { getTokenFromKeychain, KEYCHAIN_SERVICE } from "../../src/utils/keychain.js";

const mockExecFileSync = vi.mocked(execFileSync);

describe("getTokenFromKeychain", () => {
  const originalUser = process.env.USER;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USER = "tester";
  });

  afterEach(() => {
    if (originalUser !== undefined) {
      process.env.USER = originalUser;
    } else {
      delete process.env.USER;
    }
  });

  it("calls security with the right args and returns the trimmed token", () => {
    mockExecFileSync.mockReturnValue("secret-token\n" as never);

    const result = getTokenFromKeychain();

    expect(result).toBe("secret-token");
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "security",
      [
        "find-generic-password",
        "-s",
        KEYCHAIN_SERVICE,
        "-a",
        "tester",
        "-w",
      ],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    );
  });

  it("returns null when security exits non-zero (no matching entry)", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("The specified item could not be found in the keychain.");
    });

    expect(getTokenFromKeychain()).toBeNull();
  });

  it("returns null when security returns an empty string", () => {
    mockExecFileSync.mockReturnValue("" as never);
    expect(getTokenFromKeychain()).toBeNull();
  });

  it("returns null when security returns only whitespace", () => {
    mockExecFileSync.mockReturnValue("   \n" as never);
    expect(getTokenFromKeychain()).toBeNull();
  });

  it("uses the security command name (no shell interpolation, no injection vector)", () => {
    mockExecFileSync.mockReturnValue("token" as never);
    getTokenFromKeychain();
    // First arg is the executable, not a shell string
    expect(mockExecFileSync.mock.calls[0][0]).toBe("security");
  });
});
