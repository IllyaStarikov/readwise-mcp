import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/readwise/classic-api.js", () => ({
  getDailyReview: vi.fn(),
}));

import { getDailyReview } from "../../src/readwise/classic-api.js";
import { dailyReviewHandler } from "../../src/tools/daily-review.js";

const mockGetDailyReview = vi.mocked(getDailyReview);

describe("dailyReviewHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted daily review with highlights", async () => {
    mockGetDailyReview.mockResolvedValue({
      review_id: 100,
      review_url: "https://readwise.io/review/100",
      review_completed: false,
      highlights: [
        {
          id: 1,
          text: "Great quote",
          note: "",
          title: "Book Title",
          author: "Author",
          url: null,
          source_url: "https://example.com",
          source_type: "kindle",
          category: "books",
          location_type: "page",
          location: 42,
          highlighted_at: null,
          highlight_url: null,
          image_url: "",
          api_source: null,
        },
      ],
    });

    const result = await dailyReviewHandler();

    expect(result.content[0].text).toContain("Daily Review (1 highlight(s))");
    expect(result.content[0].text).toContain("Review URL: https://readwise.io/review/100");
    expect(result.content[0].text).toContain("Completed: No");
    expect(result.content[0].text).toContain('"Great quote"');
    expect(result.content[0].text).toContain('"Book Title" by Author');
    expect(result.content[0].text).toContain("ID: 1");
    expect(result.content[0].text).toContain("Category: books");
    expect(result.content[0].text).toContain("URL: https://example.com");
  });

  it("handles empty review", async () => {
    mockGetDailyReview.mockResolvedValue({
      review_id: 101,
      review_url: "https://readwise.io/review/101",
      review_completed: true,
      highlights: [],
    });

    const result = await dailyReviewHandler();

    expect(result.content[0].text).toContain("No highlights in today's daily review.");
  });

  it("returns isError on failure", async () => {
    mockGetDailyReview.mockRejectedValue(new Error("Service unavailable"));

    const result = await dailyReviewHandler();

    expect((result as any).isError).toBe(true);
    expect(result.content[0].text).toContain("Service unavailable");
  });
});
