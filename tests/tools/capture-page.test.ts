import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/safari/dom-capture.js", () => ({
  captureDom: vi.fn(),
}));

vi.mock("../../src/readwise/client.js", () => ({
  validateToken: vi.fn(),
  saveDocument: vi.fn(),
}));

import { captureDom } from "../../src/safari/dom-capture.js";
import { validateToken, saveDocument } from "../../src/readwise/client.js";
import { capturePageHandler } from "../../src/tools/capture-page.js";

const mockCaptureDom = vi.mocked(captureDom);
const mockValidateToken = vi.mocked(validateToken);
const mockSaveDocument = vi.mocked(saveDocument);

describe("capturePageHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures and saves successfully", async () => {
    mockValidateToken.mockResolvedValue(true);
    mockCaptureDom.mockResolvedValue({
      html: "<html>test</html>",
      url: "https://example.com",
      title: "Example",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc123",
      url: "https://readwise.io/reader/doc/doc123",
      alreadyExists: false,
    });

    const result = await capturePageHandler({});
    expect(result.content[0].text).toContain("Saved to Readwise Reader");
    expect(result.content[0].text).toContain("Example");
    expect(result.content[0].text).toContain("doc123");
    expect((result as any).isError).toBeUndefined();
  });

  it("reports when document already exists", async () => {
    mockValidateToken.mockResolvedValue(true);
    mockCaptureDom.mockResolvedValue({
      html: "<html>test</html>",
      url: "https://example.com",
      title: "Example",
    });
    mockSaveDocument.mockResolvedValue({
      id: "existing",
      url: "https://readwise.io/reader/doc/existing",
      alreadyExists: true,
    });

    const result = await capturePageHandler({});
    expect(result.content[0].text).toContain("Already existed");
  });

  it("returns error when token is invalid", async () => {
    mockValidateToken.mockResolvedValue(false);

    const result = await capturePageHandler({});
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("token is invalid");
  });

  it("passes through optional params", async () => {
    mockValidateToken.mockResolvedValue(true);
    mockCaptureDom.mockResolvedValue({
      html: "<html>test</html>",
      url: "https://example.com",
      title: "Example",
    });
    mockSaveDocument.mockResolvedValue({
      id: "doc",
      url: "https://readwise.io/reader/doc/doc",
      alreadyExists: false,
    });

    await capturePageHandler({
      tags: ["test", "safari"],
      title: "Custom Title",
      location: "later",
    });

    expect(mockSaveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["test", "safari"],
        title: "Custom Title",
        location: "later",
      }),
    );
  });

  it("returns error on capture failure", async () => {
    mockValidateToken.mockResolvedValue(true);
    mockCaptureDom.mockRejectedValue(new Error("Safari permission denied"));

    const result = await capturePageHandler({});
    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Safari permission denied");
  });
});
