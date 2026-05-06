import { describe, it, expect } from "vitest";
import {
  SafariPermissionError,
  SafariNotRunningError,
  TccPermissionError,
  ReadwiseApiError,
  ReadwiseTokenError,
  errorToToolResult,
} from "../../src/utils/errors.js";

describe("SafariPermissionError", () => {
  it("uses default message and sets name", () => {
    const err = new SafariPermissionError();
    expect(err.name).toBe("SafariPermissionError");
    expect(err.message).toContain("Allow JavaScript from Apple Events");
    expect(err).toBeInstanceOf(Error);
  });

  it("accepts a custom message", () => {
    const err = new SafariPermissionError("custom");
    expect(err.message).toBe("custom");
  });
});

describe("SafariNotRunningError", () => {
  it("uses default message and sets name", () => {
    const err = new SafariNotRunningError();
    expect(err.name).toBe("SafariNotRunningError");
    expect(err.message).toBe("Safari is not running. Please open Safari first.");
  });

  it("accepts a custom message", () => {
    const err = new SafariNotRunningError("custom");
    expect(err.message).toBe("custom");
  });
});

describe("TccPermissionError", () => {
  it("uses default message and sets name", () => {
    const err = new TccPermissionError();
    expect(err.name).toBe("TccPermissionError");
    expect(err.message).toContain("Privacy & Security");
  });

  it("accepts a custom message", () => {
    const err = new TccPermissionError("custom");
    expect(err.message).toBe("custom");
  });
});

describe("ReadwiseApiError", () => {
  it("requires a message and status, exposes status field", () => {
    const err = new ReadwiseApiError("Bad request", 400);
    expect(err.name).toBe("ReadwiseApiError");
    expect(err.message).toBe("Bad request");
    expect(err.status).toBe(400);
  });
});

describe("ReadwiseTokenError", () => {
  it("uses default message that mentions READWISE_TOKEN", () => {
    const err = new ReadwiseTokenError();
    expect(err.name).toBe("ReadwiseTokenError");
    expect(err.message).toContain("READWISE_TOKEN");
  });

  it("accepts a custom message", () => {
    const err = new ReadwiseTokenError("custom");
    expect(err.message).toBe("custom");
  });
});

describe("errorToToolResult", () => {
  it("formats Error instances using their message", () => {
    const result = errorToToolResult(new Error("boom"));
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: "boom" }]);
  });

  it("preserves custom error class messages", () => {
    const result = errorToToolResult(new ReadwiseApiError("rate limited", 429));
    expect(result.content[0].text).toBe("rate limited");
  });

  it("stringifies non-Error values", () => {
    const result = errorToToolResult("just a string");
    expect(result.content[0].text).toBe("just a string");
    expect(result.isError).toBe(true);
  });

  it("handles null", () => {
    const result = errorToToolResult(null);
    expect(result.content[0].text).toBe("null");
    expect(result.isError).toBe(true);
  });

  it("handles undefined", () => {
    const result = errorToToolResult(undefined);
    expect(result.content[0].text).toBe("undefined");
    expect(result.isError).toBe(true);
  });
});
