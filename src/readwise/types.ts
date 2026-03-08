// ── Save Document (v3) ──

export interface SaveDocumentParams {
  url: string;
  html: string;
  title?: string;
  author?: string;
  summary?: string;
  published_date?: string;
  image_url?: string;
  tags?: string[];
  should_clean_html?: boolean;
  location?: "new" | "later" | "archive" | "feed";
  category?: "article" | "email" | "rss" | "highlight" | "note" | "pdf" | "epub" | "tweet" | "video";
  notes?: string;
  saved_using?: string;
}

export interface SaveDocumentResponse {
  id: string;
  url: string;
  alreadyExists: boolean;
}

// ── Reader v3: List Documents ──

export type DocumentLocation = "new" | "later" | "shortlist" | "archive" | "feed";
export type DocumentCategory =
  | "article" | "email" | "rss" | "highlight" | "note"
  | "pdf" | "epub" | "tweet" | "video";

export interface ListDocumentsParams {
  id?: string;
  updatedAfter?: string;
  location?: DocumentLocation;
  category?: DocumentCategory;
  tag?: string;
  withHtmlContent?: boolean;
  pageCursor?: string;
}

export interface ReaderDocument {
  id: string;
  url: string;
  source_url: string;
  title: string;
  author: string;
  source: string;
  category: string;
  location: string;
  tags: Record<string, string>;
  site_name: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  published_date: string | null;
  summary: string;
  image_url: string;
  notes: string;
  parent_id: string | null;
  reading_progress: number;
}

export interface ListDocumentsResponse {
  count: number;
  nextPageCursor: string | null;
  results: ReaderDocument[];
}

// ── Reader v3: Update Document ──

export interface UpdateDocumentParams {
  document_id: string;
  title?: string;
  author?: string;
  summary?: string;
  published_date?: string;
  image_url?: string;
  location?: DocumentLocation;
  category?: DocumentCategory;
  tags?: string[];
  notes?: string;
  seen?: boolean;
}

// ── Reader v3: Bulk Update Documents ──

export interface BulkUpdateItem {
  document_id: string;
  title?: string;
  author?: string;
  summary?: string;
  published_date?: string;
  image_url?: string;
  location?: DocumentLocation;
  category?: DocumentCategory;
  tags?: string[];
  notes?: string;
  seen?: boolean;
}

// ── Reader v3: Tags ──

export interface ReaderTag {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}
