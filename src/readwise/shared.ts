import { ReadwiseApiError, ReadwiseTokenError } from "../utils/errors.js";
import { getTokenFromKeychain, KEYCHAIN_SERVICE } from "../utils/keychain.js";
import { isMacOS } from "../utils/platform.js";

let cachedKeychainToken: string | null = null;
let keychainChecked = false;

/** Reset the Keychain cache. Tests only. */
export function _resetTokenCache(): void {
  cachedKeychainToken = null;
  keychainChecked = false;
}

export function getToken(): string {
  // Env var always wins so callers can override per-session.
  const envToken = process.env.READWISE_TOKEN;
  if (envToken) return envToken;

  // Keychain shellout is slow (~30ms) — memoize the result, including misses.
  if (isMacOS()) {
    if (!keychainChecked) {
      cachedKeychainToken = getTokenFromKeychain();
      keychainChecked = true;
    }
    if (cachedKeychainToken) return cachedKeychainToken;
  }

  throw new ReadwiseTokenError(
    isMacOS()
      ? `READWISE_TOKEN environment variable is not set, and no token found in macOS Keychain (service: ${KEYCHAIN_SERVICE}). ` +
          `Either set READWISE_TOKEN in your MCP client config, or store it in Keychain by running: npm run setup-token. ` +
          `Get your token from https://readwise.io/access_token`
      : "READWISE_TOKEN environment variable is not set. Get your token from https://readwise.io/access_token",
  );
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
