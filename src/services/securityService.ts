import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Security Service for Ibrah App (Mobile & Web)
 * Handles encrypted key storage (Keychain/KeyStore on mobile, LocalStorage on web),
 * input sanitization, and path traversal protection.
 */
const GEMINI_API_KEY_STORAGE = 'ibrah_gemini_api_key';
const SUPABASE_URL_STORAGE = 'ibrah_supabase_url';
const SUPABASE_ANON_KEY_STORAGE = 'ibrah_supabase_anon_key';
const SYNC_USER_ID_STORAGE = 'ibrah_sync_user_id';

async function setSecureItem(key: string, value: string): Promise<boolean> {
  try {
    const sanitized = value.trim();
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (!sanitized) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, sanitized);
        }
      }
      return true;
    }

    if (!sanitized) {
      await SecureStore.deleteItemAsync(key);
      return true;
    }

    await SecureStore.setItemAsync(key, sanitized, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return true;
  } catch (error) {
    console.error(`[SecurityService] Error saving ${key}:`, error);
    return false;
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[SecurityService] Error getting ${key}:`, error);
    return null;
  }
}

async function deleteSecureItem(key: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return true;
    }
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    console.error(`[SecurityService] Error deleting ${key}:`, error);
    return false;
  }
}

export class SecurityService {
  /**
   * Save Gemini API Key securely
   */
  static async saveApiKey(apiKey: string): Promise<boolean> {
    return await setSecureItem(GEMINI_API_KEY_STORAGE, apiKey);
  }

  /**
   * Retrieve Gemini API Key securely (falls back to EXPO_PUBLIC_GEMINI_API_KEY if present)
   */
  static async getApiKey(): Promise<string | null> {
    const stored = await getSecureItem(GEMINI_API_KEY_STORAGE);
    if (stored) return stored;
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
  }

  /**
   * Delete API Key securely
   */
  static async deleteApiKey(): Promise<boolean> {
    return await deleteSecureItem(GEMINI_API_KEY_STORAGE);
  }

  /**
   * Save Supabase Cloud Configuration
   */
  static async saveSupabaseConfig(url: string, anonKey: string): Promise<boolean> {
    const s1 = await setSecureItem(SUPABASE_URL_STORAGE, url);
    const s2 = await setSecureItem(SUPABASE_ANON_KEY_STORAGE, anonKey);
    return s1 && s2;
  }

  /**
   * Get Supabase Cloud Configuration (falls back to EXPO_PUBLIC_SUPABASE_* if present)
   */
  static async getSupabaseConfig(): Promise<{ url: string | null; anonKey: string | null }> {
    const url = (await getSecureItem(SUPABASE_URL_STORAGE)) || process.env.EXPO_PUBLIC_SUPABASE_URL || null;
    const anonKey = (await getSecureItem(SUPABASE_ANON_KEY_STORAGE)) || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || null;
    return { url, anonKey };
  }

  /**
   * Delete Supabase Cloud Configuration
   */
  static async deleteSupabaseConfig(): Promise<boolean> {
    const d1 = await deleteSecureItem(SUPABASE_URL_STORAGE);
    const d2 = await deleteSecureItem(SUPABASE_ANON_KEY_STORAGE);
    return d1 && d2;
  }

  /**
   * Save Sync User ID / Passphrase for isolating multi-device reflections
   */
  static async saveSyncUserId(userId: string): Promise<boolean> {
    return await setSecureItem(SYNC_USER_ID_STORAGE, userId);
  }

  /**
   * Get Sync User ID (falls back to EXPO_PUBLIC_SYNC_KEY if present)
   */
  static async getSyncUserId(): Promise<string | null> {
    const stored = await getSecureItem(SYNC_USER_ID_STORAGE);
    if (stored) return stored;
    return process.env.EXPO_PUBLIC_SYNC_KEY || null;
  }

  /**
   * Sanitize text input to prevent injection attacks and control characters
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
  }

  /**
   * Validate audio file path to ensure it does not attempt directory traversal
   */
  static isSafeFilePath(filePath: string, allowedPrefix: string): boolean {
    if (!filePath || filePath.includes('..')) {
      return false;
    }
    return (
      filePath.startsWith(allowedPrefix) ||
      filePath.startsWith('file://') ||
      filePath.startsWith('blob:')
    );
  }
}
