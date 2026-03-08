export class SafariPermissionError extends Error {
  constructor(
    message = 'Safari "Allow JavaScript from Apple Events" is disabled. Enable it in Safari → Develop → Allow JavaScript from Apple Events.',
  ) {
    super(message);
    this.name = "SafariPermissionError";
  }
}

export class SafariNotRunningError extends Error {
  constructor(message = "Safari is not running. Please open Safari first.") {
    super(message);
    this.name = "SafariNotRunningError";
  }
}

export class TccPermissionError extends Error {
  constructor(
    message = "Terminal does not have permission to control Safari. Grant access in System Settings → Privacy & Security → Automation.",
  ) {
    super(message);
    this.name = "TccPermissionError";
  }
}

export class ReadwiseApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReadwiseApiError";
    this.status = status;
  }
}

export class ReadwiseTokenError extends Error {
  constructor(
    message = "Invalid Readwise API token. Set READWISE_TOKEN environment variable with a valid token from https://readwise.io/access_token",
  ) {
    super(message);
    this.name = "ReadwiseTokenError";
  }
}

export function errorToToolResult(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const message =
    error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
