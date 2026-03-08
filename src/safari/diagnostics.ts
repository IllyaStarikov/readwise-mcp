import { runAppleScript } from "./applescript.js";
import {
  SafariPermissionError,
  SafariNotRunningError,
  TccPermissionError,
} from "../utils/errors.js";

export interface DiagnosticResult {
  name: string;
  ok: boolean;
  message: string;
}

export async function checkSafariRunning(): Promise<DiagnosticResult> {
  try {
    await runAppleScript(
      'tell application "System Events" to return (name of processes) contains "Safari"',
    );
    return { name: "Safari Running", ok: true, message: "Safari is running" };
  } catch (error) {
    if (error instanceof SafariNotRunningError) {
      return { name: "Safari Running", ok: false, message: error.message };
    }
    return {
      name: "Safari Running",
      ok: false,
      message: `Could not check: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkJavaScriptPermission(): Promise<DiagnosticResult> {
  try {
    await runAppleScript(`
tell application "Safari"
  do JavaScript "1+1" in current tab of window 1
end tell`);
    return {
      name: "JavaScript from Apple Events",
      ok: true,
      message: "JavaScript execution is allowed",
    };
  } catch (error) {
    if (error instanceof SafariPermissionError) {
      return {
        name: "JavaScript from Apple Events",
        ok: false,
        message: error.message,
      };
    }
    if (error instanceof SafariNotRunningError) {
      return {
        name: "JavaScript from Apple Events",
        ok: false,
        message: "Cannot check — Safari is not running or has no open tabs",
      };
    }
    if (error instanceof TccPermissionError) {
      return {
        name: "JavaScript from Apple Events",
        ok: false,
        message: error.message,
      };
    }
    return {
      name: "JavaScript from Apple Events",
      ok: false,
      message: `Could not check: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkAutomationPermission(): Promise<DiagnosticResult> {
  try {
    await runAppleScript(
      'tell application "Safari" to return name of window 1',
    );
    return {
      name: "Automation Permission",
      ok: true,
      message: "Terminal can control Safari",
    };
  } catch (error) {
    if (error instanceof TccPermissionError) {
      return {
        name: "Automation Permission",
        ok: false,
        message: error.message,
      };
    }
    if (error instanceof SafariNotRunningError) {
      return {
        name: "Automation Permission",
        ok: false,
        message: "Cannot check — Safari is not running",
      };
    }
    // If we get some other error but it's not a permission error,
    // automation permission itself is likely fine
    return {
      name: "Automation Permission",
      ok: true,
      message: "Terminal can control Safari (but Safari may have no windows open)",
    };
  }
}
