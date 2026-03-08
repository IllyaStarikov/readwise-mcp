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
  set theTitle to name of theTab
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
