import { ReadwiseApiError, ReadwiseTokenError } from "../utils/errors.js";
import type { SaveDocumentParams, SaveDocumentResponse } from "./types.js";

const SAVE_URL = "https://readwise.io/api/v3/save/";
const AUTH_URL = "https://readwise.io/api/v3/auth/";

function getToken(): string {
  const token = process.env.READWISE_TOKEN;
  if (!token) {
    throw new ReadwiseTokenError(
      "READWISE_TOKEN environment variable is not set. Get your token from https://readwise.io/access_token",
    );
  }
  return token;
}

export async function validateToken(token?: string): Promise<boolean> {
  const t = token ?? getToken();
  const response = await fetch(AUTH_URL, {
    headers: { Authorization: `Token ${t}` },
  });
  return response.status === 204;
}

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
  if (params.notes) body.notes = params.notes;
  if (params.should_clean_html !== undefined)
    body.should_clean_html = params.should_clean_html;
  if (params.location) body.location = params.location;
  if (params.category) body.category = params.category;
  if (params.tags) body.tags = params.tags;

  const response = await fetch(SAVE_URL, {
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
