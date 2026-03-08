export function log(message: string): void {
  process.stderr.write(`[safari-readwise-mcp] ${message}\n`);
}

export function logError(message: string, error?: unknown): void {
  const detail =
    error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : "";
  process.stderr.write(`[safari-readwise-mcp] ERROR ${message}${detail}\n`);
}
