import { runAppleScript } from "./applescript.js";
import { withTempFile, readTempFile } from "../utils/temp-file.js";

export interface CapturedDom {
  html: string;
  url: string;
  title: string;
}

export async function captureDom(
  windowIndex = 1,
  tabIndex?: number,
): Promise<CapturedDom> {
  return withTempFile(async (tempPath) => {
    const tabRef = tabIndex
      ? `tab ${tabIndex} of window ${windowIndex}`
      : `current tab of window ${windowIndex}`;

    const script = `
tell application "Safari"
  set theTab to ${tabRef}
  set theUrl to URL of theTab
  set jsTitle to do JavaScript "document.title" in theTab
  if jsTitle is not "" then
    set theTitle to jsTitle
  else
    set theTitle to name of theTab
  end if
  set theHtml to do JavaScript "document.documentElement.outerHTML" in theTab

  set filePath to POSIX file "${tempPath}"
  set fileRef to open for access filePath with write permission
  set eof of fileRef to 0
  write theHtml to fileRef as «class utf8»
  close access fileRef

  return theUrl & "\\n" & theTitle
end tell`;

    const { stdout } = await runAppleScript(script);
    const lines = stdout.split("\n");
    const url = lines[0] || "";
    const title = lines.slice(1).join("\n") || "";

    const html = await readTempFile(tempPath);

    return { html, url, title };
  });
}

export interface OpenAndCaptureOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  closeAfterCapture?: boolean;
  settleDelayMs?: number;
}

function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function openAndCaptureDom(
  url: string,
  options?: OpenAndCaptureOptions,
): Promise<CapturedDom> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 500;
  const closeAfterCapture = options?.closeAfterCapture ?? true;
  const settleDelayMs = options?.settleDelayMs ?? 3000;

  const escapedUrl = escapeForAppleScript(url);

  // Open URL in Safari and get the tab coordinates
  const openScript = `
tell application "Safari"
  activate
  if (count of windows) = 0 then
    make new document with properties {URL:"${escapedUrl}"}
    return "1" & "\\n" & "1"
  else
    tell window 1
      make new tab with properties {URL:"${escapedUrl}"}
    end tell
    set tabCount to count of tabs of window 1
    return "1" & "\\n" & tabCount
  end if
end tell`;

  const { stdout: openResult } = await runAppleScript(openScript);
  const [windowStr, tabStr] = openResult.split("\n");
  const windowIndex = parseInt(windowStr, 10);
  const tabIndex = parseInt(tabStr, 10);

  // Poll document.readyState until "complete" or timeout
  const deadline = Date.now() + timeoutMs;
  let loaded = false;
  while (Date.now() < deadline) {
    try {
      const { stdout } = await runAppleScript(`
tell application "Safari"
  do JavaScript "document.readyState" in tab ${tabIndex} of window ${windowIndex}
end tell`);
      if (stdout.trim() === "complete") {
        loaded = true;
        break;
      }
    } catch {
      // Tab may not be ready for JS execution yet
    }
    await delay(pollIntervalMs);
  }

  if (!loaded) {
    // Close the tab we opened before throwing
    if (closeAfterCapture) {
      try {
        await runAppleScript(`
tell application "Safari"
  close tab ${tabIndex} of window ${windowIndex}
end tell`);
      } catch {
        // Best-effort cleanup
      }
    }
    throw new Error(
      `Page did not finish loading within ${timeoutMs / 1000} seconds: ${url}`,
    );
  }

  // Wait for dynamic content to settle (JS rendering, API calls, title updates)
  await delay(settleDelayMs);

  // Capture the DOM using the existing function
  const dom = await captureDom(windowIndex, tabIndex);

  // Close the tab if requested
  if (closeAfterCapture) {
    try {
      await runAppleScript(`
tell application "Safari"
  close tab ${tabIndex} of window ${windowIndex}
end tell`);
    } catch {
      // Best-effort cleanup
    }
  }

  return dom;
}
