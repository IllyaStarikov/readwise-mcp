import { ReadwiseApiError, ReadwiseTokenError } from "../utils/errors.js";
import { getToken, handleApiResponse } from "./shared.js";
import type {
  SaveDocumentParams,
  SaveDocumentResponse,
  ListDocumentsParams,
  ListDocumentsResponse,
  ReaderDocument,
  UpdateDocumentParams,
  BulkUpdateItem,
  ReaderTag,
} from "./types.js";

const BASE_V3 = "https://readwise.io/api/v3";

// ── Auth ──

export async function validateToken(token?: string): Promise<boolean> {
  const t = token ?? getToken();
  const response = await fetch(`${BASE_V3}/auth/`, {
    headers: { Authorization: `Token ${t}` },
  });
  return response.status === 204;
}

// ── Save Document ──

export async function saveDocument(
  params: SaveDocumentParams,
): Promise<SaveDocumentResponse> {
  const token = getToken();

  const body: Record<string, unknown> = {
    url: params.url,
    html: params.html,
    saved_using: params.saved_using ?? "safari-readwise-mcp",
  };

  if (params.title) body.title = params.title;
  if (params.author) body.author = params.author;
  if (params.summary) body.summary = params.summary;
  if (params.published_date) body.published_date = params.published_date;
  if (params.image_url) body.image_url = params.image_url;
  if (params.notes) body.notes = params.notes;
  if (params.should_clean_html !== undefined)
    body.should_clean_html = params.should_clean_html;
  if (params.location) body.location = params.location;
  if (params.category) body.category = params.category;
  if (params.tags) body.tags = params.tags;

  const response = await fetch(`${BASE_V3}/save/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new ReadwiseTokenError();
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") || "60";
    throw new ReadwiseApiError(
      `Rate limited by Readwise. Retry after ${retryAfter} seconds.`,
      429,
    );
  }

  if (response.status !== 200 && response.status !== 201) {
    const text = await response.text().catch(() => "");
    throw new ReadwiseApiError(
      `Readwise API returned ${response.status}: ${text}`,
      response.status,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  return {
    id: String(data.id ?? ""),
    url: String(data.url ?? params.url),
    alreadyExists: response.status === 200,
  };
}

// ── List Documents ──

export async function listDocuments(
  params: ListDocumentsParams = {},
): Promise<ListDocumentsResponse> {
  const token = getToken();
  const url = new URL(`${BASE_V3}/list/`);

  if (params.id) url.searchParams.set("id", params.id);
  if (params.updatedAfter) url.searchParams.set("updatedAfter", params.updatedAfter);
  if (params.location) url.searchParams.set("location", params.location);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.tag) url.searchParams.set("tag", params.tag);
  if (params.withHtmlContent) url.searchParams.set("withHtmlContent", "true");
  if (params.pageCursor) url.searchParams.set("pageCursor", params.pageCursor);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "List documents");

  const data = (await response.json()) as {
    count: number;
    nextPageCursor: string | null;
    results: ReaderDocument[];
  };

  return data;
}

// ── Update Document ──

export async function updateDocument(
  params: UpdateDocumentParams,
): Promise<ReaderDocument> {
  const token = getToken();
  const { document_id, ...fields } = params;

  const response = await fetch(`${BASE_V3}/update/${document_id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields),
  });

  await handleApiResponse(response, "Update document");

  return (await response.json()) as ReaderDocument;
}

// ── Delete Document ──

export async function deleteDocument(documentId: string): Promise<void> {
  const token = getToken();

  const response = await fetch(`${BASE_V3}/delete/${documentId}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "Delete document");
}

// ── Bulk Update Documents ──

export async function bulkUpdateDocuments(
  updates: BulkUpdateItem[],
): Promise<void> {
  const token = getToken();

  const response = await fetch(`${BASE_V3}/bulk_update/`, {
    method: "PATCH",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  await handleApiResponse(response, "Bulk update documents");
}

// ── List Tags ──

export async function listReaderTags(): Promise<ReaderTag[]> {
  const token = getToken();

  const response = await fetch(`${BASE_V3}/tags/`, {
    headers: { Authorization: `Token ${token}` },
  });

  await handleApiResponse(response, "List tags");

  return (await response.json()) as ReaderTag[];
}
