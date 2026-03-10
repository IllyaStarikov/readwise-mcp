import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/tab-list.js", () => ({
  listTabs: vi.fn(),
}));

vi.mock("../../src/safari/dom-capture.js", () => ({
  captureDom: vi.fn(),
}));

vi.mock("../../src/readwise/client.js", () => ({
  validateToken: vi.fn(),
  saveDocument: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logError: vi.fn(),
}));

vi.mock("../../src/utils/platform.js", () => ({
  isMacOS: vi.fn(),
}));

import { listTabs } from "../../src/safari/tab-list.js";
import { captureDom } from "../../src/safari/dom-capture.js";
import { validateToken, saveDocument } from "../../src/readwise/client.js";
import { isMacOS } from "../../src/utils/platform.js";
import { captureTabsHandler } from "../../src/tools/capture-tabs.js";

const mockListTabs = vi.mocked(listTabs);
const mockCaptureDom = vi.mocked(captureDom);
const mockValidateToken = vi.mocked(validateToken);
const mockSaveDocument = vi.mocked(saveDocument);
const mockIsMacOS = vi.mocked(isMacOS);

describe("captureTabsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIsMacOS.mockReturnValue(true);
    mockValidateToken.mockResolvedValue(true);
  });

  it("captures all tabs", async () => {
    mockListTabs.mockResolvedValue([
      { windowIndex: 1, tabIndex: 1, url: "https://a.com", title: "A" },
      { windowIndex: 1, tabIndex: 2, url: "https://b.com", title: "B" },
    ]);
    mockCaptureDom.mockResolvedValueOnce({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockCaptureDom.mockResolvedValueOnce({
      html: "<html>b</html>",
      url: "https://b.com",
      title: "B",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const promise = captureTabsHandler({});
    // Advance timers for rate limiting delay
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.content[0].text).toContain("Captured 2/2 tabs");
    expect(mockCaptureDom).toHaveBeenCalledTimes(2);
  });

  it("filters by URLs when provided", async () => {
    mockListTabs.mockResolvedValue([
      { windowIndex: 1, tabIndex: 1, url: "https://a.com", title: "A" },
      { windowIndex: 1, tabIndex: 2, url: "https://b.com", title: "B" },
    ]);
    mockCaptureDom.mockResolvedValue({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const result = await captureTabsHandler({ urls: ["https://a.com"] });
    expect(mockCaptureDom).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toContain("Captured 1/1 tabs");
  });

  it("reports no matching tabs", async () => {
    mockListTabs.mockResolvedValue([]);
    const result = await captureTabsHandler({});
    expect(result.content[0].text).toContain("No matching Safari tabs");
  });

  it("returns error when token is invalid", async () => {
    mockValidateToken.mockResolvedValue(false);
    const result = await captureTabsHandler({});
    expect((result as any).isError).toBe(true);
  });

  it("handles partial failures", async () => {
    mockListTabs.mockResolvedValue([
      { windowIndex: 1, tabIndex: 1, url: "https://a.com", title: "A" },
      { windowIndex: 1, tabIndex: 2, url: "https://b.com", title: "B" },
    ]);
    mockCaptureDom.mockResolvedValueOnce({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockCaptureDom.mockRejectedValueOnce(new Error("capture failed"));
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const promise = captureTabsHandler({});
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.content[0].text).toContain("1/2 tabs");
    expect(result.content[0].text).toContain("1 failed");
    expect(result.content[0].text).toContain("[FAIL]");
  });

  it("returns error on non-macOS", async () => {
    mockIsMacOS.mockReturnValue(false);

    const result = await captureTabsHandler({});

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("requires macOS");
    expect(mockListTabs).not.toHaveBeenCalled();
    expect(mockValidateToken).not.toHaveBeenCalled();
  });
});
