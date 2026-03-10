import {
  checkSafariRunning,
  checkJavaScriptPermission,
  checkAutomationPermission,
} from "../safari/diagnostics.js";
import { validateToken } from "../readwise/client.js";
import { isMacOS } from "../utils/platform.js";

export const checkSetupSchema = {};

export async function checkSetupHandler() {
  if (!isMacOS()) {
    let tokenOk = false;
    let tokenMessage = "";
    try {
      tokenOk = await validateToken();
      tokenMessage = tokenOk
        ? "Token is valid"
        : "Token is invalid. Check READWISE_TOKEN env var.";
    } catch (error) {
      tokenMessage =
        error instanceof Error ? error.message : "Could not validate token";
    }

    let output = "Safari-Readwise MCP Setup Diagnostics\n";
    output += "━".repeat(40) + "\n\n";
    output += `Platform: ${process.platform} (Safari features unavailable — macOS required)\n\n`;
    const icon = tokenOk ? "[OK]" : "[FAIL]";
    output += `${icon} Readwise Token\n    ${tokenMessage}\n\n`;
    output += "━".repeat(40) + "\n";
    output += tokenOk
      ? "Readwise token is valid. Safari capture tools require macOS."
      : "Readwise token check failed. Fix the issue above.";

    return {
      content: [{ type: "text" as const, text: output }],
    };
  }

  const results = await Promise.allSettled([
    checkSafariRunning(),
    checkAutomationPermission(),
    checkJavaScriptPermission(),
    (async () => {
      try {
        const valid = await validateToken();
        return {
          name: "Readwise Token",
          ok: valid,
          message: valid
            ? "Token is valid"
            : "Token is invalid. Check READWISE_TOKEN env var.",
        };
      } catch (error) {
        return {
          name: "Readwise Token",
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Could not validate token",
        };
      }
    })(),
  ]);

  let output = "Safari-Readwise MCP Setup Diagnostics\n";
  output += "━".repeat(40) + "\n\n";

  let allOk = true;
  for (const result of results) {
    if (result.status === "fulfilled") {
      const { name, ok, message } = result.value;
      const icon = ok ? "[OK]" : "[FAIL]";
      output += `${icon} ${name}\n    ${message}\n\n`;
      if (!ok) allOk = false;
    } else {
      output += `[FAIL] Unknown check\n    ${result.reason}\n\n`;
      allOk = false;
    }
  }

  output += "━".repeat(40) + "\n";
  output += allOk
    ? "All checks passed! Ready to capture pages."
    : "Some checks failed. Fix the issues above and try again.";

  return {
    content: [{ type: "text" as const, text: output }],
  };
}
