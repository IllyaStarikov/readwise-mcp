import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { log, logError } from "../../src/utils/logger.js";

let stderrCalls: string[];
let stdoutCalls: string[];
let stderrSpy: ReturnType<typeof vi.fn>;
let stdoutSpy: ReturnType<typeof vi.fn>;
let originalStderrWrite: typeof process.stderr.write;
let originalStdoutWrite: typeof process.stdout.write;

beforeEach(() => {
  stderrCalls = [];
  stdoutCalls = [];
  originalStderrWrite = process.stderr.write.bind(process.stderr);
  originalStdoutWrite = process.stdout.write.bind(process.stdout);
  stderrSpy = vi.fn((chunk: unknown) => {
    stderrCalls.push(String(chunk));
    return true;
  });
  stdoutSpy = vi.fn((chunk: unknown) => {
    stdoutCalls.push(String(chunk));
    return true;
  });
  process.stderr.write = stderrSpy as unknown as typeof process.stderr.write;
  process.stdout.write = stdoutSpy as unknown as typeof process.stdout.write;
});

afterEach(() => {
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
});

describe("log", () => {
  it("writes to stderr with the [safari-readwise-mcp] prefix", () => {
    log("hello");
    expect(stderrCalls).toEqual(["[safari-readwise-mcp] hello\n"]);
  });

  it("never writes to stdout (critical for stdio MCP transport)", () => {
    log("hello");
    expect(stdoutCalls).toEqual([]);
  });

  it("appends a trailing newline", () => {
    log("no-newline");
    expect(stderrCalls[0]).toMatch(/\n$/);
  });
});

describe("logError", () => {
  it("writes ERROR-prefixed message to stderr without a detail when no error is given", () => {
    logError("something broke");
    expect(stderrCalls).toEqual([
      "[safari-readwise-mcp] ERROR something broke\n",
    ]);
  });

  it("includes Error message after the context", () => {
    logError("save failed", new Error("network down"));
    expect(stderrCalls).toEqual([
      "[safari-readwise-mcp] ERROR save failed: network down\n",
    ]);
  });

  it("stringifies non-Error values", () => {
    logError("oops", "something weird");
    expect(stderrCalls).toEqual([
      "[safari-readwise-mcp] ERROR oops: something weird\n",
    ]);
  });

  it("omits the detail for falsy non-Error values", () => {
    logError("oops", undefined);
    expect(stderrCalls).toEqual(["[safari-readwise-mcp] ERROR oops\n"]);
  });

  it("never writes to stdout", () => {
    logError("oops", new Error("boom"));
    expect(stdoutCalls).toEqual([]);
  });
});
