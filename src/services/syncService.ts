import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from './database';
import { SecurityService } from './securityService';
import { Reflection } from '../types/reflection';

let supabaseClient: SupabaseClient | null = null;
let activeChannel: any = null;
let isSyncing = false;
let lastSyncedTime: string | null = null;
const statusListeners = new Set<(status: { isSyncing: boolean; lastSyncedTime: string | null }) => void>();
const changeListeners = new Set<() => void>();

function normalizeIso(value: string | number | undefined | null): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function parseTags(rawTags: unknown): string[] {
  if (Array.isArray(rawTags)) {
    return rawTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  }
  if (typeof rawTags === 'string') {
    try {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) {
        return parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function toCloudRow(r: Reflection, syncUserId: string) {
  return {
    id: r.id,
    sync_user_id: syncUserId,
    title: r.title,
    raw_transcript: r.rawTranscript || '',
    story: r.story,
    learning: r.learning,
    action_commitment: r.actionCommitment || '',
    summary: r.summary,
    category: r.category,
    tags: Array.isArray(r.tags) ? r.tags : [],
    audio_duration_seconds: Math.round(Number(r.audioDurationSeconds) || 0),
    is_favorite: Boolean(r.isFavorite),
    created_at: normalizeIso(r.createdAt),
    updated_at: normalizeIso(r.updatedAt),
  };
}

function fromCloudRow(row: any): Reflection {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    rawTranscript: String(row.raw_transcript || ''),
    story: String(row.story || ''),
    learning: String(row.learning || ''),
    actionCommitment: String(row.action_commitment || ''),
    summary: String(row.summary || ''),
    category: String(row.category || 'সাধারণ উপলব্ধি'),
    tags: parseTags(row.tags),
    audioUri: null, // Device-local audio files stay on the originating device
    audioDurationSeconds: Math.round(Number(row.audio_duration_seconds) || 0),
    isFavorite: Boolean(row.is_favorite),
    createdAt: normalizeIso(row.created_at),
    updatedAt: normalizeIso(row.updated_at),
  };
}

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
    supabaseClient = null;
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
  static subscribeStatus(
    callback: (status: { isSyncing: boolean; lastSyncedTime: string | null }) => void
  ): () => void {
    statusListeners.add(callback);
    callback({ isSyncing, lastSyncedTime });
    return () => {
      statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to remote data changes (INSERT/UPDATE/DELETE)
   */
  static subscribeChanges(callback: () => void): () => void {
    changeListeners.add(callback);
    return () => {
      changeListeners.delete(callback);
    };
  }

  private static notifyStatusListeners(): void {
    statusListeners.forEach((cb) => cb({ isSyncing, lastSyncedTime }));
  }

  private static notifyChangeListeners(): void {
    changeListeners.forEach((cb) => cb());
  }

  /**
   * Initialize real-time listener for multi-device sync
   */
  static async initRealtime(onDataChanged?: () => void): Promise<() => void> {
    const unsubscribeChange = onDataChanged ? this.subscribeChanges(onDataChanged) : () => {};

    const client = await this.getClient();
    const syncUserId = await SecurityService.getSyncUserId();
    if (!client || !syncUserId || activeChannel) return unsubscribeChange;

    try {
      activeChannel = client
        .channel(`ibrah_sync_${syncUserId}`)
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
              const reflection = fromCloudRow(payload.new);
              await DatabaseService.importReflections([reflection]);
              this.notifyChangeListeners();
            } else if (payload.eventType === 'DELETE' && payload.old?.id) {
              await DatabaseService.deleteReflection(String(payload.old.id));
              this.notifyChangeListeners();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error('[SyncService] Realtime subscription error:', err);
    }

    return unsubscribeChange;
  }

  /**
   * Push a single reflection (new, edited, or favorited) to the cloud immediately
   */
  static async pushReflection(reflection: Reflection): Promise<boolean> {
    const client = await this.getClient();
    const syncUserId = await SecurityService.getSyncUserId();
    if (!client || !syncUserId) return false;

    try {
      const { error } = await client
        .from('reflections')
        .upsert(toCloudRow(reflection, syncUserId), { onConflict: 'id' });

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
   * Delete a reflection from the cloud so it is removed across all synced devices
   */
  static async deleteReflection(id: string): Promise<boolean> {
    const client = await this.getClient();
    const syncUserId = await SecurityService.getSyncUserId();
    if (!client || !syncUserId) return false;

    try {
      const { error } = await client
        .from('reflections')
        .delete()
        .eq('id', id)
        .eq('sync_user_id', syncUserId);

      if (error) {
        console.error('[SyncService] Delete reflection error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[SyncService] Failed to delete reflection:', err);
      return false;
    }
  }

  /**
   * Timestamp-aware bidirectional sync between Local Device and Supabase Cloud
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
    this.notifyStatusListeners();

    try {
      // Step 1: Fetch current cloud rows for this syncUserId
      const { data: cloudRows, error: downloadError } = await client
        .from('reflections')
        .select('*')
        .eq('sync_user_id', syncUserId)
        .order('created_at', { ascending: false });

      if (downloadError) {
        throw new Error(`ক্লাউড থেকে ডেটা আনা যায়নি: ${downloadError.message}`);
      }

      const cloudReflections = (cloudRows || []).map(fromCloudRow);
      const cloudUpdatedMap = new Map<string, number>();
      cloudReflections.forEach((r) => {
        cloudUpdatedMap.set(r.id, new Date(r.updatedAt).getTime());
      });

      // Step 2: Push only new or strictly newer local reflections to cloud
      const localReflections = await DatabaseService.getAllReflections();
      const rowsToUpsert = localReflections
        .filter((local) => {
          const remoteTime = cloudUpdatedMap.get(local.id);
          if (remoteTime === undefined) return true;
          return new Date(local.updatedAt).getTime() > remoteTime;
        })
        .map((r) => toCloudRow(r, syncUserId));

      let uploaded = 0;
      if (rowsToUpsert.length > 0) {
        const { error: uploadError } = await client
          .from('reflections')
          .upsert(rowsToUpsert, { onConflict: 'id' });

        if (uploadError) {
          throw new Error(`ক্লাউডে আপলোড ব্যর্থ: ${uploadError.message}`);
        }
        uploaded = rowsToUpsert.length;
      }

      // Step 3: Merge newer/missing cloud reflections into local database
      let downloaded = 0;
      if (cloudReflections.length > 0) {
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
      this.notifyStatusListeners();
    }
  }

  /**
   * Final production SQL schema for Supabase (matches every synced column cleanly)
   */
  static getSetupSQL(): string {
    return `-- ইবরা (Ibrah) ক্লাউড সিঙ্ক টেবিলের চূড়ান্ত স্কিমা:
-- (পুরানো ভুল স্কিমা থাকলে প্রথমে ড্রপ করে পরিষ্কারভাবে তৈরি করতে পারেন)
-- DROP TABLE IF EXISTS public.reflections CASCADE;

CREATE TABLE IF NOT EXISTS public.reflections (
  id TEXT PRIMARY KEY,
  sync_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_transcript TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL,
  learning TEXT NOT NULL,
  action_commitment TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- দ্রুত সার্চ ও সিঙ্কের জন্য ইনডেক্স
CREATE INDEX IF NOT EXISTS idx_reflections_sync_user ON public.reflections(sync_user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_created ON public.reflections(created_at DESC);

-- রিয়েল-টাইম DELETE ও UPDATE ফিল্টারিং সঠিকভাবে কাজ করার জন্য:
ALTER TABLE public.reflections REPLICA IDENTITY FULL;

-- Sync Key ভিত্তিক অ্যাক্সেসের জন্য RLS বন্ধ রাখুন:
ALTER TABLE public.reflections DISABLE ROW LEVEL SECURITY;

-- রিয়েল-টাইম সিঙ্ক চালু করুন:
ALTER PUBLICATION supabase_realtime ADD TABLE public.reflections;
`;
  }
}
