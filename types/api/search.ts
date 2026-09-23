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
