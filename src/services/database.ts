import * as SQLite from 'expo-sqlite';
import { Reflection } from '../types/reflection';
import { SecurityService } from './securityService';

const DB_NAME = 'ibrah_reflections.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await dbInstance.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS reflections (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        raw_transcript TEXT,
        story TEXT NOT NULL,
        learning TEXT NOT NULL,
        action_commitment TEXT,
        summary TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL,
        audio_uri TEXT,
        audio_duration_seconds REAL,
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        backup_status TEXT DEFAULT 'local'
      );
      CREATE INDEX IF NOT EXISTS idx_reflections_category ON reflections(category);
      CREATE INDEX IF NOT EXISTS idx_reflections_created_at ON reflections(created_at);
    `);
  }
  return dbInstance;
}

interface DBRow {
  id: string;
  title: string;
  raw_transcript: string | null;
  story: string;
  learning: string;
  action_commitment: string | null;
  summary: string;
  category: string;
  tags: string;
  audio_uri: string | null;
  audio_duration_seconds: number | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
  backup_status: 'local' | 'synced' | 'pending';
}

function mapRowToReflection(row: DBRow): Reflection {
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(row.tags);
  } catch {
    parsedTags = [];
  }

  return {
    id: row.id,
    title: row.title,
    rawTranscript: row.raw_transcript || '',
    story: row.story,
    learning: row.learning,
    actionCommitment: row.action_commitment || '',
    summary: row.summary,
    category: row.category,
    tags: Array.isArray(parsedTags) ? parsedTags : [],
    audioUri: row.audio_uri,
    audioDurationSeconds: row.audio_duration_seconds ?? 0,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    backupStatus: row.backup_status,
  };
}

export class DatabaseService {
  /**
   * Initialize the database and ensure schemas are ready
   */
  static async init(): Promise<void> {
    await getDatabase();
  }

  /**
   * Get all reflections with optional category and search filtering
   */
  static async getReflections(options?: {
    category?: string;
    searchQuery?: string;
    favoritesOnly?: boolean;
  }): Promise<Reflection[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM reflections WHERE 1=1';
    const params: (string | number)[] = [];

    if (options?.category && options.category !== 'all') {
      query += ' AND category = ?';
      params.push(options.category);
    }

    if (options?.favoritesOnly) {
      query += ' AND is_favorite = 1';
    }

    if (options?.searchQuery) {
      const sanitized = `%${SecurityService.sanitizeText(options.searchQuery)}%`;
      query += ' AND (title LIKE ? OR story LIKE ? OR learning LIKE ? OR summary LIKE ? OR tags LIKE ?)';
      params.push(sanitized, sanitized, sanitized, sanitized, sanitized);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await db.getAllAsync<DBRow>(query, params);
    return rows.map(mapRowToReflection);
  }

  /**
   * Get a single reflection by its ID
   */
  static async getReflectionById(id: string): Promise<Reflection | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<DBRow>(
      'SELECT * FROM reflections WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return mapRowToReflection(row);
  }

  /**
   * Get random reflections for the "Daily Wisdom / Flashback" card
   */
  static async getRandomWisdom(limit = 1): Promise<Reflection[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<DBRow>(
      'SELECT * FROM reflections ORDER BY RANDOM() LIMIT ?',
      [limit]
    );
    return rows.map(mapRowToReflection);
  }

  /**
   * Save a new reflection
   */
  static async saveReflection(
    reflection: Omit<Reflection, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Reflection> {
    const db = await getDatabase();
    const id = reflection.id || Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    const sanitizedTitle = SecurityService.sanitizeText(reflection.title);
    const sanitizedStory = SecurityService.sanitizeText(reflection.story);
    const sanitizedLearning = SecurityService.sanitizeText(reflection.learning);
    const sanitizedAction = SecurityService.sanitizeText(reflection.actionCommitment || '');
    const sanitizedSummary = SecurityService.sanitizeText(reflection.summary);
    const tagsJson = JSON.stringify(reflection.tags || []);

    await db.runAsync(
      `INSERT INTO reflections (
        id, title, raw_transcript, story, learning, action_commitment,
        summary, category, tags, audio_uri, audio_duration_seconds,
        is_favorite, created_at, updated_at, backup_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sanitizedTitle,
        reflection.rawTranscript || '',
        sanitizedStory,
        sanitizedLearning,
        sanitizedAction,
        sanitizedSummary,
        reflection.category,
        tagsJson,
        reflection.audioUri || null,
        reflection.audioDurationSeconds || 0,
        reflection.isFavorite ? 1 : 0,
        now,
        now,
        'local',
      ]
    );

    return {
      id,
      title: sanitizedTitle,
      rawTranscript: reflection.rawTranscript || '',
      story: sanitizedStory,
      learning: sanitizedLearning,
      actionCommitment: sanitizedAction,
      summary: sanitizedSummary,
      category: reflection.category,
      tags: reflection.tags || [],
      audioUri: reflection.audioUri || null,
      audioDurationSeconds: reflection.audioDurationSeconds || 0,
      isFavorite: reflection.isFavorite,
      createdAt: now,
      updatedAt: now,
      backupStatus: 'local',
    };
  }

  /**
   * Update an existing reflection
   */
  static async updateReflection(
    id: string,
    updates: Partial<Omit<Reflection, 'id' | 'createdAt'>>
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const current = await this.getReflectionById(id);
    if (!current) throw new Error('নোটটি পাওয়া যায়নি');

    const title = updates.title !== undefined ? SecurityService.sanitizeText(updates.title) : current.title;
    const story = updates.story !== undefined ? SecurityService.sanitizeText(updates.story) : current.story;
    const learning = updates.learning !== undefined ? SecurityService.sanitizeText(updates.learning) : current.learning;
    const action = updates.actionCommitment !== undefined ? SecurityService.sanitizeText(updates.actionCommitment) : current.actionCommitment;
    const summary = updates.summary !== undefined ? SecurityService.sanitizeText(updates.summary) : current.summary;
    const category = updates.category !== undefined ? updates.category : current.category;
    const tagsJson = updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(current.tags);
    const isFav = updates.isFavorite !== undefined ? (updates.isFavorite ? 1 : 0) : (current.isFavorite ? 1 : 0);
    const backupStatus = updates.backupStatus || 'local';

    await db.runAsync(
      `UPDATE reflections SET
        title = ?, story = ?, learning = ?, action_commitment = ?,
        summary = ?, category = ?, tags = ?, is_favorite = ?,
        updated_at = ?, backup_status = ?
      WHERE id = ?`,
      [title, story, learning, action, summary, category, tagsJson, isFav, now, backupStatus, id]
    );
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(id: string): Promise<boolean> {
    const db = await getDatabase();
    const current = await this.getReflectionById(id);
    if (!current) return false;

    const newFav = !current.isFavorite;
    await db.runAsync('UPDATE reflections SET is_favorite = ? WHERE id = ?', [newFav ? 1 : 0, id]);
    return newFav;
  }

  /**
   * Delete a reflection
   */
  static async deleteReflection(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM reflections WHERE id = ?', [id]);
  }

  /**
   * Get all distinct tags across all reflections
   */
  static async getAllTags(): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ tags: string }>('SELECT tags FROM reflections');
    const tagSet = new Set<string>();

    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.tags);
        if (Array.isArray(parsed)) {
          parsed.forEach((t) => {
            if (typeof t === 'string' && t.trim()) tagSet.add(t.trim());
          });
        }
      } catch {
        // ignore parse errors
      }
    }

    return Array.from(tagSet);
  }

  /**
   * Get total reflections count
   */
  static async getCount(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM reflections');
    return result?.count || 0;
  }

  /**
   * Export all reflections for backup
   */
  static async getAllForBackup(): Promise<Reflection[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<DBRow>('SELECT * FROM reflections ORDER BY created_at ASC');
    return rows.map(mapRowToReflection);
  }

  /**
   * Import reflections safely during a restore operation
   */
  static async importReflections(reflections: Reflection[]): Promise<{ imported: number; updated: number }> {
    const db = await getDatabase();
    let imported = 0;
    let updated = 0;

    for (const r of reflections) {
      const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM reflections WHERE id = ?', [r.id]);
      const tagsJson = JSON.stringify(r.tags || []);
      const sanitizedTitle = SecurityService.sanitizeText(r.title);
      const sanitizedStory = SecurityService.sanitizeText(r.story);
      const sanitizedLearning = SecurityService.sanitizeText(r.learning);
      const sanitizedAction = SecurityService.sanitizeText(r.actionCommitment || '');
      const sanitizedSummary = SecurityService.sanitizeText(r.summary);

      if (existing) {
        await db.runAsync(
          `UPDATE reflections SET
            title = ?, raw_transcript = ?, story = ?, learning = ?, action_commitment = ?,
            summary = ?, category = ?, tags = ?, audio_uri = ?, audio_duration_seconds = ?,
            is_favorite = ?, created_at = ?, updated_at = ?, backup_status = 'synced'
          WHERE id = ?`,
          [
            sanitizedTitle,
            r.rawTranscript || '',
            sanitizedStory,
            sanitizedLearning,
            sanitizedAction,
            sanitizedSummary,
            r.category,
            tagsJson,
            r.audioUri || null,
            r.audioDurationSeconds || 0,
            r.isFavorite ? 1 : 0,
            r.createdAt,
            r.updatedAt,
            r.id,
          ]
        );
        updated++;
      } else {
        await db.runAsync(
          `INSERT INTO reflections (
            id, title, raw_transcript, story, learning, action_commitment,
            summary, category, tags, audio_uri, audio_duration_seconds,
            is_favorite, created_at, updated_at, backup_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [
            r.id,
            sanitizedTitle,
            r.rawTranscript || '',
            sanitizedStory,
            sanitizedLearning,
            sanitizedAction,
            sanitizedSummary,
            r.category,
            tagsJson,
            r.audioUri || null,
            r.audioDurationSeconds || 0,
            r.isFavorite ? 1 : 0,
            r.createdAt,
            r.updatedAt,
          ]
        );
        imported++;
      }
    }

    return { imported, updated };
  }
}
