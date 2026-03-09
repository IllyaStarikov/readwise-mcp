import { log } from "../utils/logger.js";

const MIN_INTERVAL_MS = 1300; // ~46 req/min, comfortably under Readwise's limit
const MAX_RETRIES = 3;

interface QueuedRequest {
  args: [input: string | URL | Request, init?: RequestInit];
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
}

const queue: QueuedRequest[] = [];
let lastRequestTime = 0;
let isProcessing = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithRetry(
  args: [string | URL | Request, RequestInit?],
  attempt = 1,
): Promise<Response> {
  const response = await fetch(...args);

  if (response.status === 429 && attempt <= MAX_RETRIES) {
    const retryAfter = parseInt(
      response.headers.get("Retry-After") || "60",
      10,
    );
    log(
      `Rate limited (429). Retry ${attempt}/${MAX_RETRIES} after ${retryAfter}s`,
    );
    await delay(retryAfter * 1000);
    lastRequestTime = Date.now();
    return executeWithRetry(args, attempt + 1);
  }

  return response;
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;

    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      await delay(MIN_INTERVAL_MS - elapsed);
    }

    try {
      const response = await executeWithRetry(item.args);
      lastRequestTime = Date.now();
      item.resolve(response);
    } catch (error) {
      lastRequestTime = Date.now();
      item.reject(error);
    }
  }

  isProcessing = false;
}

export async function rateLimitedFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    queue.push({ args: [input, init], resolve, reject });
    processQueue();
  });
}

/** Reset internal state between tests. */
export function _resetForTesting(): void {
  queue.length = 0;
  lastRequestTime = 0;
  isProcessing = false;
}
