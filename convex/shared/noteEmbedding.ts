export const NOTE_EMBEDDING_DELAY_MS = 5_000;

const MIN_EMBEDDING_TEXT_LENGTH = 20;

export interface NoteEmbeddingSnapshot {
  title: string;
  content: string;
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function getNoteEmbeddingSnapshot(
  current: NoteEmbeddingSnapshot | null,
  next: NoteEmbeddingSnapshot,
): NoteEmbeddingSnapshot | null {
  if (
    current &&
    current.title === next.title &&
    current.content === next.content
  ) {
    return null;
  }

  const text = plainText(`${next.title} ${next.content}`);
  if (text.length < MIN_EMBEDDING_TEXT_LENGTH) {
    return null;
  }

  return next;
}

export function noteEmbeddingInput(
  snapshot: NoteEmbeddingSnapshot,
): string {
  return `${snapshot.title}\n\n${snapshot.content}`;
}
