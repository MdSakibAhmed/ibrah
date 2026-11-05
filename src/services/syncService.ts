import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from './database';
import { SecurityService } from './securityService';
import { Reflection } from '../types/reflection';

let supabaseClient: SupabaseClient | null = null;
let activeChannel: any = null;
let isSyncing = false;
let lastSyncedTime: string | null = null;
const listeners = new Set<(status: { isSyncing: boolean; lastSyncedTime: string | null }) => void>();

export class SyncService {
  /**
   * Get or initialize Supabase client instance
   */
  static async getClient(): Promise<SupabaseClient | null> {
    if (supabaseClient) return supabaseClient;

    const { url, anonKey } = await SecurityService.getSupabaseConfig();
    if (!url || !anonKey) return null;

    try {
      supabaseClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return supabaseClient;
    } catch (err) {
      console.error('[SyncService] Client creation failed:', err);
      return null;
    }
  }

  /**
   * Check if Cloud Sync is configured and ready
   */
  static async isConfigured(): Promise<boolean> {
    const { url, anonKey } = await SecurityService.getSupabaseConfig();
    const syncUserId = await SecurityService.getSyncUserId();
    return Boolean(url && anonKey && syncUserId);
  }

  /**
   * Configure Cloud Sync credentials and User ID
   */
  static async configure(url: string, anonKey: string, syncUserId: string): Promise<boolean> {
    const s1 = await SecurityService.saveSupabaseConfig(url, anonKey);
    const s2 = await SecurityService.saveSyncUserId(syncUserId);
    supabaseClient = null; // reset client to re-initialize
    if (activeChannel) {
      activeChannel.unsubscribe();
      activeChannel = null;
    }
    return s1 && s2;
  }

  /**
   * Disconnect and clear Cloud Sync credentials
   */
  static async disconnect(): Promise<void> {
    if (activeChannel) {
      activeChannel.unsubscribe();
      activeChannel = null;
    }
    supabaseClient = null;
    await SecurityService.deleteSupabaseConfig();
  }

  /**
   * Subscribe to UI sync status changes
   */
  static subscribeStatus(callback: (status: { isSyncing: boolean; lastSyncedTime: string | null }) => void): () => void {
    listeners.add(callback);
    callback({ isSyncing, lastSyncedTime });
    return () => {
      listeners.delete(callback);
    };
  }

  private static notifyListeners(): void {
    listeners.forEach((cb) => cb({ isSyncing, lastSyncedTime }));
  }

  /**
   * Initialize real-time listener for multi-device sync
   */
  static async initRealtime(onNewReflection?: (r: Reflection) => void): Promise<void> {
    const client = await this.getClient();
    const syncUserId = await SecurityService.getSyncUserId();
    if (!client || !syncUserId || activeChannel) return;

    try {
      activeChannel = client
        .channel('ibrah_realtime_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reflections',
            filter: `sync_user_id=eq.${syncUserId}`,
          },
          async (payload) => {
            if (payload.new && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
              const row: any = payload.new;
              const reflection: Reflection = {
                id: row.id,
                title: row.title,
                rawTranscript: row.raw_transcript || '',
                story: row.story,
                learning: row.learning,
                actionCommitment: row.action_commitment || '',
                summary: row.summary,
                category: row.category,
                tags: Array.isArray(row.tags) ? row.tags : [],
                audioUri: row.audio_uri || null,
                audioDurationSeconds: row.audio_duration_seconds || 0,
                isFavorite: Boolean(row.is_favorite),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                backupStatus: 'synced',
              };

              await DatabaseService.importReflections([reflection]);
              if (onNewReflection) onNewReflection(reflection);
            } else if (payload.eventType === 'DELETE' && payload.old?.id) {
              await DatabaseService.deleteReflection(payload.old.id);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error('[SyncService] Realtime subscription error:', err);
    }
  }

  /**
   * Push a single reflection to the cloud immediately upon creation or edit
   */
  static async pushReflection(reflection: Reflection): Promise<boolean> {
    const client = await this.getClient();
    const syncUserId = await SecurityService.getSyncUserId();
    if (!client || !syncUserId) return false;

    try {
      const { error } = await client.from('reflections').upsert(
        {
          id: reflection.id,
          sync_user_id: syncUserId,
          title: reflection.title,
          raw_transcript: reflection.rawTranscript || '',
          story: reflection.story,
          learning: reflection.learning,
          action_commitment: reflection.actionCommitment || '',
          summary: reflection.summary,
          category: reflection.category,
          tags: reflection.tags || [],
          audio_uri: reflection.audioUri || null,
          audio_duration_seconds: reflection.audioDurationSeconds || 0,
          is_favorite: reflection.isFavorite,
          created_at: reflection.createdAt,
          updated_at: reflection.updatedAt,
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('[SyncService] Push reflection error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[SyncService] Failed to push reflection:', err);
      return false;
    }
  }

  /**
   * Perform bidirectional sync between Local Device (SQLite / Web) and Supabase Cloud
   */
  static async syncAll(): Promise<{
    success: boolean;
    message: string;
    uploaded: number;
    downloaded: number;
  }> {
    if (isSyncing) {
      return { success: false, message: 'সিঙ্ক বর্তমানে চলমান রয়েছে।', uploaded: 0, downloaded: 0 };
    }

    const client = await this.getClient();
    const syncUserId = await SecurityService.getSyncUserId();

    if (!client || !syncUserId) {
      return {
        success: false,
        message: 'ক্লাউড সিঙ্ক কনফিগার করা নেই। অনুগ্রহ করে সেটিংস থেকে সেটআপ করুন।',
        uploaded: 0,
        downloaded: 0,
      };
    }

    isSyncing = true;
    this.notifyListeners();

    try {
      // Step 1: Upload local reflections to cloud
      const localReflections = await DatabaseService.getAllForBackup();
      let uploaded = 0;

      if (localReflections.length > 0) {
        const rowsToUpsert = localReflections.map((r) => ({
          id: r.id,
          sync_user_id: syncUserId,
          title: r.title,
          raw_transcript: r.rawTranscript || '',
          story: r.story,
          learning: r.learning,
          action_commitment: r.actionCommitment || '',
          summary: r.summary,
          category: r.category,
          tags: r.tags || [],
          audio_uri: r.audioUri || null,
          audio_duration_seconds: r.audioDurationSeconds || 0,
          is_favorite: r.isFavorite,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        }));

        const { error: uploadError } = await client
          .from('reflections')
          .upsert(rowsToUpsert, { onConflict: 'id' });

        if (uploadError) {
          throw new Error(`ক্লাউডে আপলোড ব্যর্থ: ${uploadError.message}`);
        }
        uploaded = localReflections.length;
      }

      // Step 2: Download reflections from cloud for this syncUserId
      const { data: cloudRows, error: downloadError } = await client
        .from('reflections')
        .select('*')
        .eq('sync_user_id', syncUserId)
        .order('created_at', { ascending: false });

      if (downloadError) {
        throw new Error(`ক্লাউড থেকে ডেটা আনা যায়নি: ${downloadError.message}`);
      }

      let downloaded = 0;
      if (cloudRows && cloudRows.length > 0) {
        const cloudReflections: Reflection[] = cloudRows.map((row: any) => ({
          id: row.id,
          title: row.title,
          rawTranscript: row.raw_transcript || '',
          story: row.story,
          learning: row.learning,
          actionCommitment: row.action_commitment || '',
          summary: row.summary,
          category: row.category,
          tags: Array.isArray(row.tags) ? row.tags : [],
          audioUri: row.audio_uri || null,
          audioDurationSeconds: row.audio_duration_seconds || 0,
          isFavorite: Boolean(row.is_favorite),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          backupStatus: 'synced',
        }));

        const { imported, updated } = await DatabaseService.importReflections(cloudReflections);
        downloaded = imported + updated;
      }

      lastSyncedTime = new Date().toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        success: true,
        message: `মোবাইল ও ওয়েব সিঙ্ক সম্পন্ন হয়েছে! (${uploaded}টি আপলোড, ${downloaded}টি সিঙ্ক)`,
        uploaded,
        downloaded,
      };
    } catch (err: any) {
      console.error('[SyncService] Sync all failed:', err);
      return {
        success: false,
        message: err?.message || 'সিঙ্ক করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ চেক করুন।',
        uploaded: 0,
        downloaded: 0,
      };
    } finally {
      isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Get the SQL schema needed to setup the Supabase table with RLS
   */
  static getSetupSQL(): string {
    return `-- ইবরা (Ibrah) ক্লাউড সিঙ্ক টেবিল ও সিকিউরিটি কনফিগারেশন:
CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  sync_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_transcript TEXT,
  story TEXT NOT NULL,
  learning TEXT NOT NULL,
  action_commitment TEXT,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_uri TEXT,
  audio_duration_seconds REAL DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- দ্রুত ফিল্টারিংয়ের জন্য ইনডেক্স
CREATE INDEX IF NOT EXISTS idx_reflections_sync_user ON reflections(sync_user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_created ON reflections(created_at);

-- রিয়েল-টাইম পাবলিকেশন সক্রিয় করুন
ALTER PUBLICATION supabase_realtime ADD TABLE reflections;
`;
  }
}
