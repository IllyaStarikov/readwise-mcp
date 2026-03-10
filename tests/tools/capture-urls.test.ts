import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/safari/dom-capture.js", () => ({
  openAndCaptureDom: vi.fn(),
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

import { openAndCaptureDom } from "../../src/safari/dom-capture.js";
import { validateToken, saveDocument } from "../../src/readwise/client.js";
import { isMacOS } from "../../src/utils/platform.js";
import { captureUrlsHandler } from "../../src/tools/capture-urls.js";

const mockOpenAndCaptureDom = vi.mocked(openAndCaptureDom);
const mockValidateToken = vi.mocked(validateToken);
const mockSaveDocument = vi.mocked(saveDocument);
const mockIsMacOS = vi.mocked(isMacOS);

describe("captureUrlsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIsMacOS.mockReturnValue(true);
    mockValidateToken.mockResolvedValue(true);
  });

  it("captures all URLs on macOS via Safari", async () => {
    mockOpenAndCaptureDom.mockResolvedValueOnce({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockOpenAndCaptureDom.mockResolvedValueOnce({
      html: "<html>b</html>",
      url: "https://b.com",
      title: "B",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const promise = captureUrlsHandler({
      urls: ["https://a.com", "https://b.com"],
    });
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result.content[0].text).toContain("Captured 2/2 URLs");
    expect(mockOpenAndCaptureDom).toHaveBeenCalledTimes(2);
    expect(mockSaveDocument).toHaveBeenCalledTimes(2);
  });

  it("passes closeAfterCapture to openAndCaptureDom", async () => {
    mockOpenAndCaptureDom.mockResolvedValue({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const promise = captureUrlsHandler({
      urls: ["https://a.com"],
      closeAfterCapture: false,
    });
    await vi.advanceTimersByTimeAsync(10000);
    await promise;

    expect(mockOpenAndCaptureDom).toHaveBeenCalledWith("https://a.com", {
      closeAfterCapture: false,
    });
  });

  it("passes tags and metadata to saveDocument", async () => {
    mockOpenAndCaptureDom.mockResolvedValue({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const promise = captureUrlsHandler({
      urls: ["https://a.com"],
      tags: ["test"],
      author: "Author",
      summary: "Summary",
      location: "later",
      category: "article",
      notes: "Notes",
    });
    await vi.advanceTimersByTimeAsync(10000);
    await promise;

    expect(mockSaveDocument).toHaveBeenCalledWith({
      url: "https://a.com",
      html: "<html>a</html>",
      title: "A",
      author: "Author",
      summary: "Summary",
      tags: ["test"],
      should_clean_html: undefined,
      location: "later",
      category: "article",
      notes: "Notes",
    });
  });

  it("falls back to directSave on non-macOS", async () => {
    mockIsMacOS.mockReturnValue(false);
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const result = await captureUrlsHandler({
      urls: ["https://a.com", "https://b.com"],
    });

    expect(result.content[0].text).toContain("Captured 2/2 URLs");
    expect(result.content[0].text).toContain("direct save");
    expect(mockOpenAndCaptureDom).not.toHaveBeenCalled();
    expect(mockSaveDocument).toHaveBeenCalledTimes(2);
  });

  it("reports already-existed URLs", async () => {
    mockOpenAndCaptureDom.mockResolvedValue({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: true,
    });

    const promise = captureUrlsHandler({ urls: ["https://a.com"] });
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result.content[0].text).toContain("already existed");
  });

  it("returns error when token is invalid", async () => {
    mockValidateToken.mockResolvedValue(false);
    const result = await captureUrlsHandler({ urls: ["https://a.com"] });
    expect((result as any).isError).toBe(true);
  });

  it("handles partial failures", async () => {
    mockOpenAndCaptureDom.mockResolvedValueOnce({
      html: "<html>a</html>",
      url: "https://a.com",
      title: "A",
    });
    mockOpenAndCaptureDom.mockRejectedValueOnce(new Error("capture failed"));
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: false,
    });

    const promise = captureUrlsHandler({
      urls: ["https://a.com", "https://b.com"],
    });
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result.content[0].text).toContain("1/2 URLs");
    expect(result.content[0].text).toContain("1 failed");
    expect(result.content[0].text).toContain("[FAIL]");
    expect(result.content[0].text).toContain("[OK]");
  });

  it("sets isError when all URLs fail", async () => {
    mockOpenAndCaptureDom.mockRejectedValue(new Error("capture failed"));

    const promise = captureUrlsHandler({
      urls: ["https://a.com", "https://b.com"],
    });
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result.content[0].text).toContain("0/2 URLs");
    expect((result as any).isError).toBe(true);
  });

  it("non-macOS directSave reports already-existed", async () => {
    mockIsMacOS.mockReturnValue(false);
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/doc",
      alreadyExists: true,
    });

    const result = await captureUrlsHandler({ urls: ["https://a.com"] });

    expect(result.content[0].text).toContain("already existed");
  });
});
