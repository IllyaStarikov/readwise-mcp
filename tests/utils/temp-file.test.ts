import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTempPath, withTempFile, readTempFile } from "../../src/utils/temp-file.js";
import { writeFile, readFile, unlink, access } from "node:fs/promises";

describe("getTempPath", () => {
  it("returns a path in tmpdir", () => {
    const path = getTempPath();
    expect(path).toMatch(/safari-readwise-.*\.html$/);
  });

  it("returns unique paths each call", () => {
    const a = getTempPath();
    const b = getTempPath();
    expect(a).not.toBe(b);
  });
});

describe("withTempFile", () => {
  it("provides a temp path and cleans up after success", async () => {
    let capturedPath = "";
    const result = await withTempFile(async (tempPath) => {
      capturedPath = tempPath;
      await writeFile(tempPath, "test content");
      return "done";
    });

    expect(result).toBe("done");
    await expect(access(capturedPath)).rejects.toThrow();
  });

  it("cleans up even if fn throws", async () => {
    let capturedPath = "";
    await expect(
      withTempFile(async (tempPath) => {
        capturedPath = tempPath;
        await writeFile(tempPath, "test content");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    await expect(access(capturedPath)).rejects.toThrow();
  });

  it("does not throw if temp file was never created", async () => {
    const result = await withTempFile(async () => {
      return "ok";
    });
    expect(result).toBe("ok");
  });
});

describe("readTempFile", () => {
  it("reads file contents", async () => {
    const path = getTempPath();
    await writeFile(path, "hello world");
    const content = await readTempFile(path);
    expect(content).toBe("hello world");
    await unlink(path);
  });
});
