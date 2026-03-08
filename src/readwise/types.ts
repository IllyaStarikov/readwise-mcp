export interface SaveDocumentParams {
  url: string;
  html: string;
  title?: string;
  author?: string;
  summary?: string;
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
