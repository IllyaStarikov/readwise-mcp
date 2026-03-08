import { execFile } from "node:child_process";
import {
  SafariNotRunningError,
  SafariPermissionError,
  TccPermissionError,
} from "../utils/errors.js";

export interface AppleScriptResult {
  stdout: string;
  stderr: string;
}

export function runAppleScript(script: string): Promise<AppleScriptResult> {
  return new Promise((resolve, reject) => {
    execFile(
      "osascript",
      ["-e", script],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = error.message || "";
          if (msg.includes("-1743")) {
            reject(new SafariPermissionError());
          } else if (
            msg.includes("Application isn't running") ||
            msg.includes("not running")
          ) {
            reject(new SafariNotRunningError());
          } else if (
            msg.includes("not allowed assistive access") ||
            msg.includes("1002")
          ) {
            reject(new TccPermissionError());
          } else {
            reject(
              new Error(`AppleScript error: ${msg.trim() || stderr.trim()}`),
            );
          }
          return;
        }
        resolve({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd() });
      },
    );
  });
}
