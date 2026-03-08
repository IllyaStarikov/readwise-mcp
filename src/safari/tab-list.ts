import { runAppleScript } from "./applescript.js";

export interface SafariTab {
  windowIndex: number;
  tabIndex: number;
  url: string;
  title: string;
}

export async function listTabs(): Promise<SafariTab[]> {
  const script = `
tell application "Safari"
  set output to ""
  set winCount to count of windows
  repeat with w from 1 to winCount
    set tabCount to count of tabs of window w
    repeat with t from 1 to tabCount
      set tabUrl to URL of tab t of window w
      set tabTitle to name of tab t of window w
      set output to output & w & "\\t" & t & "\\t" & tabUrl & "\\t" & tabTitle & "\\n"
    end repeat
  end repeat
  return output
end tell`;

  const { stdout } = await runAppleScript(script);
  if (!stdout.trim()) return [];

  const tabs: SafariTab[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    tabs.push({
      windowIndex: parseInt(parts[0], 10),
      tabIndex: parseInt(parts[1], 10),
      url: parts[2],
      title: parts.slice(3).join("\t"),
    });
  }
  return tabs;
}
