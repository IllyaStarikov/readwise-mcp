import { getToken, handleApiResponse } from "./shared.js";
import { rateLimitedFetch } from "./rate-limiter.js";
import type {
  CreateHighlightsParams,
  CreateHighlightsBookResponse,
  HighlightResult,
  ListHighlightsParams,
  ListHighlightsResponse,
  UpdateHighlightParams,
  ListBooksParams,
  ListBooksResponse,
  BookResult,
  ExportHighlightsParams,
  ExportHighlightsResponse,
  DailyReviewResponse,
} from "./classic-types.js";

const BASE_V2 = "https://readwise.io/api/v2";

// ── Create Highlights ──

export async function createHighlights(
  params: CreateHighlightsParams,
): Promise<CreateHighlightsBookResponse[]> {
  const token = getToken();

  const response = await rateLimitedFetch(`${BASE_V2}/highlights/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  await handleApiResponse(response, "Create highlights");

  return (await response.json()) as CreateHighlightsBookResponse[];
}

// ── List Highlights ──

export async function listHighlights(
  params: ListHighlightsParams = {},
): Promise<ListHighlightsResponse> {
  const token = getToken();
  const url = new URL(`${BASE_V2}/highlights/`);

  if (params.book_id) url.searchParams.set("book_id", String(params.book_id));
  if (params.page_size) url.searchParams.set("page_size", String(params.page_size));
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.updatedAfter) url.searchParams.set("updated__gt", params.updatedAfter);

  const response = await rateLimitedFetch(url.toString(), {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "List highlights");

  return (await response.json()) as ListHighlightsResponse;
}

// ── Get Highlight ──

export async function getHighlight(id: number): Promise<HighlightResult> {
  const token = getToken();

  const response = await rateLimitedFetch(`${BASE_V2}/highlights/${id}/`, {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "Get highlight");

  return (await response.json()) as HighlightResult;
}

// ── Update Highlight ──

export async function updateHighlight(
  id: number,
  params: UpdateHighlightParams,
): Promise<HighlightResult> {
  const token = getToken();

  const response = await rateLimitedFetch(`${BASE_V2}/highlights/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  await handleApiResponse(response, "Update highlight");

  return (await response.json()) as HighlightResult;
}

// ── Delete Highlight ──

export async function deleteHighlight(id: number): Promise<void> {
  const token = getToken();

  const response = await rateLimitedFetch(`${BASE_V2}/highlights/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "Delete highlight");
}

// ── List Books ──

export async function listBooks(
  params: ListBooksParams = {},
): Promise<ListBooksResponse> {
  const token = getToken();
  const url = new URL(`${BASE_V2}/books/`);

  if (params.category) url.searchParams.set("category", params.category);
  if (params.source) url.searchParams.set("source", params.source);
  if (params.page_size) url.searchParams.set("page_size", String(params.page_size));
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.updatedAfter) url.searchParams.set("updated__gt", params.updatedAfter);

  const response = await rateLimitedFetch(url.toString(), {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "List books");

  return (await response.json()) as ListBooksResponse;
}

// ── Get Book ──

export async function getBook(id: number): Promise<BookResult> {
  const token = getToken();

  const response = await rateLimitedFetch(`${BASE_V2}/books/${id}/`, {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "Get book");

  return (await response.json()) as BookResult;
}

// ── Export Highlights ──

export async function exportHighlights(
  params: ExportHighlightsParams = {},
): Promise<ExportHighlightsResponse> {
  const token = getToken();
  const url = new URL(`${BASE_V2}/export/`);

  if (params.updatedAfter) url.searchParams.set("updatedAfter", params.updatedAfter);
  if (params.ids) url.searchParams.set("ids", params.ids.join(","));
  if (params.pageCursor) url.searchParams.set("pageCursor", params.pageCursor);

  const response = await rateLimitedFetch(url.toString(), {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "Export highlights");

  return (await response.json()) as ExportHighlightsResponse;
}

// ── Daily Review ──

export async function getDailyReview(): Promise<DailyReviewResponse> {
  const token = getToken();

  const response = await rateLimitedFetch(`${BASE_V2}/review/`, {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "Daily review");

  return (await response.json()) as DailyReviewResponse;
}
