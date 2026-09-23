export type PublicNoteDto = {
  id: string;
  title: string;
  content: string | null;
  style?: string | null;
  outlineData?: string | null;
  outlineMetadata?: unknown;
  createdAt: string | number;
  updatedAt: string | number;
};
