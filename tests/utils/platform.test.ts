import { describe, it, expect } from "vitest";
import { isMacOS } from "../../src/utils/platform.js";

describe("isMacOS", () => {
  it("returns a boolean", () => {
    expect(typeof isMacOS()).toBe("boolean");
  });

  it("returns true on darwin", () => {
    // We're running on macOS in this test environment
    if (process.platform === "darwin") {
      expect(isMacOS()).toBe(true);
    }
  });
});
