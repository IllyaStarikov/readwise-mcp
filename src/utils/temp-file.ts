import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function getTempPath(): string {
  return join(tmpdir(), `safari-readwise-${randomUUID()}.html`);
}

export async function withTempFile<T>(
  fn: (tempPath: string) => Promise<T>,
): Promise<T> {
  const tempPath = getTempPath();
  try {
    return await fn(tempPath);
  } finally {
    try {
      await unlink(tempPath);
    } catch {
      // File may not have been created; ignore cleanup errors
    }
  }
}

export async function readTempFile(tempPath: string): Promise<string> {
  return readFile(tempPath, "utf-8");
}
