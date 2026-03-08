import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/classic-api.js", () => ({
  listBooks: vi.fn(),
  getBook: vi.fn(),
}));

import { listBooks, getBook } from "../../src/readwise/classic-api.js";
import { listBooksHandler } from "../../src/tools/list-books.js";

const mockListBooks = vi.mocked(listBooks);
const mockGetBook = vi.mocked(getBook);

const sampleBook = {
  id: 1,
  title: "Test Book",
  author: "Author",
  category: "books",
  source: "kindle",
  num_highlights: 10,
  last_highlight_at: "2024-01-01",
  updated: "2024-01-15",
  cover_image_url: "",
  highlights_url: "",
  source_url: "https://example.com",
  asin: null,
  tags: [{ id: 1, name: "favorite" }],
  document_note: "",
};

describe("listBooksHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated book list", async () => {
    mockListBooks.mockResolvedValue({
      count: 2,
      next: "https://readwise.io/api/v2/books/?page=2",
      previous: null,
      results: [sampleBook, { ...sampleBook, id: 2, title: "Second Book" }],
    });

    const result = await listBooksHandler({ page_size: 20 });

    expect(result.content[0].text).toContain("Found 2 book(s)");
    expect(result.content[0].text).toContain("more pages available");
    expect(result.content[0].text).toContain('"Test Book"');
    expect(result.content[0].text).toContain('"Second Book"');
    expect(result.content[0].text).toContain("Tags: favorite");
  });

  it("gets single book by ID", async () => {
    mockGetBook.mockResolvedValue(sampleBook);

    const result = await listBooksHandler({ id: 1 });

    expect(mockGetBook).toHaveBeenCalledWith(1);
    expect(result.content[0].text).toContain('"Test Book"');
    expect(result.content[0].text).toContain("Author");
    expect(result.content[0].text).toContain("ID: 1");
    expect(result.content[0].text).toContain("Highlights: 10");
    expect(result.content[0].text).toContain("URL: https://example.com");
  });

  it("handles empty results", async () => {
    mockListBooks.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    const result = await listBooksHandler({});

    expect(result.content[0].text).toContain("No books found.");
  });

  it("returns isError on failure", async () => {
    mockListBooks.mockRejectedValue(new Error("Unauthorized"));

    const result = await listBooksHandler({});

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Unauthorized");
  });
});
