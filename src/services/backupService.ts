import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { DatabaseService } from './database';
import { BackupPackage, Reflection } from '../types/reflection';
import { SecurityService } from './securityService';

export class BackupService {
  /**
   * Export database reflections to a JSON package and share to Google Drive
   */
  static async exportToGoogleDrive(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const reflections = await DatabaseService.getAllForBackup();
      if (reflections.length === 0) {
        return {
          success: false,
          message: 'ব্যাকআপ নেওয়ার জন্য কোনো নোট বা উপলব্ধি পাওয়া যায়নি।',
          count: 0,
        };
      }

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const fileName = `ibrah_backup_${timestamp}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const reflectionsJson = JSON.stringify(reflections);
      const signature = SecurityService.generateSimpleChecksum(reflectionsJson);

      const backupPackage: BackupPackage = {
        appVersion: '1.0.0',
        exportedAt: now.toISOString(),
        totalCount: reflections.length,
        reflections,
        signature,
      };

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupPackage, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return {
          success: false,
          message: 'ডিভাইসে ফাইল শেয়ারিং বা ক্লাউডে আপলোডের সুবিধা সমর্থিত নয়।',
          count: reflections.length,
        };
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'গুগল ড্রাইভে ব্যাকআপ সংরক্ষণ করুন',
        UTI: 'public.json',
      });

      return {
        success: true,
        message: `${reflections.length}টি লার্নিং ও নোট সফলভাবে প্রস্তুত হয়েছে। গুগল ড্রাইভে সেভ করুন।`,
        count: reflections.length,
      };
    } catch (error: any) {
      console.error('[BackupService] Export failed:', error);
      return {
        success: false,
        message: `ব্যাকআপ তৈরি করতে সমস্যা হয়েছে: ${error?.message || 'অজানা ত্রুটি'}`,
        count: 0,
      };
    }
  }

  /**
   * Import and restore reflections from a previously saved Google Drive backup file
   */
  static async restoreFromGoogleDrive(): Promise<{
    success: boolean;
    message: string;
    imported: number;
    updated: number;
  }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          message: 'ফাইল নির্বাচন বাতিল করা হয়েছে।',
          imported: 0,
          updated: 0,
        };
      }

      const fileAsset = result.assets[0];
      const fileContent = await FileSystem.readAsStringAsync(fileAsset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(fileContent);
      } catch {
        return {
          success: false,
          message: 'নির্বাচিত ফাইলটি সঠিক JSON ফরম্যাটে নেই।',
          imported: 0,
          updated: 0,
        };
      }

      // Validate schema
      if (!parsed.reflections || !Array.isArray(parsed.reflections)) {
        return {
          success: false,
          message: 'ফাইলটিতে ইবরা অ্যাপের বৈধ ব্যাকআপ ডেটা পাওয়া যায়নি।',
          imported: 0,
          updated: 0,
        };
      }

      // Checksum validation
      const reflectionsJson = JSON.stringify(parsed.reflections);
      const expectedChecksum = SecurityService.generateSimpleChecksum(reflectionsJson);
      if (parsed.signature && parsed.signature !== expectedChecksum) {
        console.warn('[BackupService] Signature mismatch, continuing with cautious validation');
      }

      // Validate each reflection entry
      const validReflections: Reflection[] = [];
      for (const item of parsed.reflections) {
        if (item.id && item.title && item.learning) {
          validReflections.push({
            id: String(item.id),
            title: SecurityService.sanitizeText(String(item.title)),
            rawTranscript: SecurityService.sanitizeText(String(item.rawTranscript || '')),
            story: SecurityService.sanitizeText(String(item.story || '')),
            learning: SecurityService.sanitizeText(String(item.learning)),
            actionCommitment: SecurityService.sanitizeText(String(item.actionCommitment || '')),
            summary: SecurityService.sanitizeText(String(item.summary || item.learning)),
            category: item.category || 'সাধারণ উপলব্ধি',
            tags: Array.isArray(item.tags) ? item.tags : [],
            audioUri: item.audioUri || null,
            audioDurationSeconds: Number(item.audioDurationSeconds) || 0,
            isFavorite: Boolean(item.isFavorite),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            backupStatus: 'synced',
          });
        }
      }

      if (validReflections.length === 0) {
        return {
          success: false,
          message: 'ব্যাকআপ ফাইলে কোনো কার্যকর নোট পাওয়া যায়নি।',
          imported: 0,
          updated: 0,
        };
      }

      const { imported, updated } = await DatabaseService.importReflections(validReflections);

      return {
        success: true,
        message: `ব্যাকআপ সফলভাবে পুনরুদ্ধার হয়েছে! (${imported}টি নতুন যুক্ত, ${updated}টি আপডেট)`,
        imported,
        updated,
      };
    } catch (error: any) {
      console.error('[BackupService] Restore failed:', error);
      return {
        success: false,
        message: `রিস্টোর করতে সমস্যা হয়েছে: ${error?.message || 'অজানা ত্রুটি'}`,
        imported: 0,
        updated: 0,
      };
    }
  }
}
