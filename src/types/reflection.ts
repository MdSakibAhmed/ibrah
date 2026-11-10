export interface Reflection {
  id: string;
  title: string;
  rawTranscript: string;
  story: string;
  learning: string;
  actionCommitment: string;
  summary: string;
  category: string;
  tags: string[];
  audioUri?: string | null; // Device-local playable audio path (only stored locally, not synced to cloud)
  audioDurationSeconds: number;
  isFavorite: boolean;
  createdAt: string; // ISO 8601 UTC string
  updatedAt: string; // ISO 8601 UTC string
}

export interface AIAnalysisResult {
  title: string;
  rawTranscript?: string;
  story: string;
  learning: string;
  actionCommitment: string;
  summary: string;
  category: string;
  tags: string[];
}
