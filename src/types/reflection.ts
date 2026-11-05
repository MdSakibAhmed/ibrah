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
  audioUri?: string | null;
  audioDurationSeconds?: number;
  isFavorite: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  backupStatus?: 'local' | 'synced' | 'pending';
}

export interface BackupPackage {
  appVersion: string;
  exportedAt: string;
  deviceInfo?: string;
  totalCount: number;
  reflections: Reflection[];
  signature: string; // checksum/verification tag
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
