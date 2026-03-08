import { ReadwiseApiError, ReadwiseTokenError } from "../utils/errors.js";

export function getToken(): string {
  const token = process.env.READWISE_TOKEN;
  if (!token) {
    throw new ReadwiseTokenError(
      "READWISE_TOKEN environment variable is not set. Get your token from https://readwise.io/access_token",
    );
  }
  return token;
}

export async function handleApiResponse(
  response: Response,
  context: string,
): Promise<void> {
  if (response.status === 401) {
    throw new ReadwiseTokenError();
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") || "60";
    throw new ReadwiseApiError(
      `Rate limited by Readwise. Retry after ${retryAfter} seconds.`,
      429,
    );
  }

  if (response.status < 200 || response.status >= 300) {
    const text = await response.text().catch(() => "");
    throw new ReadwiseApiError(
      `${context}: Readwise API returned ${response.status}: ${text}`,
      response.status,
    );
  }
}
