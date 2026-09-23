export type SearchResultDto = {
  type: "note" | "file" | "deck";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
};

export type SearchResponseDto = {
  results: SearchResultDto[];
  limitReached: boolean;
  totalFound?: number;
};

export type KeywordMatchDto = {
  noteId: string;
  title: string;
  snippet: string;
  matchedKeywords: string[];
  url: string;
};

export type SearchNoteContentResponseDto = {
  matches: KeywordMatchDto[];
};
