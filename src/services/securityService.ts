import * as SecureStore from 'expo-secure-store';

/**
 * Security Service for Ibrah App
 * Handles encrypted key storage (Keychain/KeyStore), input sanitization, and path traversal protection.
 */
const GEMINI_API_KEY_STORAGE = 'ibrah_gemini_api_key';
const BACKUP_ENCRYPTION_PASS_STORAGE = 'ibrah_backup_pass';

export class SecurityService {
  /**
   * Save Gemini API Key securely in hardware-backed storage (iOS Keychain / Android KeyStore)
   */
  static async saveApiKey(apiKey: string): Promise<boolean> {
    try {
      const sanitized = apiKey.trim();
      if (!sanitized) {
        await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE);
        return true;
      }
      await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE, sanitized, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      return true;
    } catch (error) {
      console.error('[SecurityService] Error saving API key securely:', error);
      return false;
    }
  }

  /**
   * Retrieve Gemini API Key securely
   */
  static async getApiKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(GEMINI_API_KEY_STORAGE);
    } catch (error) {
      console.error('[SecurityService] Error getting API key:', error);
      return null;
    }
  }

  /**
   * Delete API Key securely
   */
  static async deleteApiKey(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE);
      return true;
    } catch (error) {
      console.error('[SecurityService] Error deleting API key:', error);
      return false;
    }
  }

  /**
   * Sanitize text input to prevent injection attacks and control characters
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // remove invisible control characters
      .trim();
  }

  /**
   * Validate audio file path to ensure it does not attempt directory traversal
   */
  static isSafeFilePath(filePath: string, allowedPrefix: string): boolean {
    if (!filePath || filePath.includes('..')) {
      return false;
    }
    return filePath.startsWith(allowedPrefix) || filePath.startsWith('file://');
  }

  /**
   * Generate simple hash verification checksum for backup packages
   */
  static generateSimpleChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
