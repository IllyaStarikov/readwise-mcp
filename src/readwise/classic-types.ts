// ── Classic v2: Highlights ──

export interface CreateHighlightItem {
  text: string;
  title?: string;
  author?: string;
  source_url?: string;
  source_type?: string;
  category?: "books" | "articles" | "tweets" | "podcasts" | "supplementals";
  note?: string;
  location?: number;
  location_type?: "page" | "order" | "time_offset";
  highlighted_at?: string;
  highlight_url?: string;
  image_url?: string;
}

export interface CreateHighlightsParams {
  highlights: CreateHighlightItem[];
}

export interface HighlightResult {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  highlighted_at: string | null;
  url: string | null;
  color: string;
  updated: string;
  book_id: number;
  tags: Array<{ id: number; name: string }>;
}

export interface ListHighlightsParams {
  book_id?: number;
  page_size?: number;
  page?: number;
  updatedAfter?: string;
}

export interface ListHighlightsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HighlightResult[];
}

export interface UpdateHighlightParams {
  text?: string;
  note?: string;
  location?: number;
  color?: string;
}

// ── Classic v2: Books ──

export interface BookResult {
  id: number;
  title: string;
  author: string;
  category: string;
  source: string;
  num_highlights: number;
  last_highlight_at: string | null;
  updated: string;
  cover_image_url: string;
  highlights_url: string;
  source_url: string | null;
  asin: string | null;
  tags: Array<{ id: number; name: string }>;
  document_note: string;
}

export interface ListBooksParams {
  category?: string;
  source?: string;
  page_size?: number;
  page?: number;
  updatedAfter?: string;
}

export interface ListBooksResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BookResult[];
}

// ── Classic v2: Export ──

export interface ExportHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  url: string | null;
  color: string;
  updated: string;
  tags: Array<{ id: number; name: string }>;
}

export interface ExportBook {
  user_book_id: number;
  title: string;
  author: string;
  readable_title: string;
  source: string;
  cover_image_url: string;
  unique_url: string | null;
  category: string;
  document_note: string;
  readwise_url: string;
  source_url: string | null;
  asin: string | null;
  tags: Array<{ id: number; name: string }>;
  highlights: ExportHighlight[];
}

export interface ExportHighlightsParams {
  updatedAfter?: string;
  ids?: number[];
  pageCursor?: string;
}

export interface ExportHighlightsResponse {
  count: number;
  nextPageCursor: string | null;
  results: ExportBook[];
}

// ── Classic v2: Daily Review ──

export interface DailyReviewHighlight {
  id: number;
  text: string;
  note: string;
  title: string;
  author: string;
  url: string | null;
  source_url: string | null;
  source_type: string;
  category: string;
  location_type: string;
  location: number;
  highlighted_at: string | null;
  highlight_url: string | null;
  image_url: string;
  api_source: string | null;
}

export interface DailyReviewResponse {
  review_id: number;
  review_url: string;
  review_completed: boolean;
  highlights: DailyReviewHighlight[];
}
