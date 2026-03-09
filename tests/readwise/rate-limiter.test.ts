import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  rateLimitedFetch,
  _resetForTesting,
} from "../../src/readwise/rate-limiter.js";

describe("rate-limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    _resetForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function okResponse(body = "ok"): Response {
    return new Response(body, { status: 200 });
  }

  function rateLimitResponse(retryAfter = "2"): Response {
    return new Response("rate limited", {
      status: 429,
      headers: { "Retry-After": retryAfter },
    });
  }

  it("passes a single request through to fetch", async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    const promise = rateLimitedFetch("https://example.com");
    await vi.advanceTimersByTimeAsync(0);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com", undefined);
  });

  it("spaces multiple requests by MIN_INTERVAL_MS", async () => {
    mockFetch.mockResolvedValue(okResponse());
    const callTimes: number[] = [];
    mockFetch.mockImplementation(() => {
      callTimes.push(Date.now());
      return Promise.resolve(okResponse());
    });

    const p1 = rateLimitedFetch("https://example.com/1");
    const p2 = rateLimitedFetch("https://example.com/2");
    const p3 = rateLimitedFetch("https://example.com/3");

    // Process queue
    await vi.advanceTimersByTimeAsync(5000);

    await Promise.all([p1, p2, p3]);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Second call should be at least 1300ms after the first
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(1300);
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(1300);
  });

  it("processes requests in FIFO order", async () => {
    const order: string[] = [];
    mockFetch.mockImplementation((url: string) => {
      order.push(url);
      return Promise.resolve(okResponse());
    });

    const p1 = rateLimitedFetch("first");
    const p2 = rateLimitedFetch("second");
    const p3 = rateLimitedFetch("third");

    await vi.advanceTimersByTimeAsync(5000);
    await Promise.all([p1, p2, p3]);

    expect(order).toEqual(["first", "second", "third"]);
  });

  it("retries on 429 using Retry-After header", async () => {
    mockFetch
      .mockResolvedValueOnce(rateLimitResponse("2"))
      .mockResolvedValueOnce(okResponse("success"));

    const promise = rateLimitedFetch("https://example.com");

    // First call happens immediately, gets 429 with Retry-After: 2
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance past the 2-second retry wait
    await vi.advanceTimersByTimeAsync(2500);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns 429 response after exhausting retries", async () => {
    mockFetch.mockResolvedValue(rateLimitResponse("1"));

    const promise = rateLimitedFetch("https://example.com");

    // Process all retries (3 retries × 1s each + initial call)
    await vi.advanceTimersByTimeAsync(10000);

    const response = await promise;
    expect(response.status).toBe(429);
    // Initial call + 3 retries = 4 total
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("propagates network errors from fetch", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const promise = rateLimitedFetch("https://example.com");
    // Attach catch handler before advancing timers to avoid unhandled rejection
    const caught = promise.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(0);

    const error = await caught;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Network error");
  });

  it("continues processing queue after an error", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(okResponse("success"));

    const p1 = rateLimitedFetch("https://example.com/1");
    // Attach catch handler before advancing timers to avoid unhandled rejection
    const p1Caught = p1.catch((e: unknown) => e);
    const p2 = rateLimitedFetch("https://example.com/2");

    await vi.advanceTimersByTimeAsync(5000);

    const error = await p1Caught;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Network error");
    const response = await p2;
    expect(response.status).toBe(200);
  });

  it("passes request init options through", async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    const init = {
      method: "DELETE",
      headers: { Authorization: "Token abc" },
    };
    const promise = rateLimitedFetch("https://example.com", init);
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    expect(mockFetch).toHaveBeenCalledWith("https://example.com", init);
  });
});
