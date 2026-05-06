import { execFileSync } from "node:child_process";
import { userInfo } from "node:os";

export const KEYCHAIN_SERVICE = "safari-readwise-mcp";

/**
 * Reads the Readwise token from macOS Keychain via `security find-generic-password`.
 * Returns null on any failure (not found, permission denied, command missing, non-macOS).
 *
 * Stored with: security add-generic-password -U -s safari-readwise-mcp -a $USER -w
 */
export function getTokenFromKeychain(): string | null {
  try {
    const account = process.env.USER || userInfo().username;
    if (!account) return null;
    const result = execFileSync(
      "security",
      ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", account, "-w"],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const trimmed = result.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}
