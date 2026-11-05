import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { SecurityService } from '../services/securityService';
import { BackupService } from '../services/backupService';
import { DatabaseService } from '../services/database';
import { SyncService } from '../services/syncService';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState<string>('');
  const [savedKeyExists, setSavedKeyExists] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Cloud Sync state
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>('');
  const [syncUserId, setSyncUserId] = useState<string>('');
  const [isSyncConfigured, setIsSyncConfigured] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [lastSyncText, setLastSyncText] = useState<string | null>(null);
  const [isSqlModalVisible, setIsSqlModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const key = await SecurityService.getApiKey();
    if (key) {
      setApiKey(key);
      setSavedKeyExists(true);
    }
    const count = await DatabaseService.getCount();
    setTotalCount(count);

    // Load Cloud Sync settings
    const { url, anonKey } = await SecurityService.getSupabaseConfig();
    const userId = await SecurityService.getSyncUserId();
    if (url) setSupabaseUrl(url);
    if (anonKey) setSupabaseAnonKey(anonKey);
    if (userId) setSyncUserId(userId);
    setIsSyncConfigured(Boolean(url && anonKey && userId));
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      await SecurityService.deleteApiKey();
      setSavedKeyExists(false);
      Alert.alert('সফল', 'API Key মুছে ফেলা হয়েছে।');
      return;
    }

    const success = await SecurityService.saveApiKey(apiKey.trim());
    if (success) {
      setSavedKeyExists(true);
      Alert.alert('সফল', 'Gemini API Key নিরাপদে আপনার ডিভাইসে সংরক্ষিত হয়েছে।');
    } else {
      Alert.alert('ত্রুটি', 'API Key সংরক্ষণ করা সম্ভব হয়নি।');
    }
  };

  const handleSaveCloudSync = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim() || !syncUserId.trim()) {
      Alert.alert('অসম্পূর্ণ তথ্য', 'দয়া করে Supabase URL, Anon Key এবং আপনার Sync Key (গোপন শব্দ) প্রদান করুন।');
      return;
    }

    try {
      const success = await SyncService.configure(
        supabaseUrl.trim(),
        supabaseAnonKey.trim(),
        syncUserId.trim()
      );

      if (success) {
        setIsSyncConfigured(true);
        Alert.alert('সফল', 'ক্লাউড সিঙ্ক সফলভাবে সংযুক্ত হয়েছে! প্রথমবার সিঙ্ক সম্পন্ন হচ্ছে...');
        handlePerformCloudSync();
      } else {
        Alert.alert('ত্রুটি', 'ক্লাউড সিঙ্ক তথ্য সংরক্ষণ করা যায়নি।');
      }
    } catch (err: any) {
      Alert.alert('ত্রুটি', 'কনফিগারেশন ব্যর্থ: ' + (err?.message || ''));
    }
  };

  const handlePerformCloudSync = async () => {
    setIsManualSyncing(true);
    try {
      const result = await SyncService.syncAll();
      if (result.success) {
        Alert.alert('সিঙ্ক সফল', result.message);
        setLastSyncText(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
        const count = await DatabaseService.getCount();
        setTotalCount(count);
      } else {
        Alert.alert('সিঙ্ক সতর্কতা', result.message);
      }
    } catch (err: any) {
      Alert.alert('ত্রুটি', 'সিঙ্ক ব্যর্থ: ' + (err?.message || ''));
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleDisconnectCloudSync = async () => {
    Alert.alert('সিঙ্ক সংযোগ বিচ্ছিন্ন', 'আপনি কি ক্লাউড সিঙ্ক সংযোগ মুছে ফেলতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'হ্যাঁ, বিচ্ছিন্ন করুন',
        style: 'destructive',
        onPress: async () => {
          await SyncService.disconnect();
          setIsSyncConfigured(false);
          setSupabaseUrl('');
          setSupabaseAnonKey('');
          Alert.alert('সম্পন্ন', 'ক্লাউড সিঙ্ক নিষ্ক্রিয় করা হয়েছে।');
        },
      },
    ]);
  };

  const handleBackupToGoogleDrive = async () => {
    setIsExporting(true);
    try {
      const result = await BackupService.exportToGoogleDrive();
      if (result.success) {
        Alert.alert('ব্যাকআপ সম্পন্ন', result.message);
      } else {
        Alert.alert('ব্যাকআপ সতর্কতা', result.message);
      }
    } catch (err: any) {
      Alert.alert('ত্রুটি', 'ব্যাকআপে সমস্যা হয়েছে: ' + (err?.message || ''));
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFromGoogleDrive = async () => {
    setIsRestoring(true);
    try {
      const result = await BackupService.restoreFromGoogleDrive();
      if (result.success) {
        Alert.alert('রিস্টোর সম্পন্ন', result.message);
        loadSettings();
      } else {
        Alert.alert('রিস্টোর নোটিশ', result.message);
      }
    } catch (err: any) {
      Alert.alert('ত্রুটি', 'রিস্টোর করতে সমস্যা হয়েছে: ' + (err?.message || ''));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSeedSampleData = async () => {
    Alert.alert(
      'ডেমো ডেটা যুক্ত করুন',
      'অ্যাপটি পরীক্ষা করার জন্য ৩টি নমুনা উপলব্ধি ও শিক্ষা যুক্ত করতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'হ্যাঁ, যুক্ত করুন',
          onPress: async () => {
            try {
              await DatabaseService.saveReflection({
                title: 'স্ত্রীর সাথে মতভিন্নতায় তাৎক্ষণিক নীরবতার বরকত',
                rawTranscript:
                  'আজকে বাসায় ফেরার পর ছোট একটি বিষয় নিয়ে স্ত্রীর সাথে তর্ক হওয়ার সম্ভাবনা ছিল। কিন্তু মনে হলো রাগ প্রকাশ না করে কিছুক্ষণ চুপ থাকা শ্রেয়।',
                story:
                  'কর্মক্ষেত্র থেকে ফিরে ক্লান্ত অবস্থায় একটি পারিবারিক বিষয় নিয়ে কিছুটা ভুল বোঝাবুঝি হচ্ছিল। তাৎক্ষণিক প্রতিক্রিয়া না দেখিয়ে নীরব থেকে বিষয়টি পর্যালোচনা করায় পরিবেশ শান্ত হয়ে যায়।',
                learning:
                  'মতভিন্নতার সময় সত্য প্রমাণের চেয়ে দাম্পত্য শান্তি ও সবর বজায় রাখা বহু গুণ বেশি কল্যাণকর।',
                actionCommitment:
                  'ভবিষ্যতে উত্তেজনাকর মুহূর্তে কোনো মন্তব্য না করে কিছুক্ষণ অপেক্ষা করব এবং অজু করব।',
                summary: 'দাম্পত্যে তর্কের সময়ে তাৎক্ষণিক নীরবতা শান্তি রক্ষা করে।',
                category: 'দাম্পত্য ও পরিবার',
                tags: ['দাম্পত্য', 'সবর', 'রাগ সংবরণ'],
                audioUri: null,
                audioDurationSeconds: 45,
                isFavorite: true,
              });

              await DatabaseService.saveReflection({
                title: 'জুমার বয়ান: অন্যের দোষ খোঁজার চেয়ে আত্মশুদ্ধির গুরুত্ব',
                rawTranscript:
                  'জুমার মসজিদে খতিব সাহেব বলছিলেন আমরা অন্যের ছোট ছোট ভুল নিয়ে কথা বলি কিন্তু নিজের অন্তরের অহংকার দেখতে পাই না।',
                story:
                  'মসজিদে খতিব সাহেবের বয়ানে অন্যের গীবত ও দোষচর্চার ভয়াবহতা এবং নিজের নাফসের পরিশুদ্ধির অপরিহার্যতা আলোচনা করা হয়।',
                learning:
                  'যে ব্যক্তি নিজের ত্রুটি নিয়ে ব্যস্ত থাকে, তার অন্যের দোষ দেখার অবসর থাকে না।',
                actionCommitment:
                  'প্রতি রাতে ঘুমানোর আগে অন্তত পাঁচ মিনিট নিজের সারাদিনের কাজের আত্মপর্যালোচনা (মুহাসাবাহ) করব।',
                summary: 'অন্যের ভুল না খুঁজে নিজের আমল সংশোধনে মনোযোগ দেওয়া।',
                category: 'দ্বীন ও আখিরাত',
                tags: ['আত্মশুদ্ধি', 'মুহাসাবাহ', 'গীবত বর্জন'],
                audioUri: null,
                audioDurationSeconds: 60,
                isFavorite: true,
              });

              await DatabaseService.saveReflection({
                title: 'কাজের জায়গায় কোনো সহকর্মীর ভুল ক্ষমাসুন্দর দৃষ্টিতে দেখা',
                rawTranscript:
                  'আজ অফিসে জুনিয়র সহকর্মী বড় একটা ভুল করেছিল। প্রথমে রেগে গিয়েছিলাম, কিন্তু পরে শান্তভাবে তাকে বুঝিয়ে বললাম।',
                story:
                  'প্রজেক্টের একটি গুরুত্বপূর্ণ ডেডলাইনের সময় সহকর্মীর অসতর্কতায় কিছু জটিলতা তৈরি হয়। কঠোর ভাষা প্রয়োগ না করে ধৈর্য সহকারে তাকে ভুল শোধরানোর সুযোগ দেওয়া হয়।',
                learning:
                  'মানুষকে লজ্জিত না করে সম্মান বজায় রেখে ভুল ধরিয়ে দিলে সে আজীবন কৃতজ্ঞ ও অনুগত থাকে।',
                actionCommitment:
                  'ভবিষ্যতে কোনো ভুল দেখলে সরাসরি তিরস্কার না করে ব্যক্তিগতভাবে ডেকে সুন্দর ভাষায় পরামর্শ দেব।',
                summary: 'সহকর্মীর ভুলের পর সহনশীলতা বজায় রাখলে সম্পর্ক দৃঢ় হয়।',
                category: 'মুয়ামালাত ও ব্যবহার',
                tags: ['কর্মক্ষেত্র', 'ক্ষমা', 'নম্রতা'],
                audioUri: null,
                audioDurationSeconds: 30,
                isFavorite: false,
              });

              await loadSettings();
              Alert.alert('সফল', '৩টি নমুনা উপলব্ধি যুক্ত করা হয়েছে। হোম স্ক্রিনে গিয়ে দেখুন।');
            } catch (err) {
              Alert.alert('ত্রুটি', 'ডেমো ডেটা যুক্ত করা সম্ভব হয়নি।');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="সেটিংস ও সিঙ্ক" subtitle="মোবাইল-ওয়েব সিঙ্ক ও ব্যাকআপ" showBack rightAction="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Real-Time Cloud Sync Section (Mobile & Web) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircleEmerald}>
              <Ionicons name="sync-circle-outline" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>মোবাইল ও ওয়েব স্বয়ংক্রিয় সিঙ্ক</Text>
              <Text style={styles.sectionSubtitle}>রিয়েল-টাইম টু-ওয়ে ক্লাউড সিঙ্ক্রোনাইজেশন</Text>
            </View>
          </View>

          {/* Sync Status Badge */}
          <View style={[styles.syncStatusBadge, isSyncConfigured ? styles.syncBadgeActive : styles.syncBadgeInactive]}>
            <Ionicons
              name={isSyncConfigured ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={isSyncConfigured ? Colors.success : Colors.textMuted}
            />
            <Text style={[styles.syncStatusText, isSyncConfigured && styles.syncStatusTextActive]}>
              {isSyncConfigured
                ? `স্বয়ংক্রিয় সিঙ্ক সক্রিয় ${lastSyncText ? `(সর্বশেষ: ${lastSyncText})` : ''}`
                : 'সিঙ্ক কনফিগার করা হয়নি'}
            </Text>
          </View>

          <Text style={styles.sectionHelpText}>
            🔒 <Text style={{ fontWeight: 'bold' }}>কীভাবে কাজ করে?</Text> আপনার ফ্রি Supabase অ্যাকাউন্টের প্রজেক্ট URL, Anon Key এবং একটি নিজস্ব গোপন "Sync Key" নিচে দিন। মোবাইল ও ওয়েব উভয় অ্যাপে এই একই তথ্য দিলে দুটি ডিভাইসের মধ্যে স্বয়ংক্রিয়ভাবে রিয়েল-টাইম সিঙ্ক হতে থাকবে।
          </Text>

          <Text style={styles.inputLabel}>Supabase Project URL</Text>
          <TextInput
            style={styles.keyInput}
            value={supabaseUrl}
            onChangeText={setSupabaseUrl}
            placeholder="https://your-project.supabase.co"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Supabase Anon Key</Text>
          <TextInput
            style={styles.keyInput}
            value={supabaseAnonKey}
            onChangeText={setSupabaseAnonKey}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>আপনার গোপন Sync Key (পাসফ্রেজ)</Text>
          <TextInput
            style={styles.keyInput}
            value={syncUserId}
            onChangeText={setSyncUserId}
            placeholder="যেমন: my-family-notes-2026 (উভয় ডিভাইসে এক দিবেন)"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.syncButtonsRow}>
            <TouchableOpacity
              style={styles.saveSyncButton}
              onPress={handleSaveCloudSync}
              activeOpacity={0.85}
            >
              <Ionicons name="link-outline" size={18} color={Colors.textInverse} />
              <Text style={styles.saveSyncButtonText}>
                {isSyncConfigured ? 'সিঙ্ক আপডেট করুন' : 'সংযোগ ও সিঙ্ক সক্রিয় করুন'}
              </Text>
            </TouchableOpacity>

            {isSyncConfigured && (
              <TouchableOpacity
                style={styles.syncNowButton}
                onPress={handlePerformCloudSync}
                disabled={isManualSyncing}
                activeOpacity={0.85}
              >
                {isManualSyncing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={17} color={Colors.primary} />
                    <Text style={styles.syncNowButtonText}>এখনই সিঙ্ক</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.syncAuxRow}>
            <TouchableOpacity onPress={() => setIsSqlModalVisible(true)}>
              <Text style={styles.sqlHelpLink}>📋 ডেটাবেজ SQL কোড দেখুন</Text>
            </TouchableOpacity>

            {isSyncConfigured && (
              <TouchableOpacity onPress={handleDisconnectCloudSync}>
                <Text style={styles.disconnectLink}>সংযোগ বিচ্ছিন্ন</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2. Google Drive Manual Backup Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircleGold}>
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>গুগল ড্রাইভ ব্যাকআপ (ম্যানুয়াল)</Text>
              <Text style={styles.sectionSubtitle}>আপনার ডেটা ক্লাউডে অফলাইন ব্যাকআপ ফাইল হিসেবে সংরক্ষণ</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>সংরক্ষিত মোট নোট ও উপলব্ধি:</Text>
            <Text style={styles.statsValue}>{totalCount}টি</Text>
          </View>

          <TouchableOpacity
            style={styles.backupButton}
            onPress={handleBackupToGoogleDrive}
            disabled={isExporting}
            activeOpacity={0.85}
          >
            {isExporting ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={Colors.textInverse} />
                <Text style={styles.backupButtonText}>গুগল ড্রাইভে ব্যাকআপ রাখুন</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestoreFromGoogleDrive}
            disabled={isRestoring}
            activeOpacity={0.85}
          >
            {isRestoring ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color={Colors.primary} />
                <Text style={styles.restoreButtonText}>গুগল ড্রাইভ ব্যাকআপ থেকে রিস্টোর</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 3. Gemini AI API Key Configuration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircleEmerald}>
              <Ionicons name="key-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Google Gemini API Key</Text>
              <Text style={styles.sectionSubtitle}>স্বয়ংক্রিয় ভয়েস ট্রান্সক্রিপশন ও সামারির জন্য</Text>
            </View>
          </View>

          <Text style={styles.securityNote}>
            🔒 <Text style={{ fontWeight: 'bold' }}>নিরাপত্তা নিশ্চয়তা:</Text> আপনার API Key কোনো অনলাইন ডাটাবেজে রাখা হয় না, বরং সরাসরি আপনার মোবাইলের এনক্রিপ্টেড KeyStore/Keychain এ সংরক্ষিত থাকে।
          </Text>

          <TextInput
            style={styles.keyInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIzaSy... (Gemini API Key পেস্ট করুন)"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={styles.saveKeyButton}
            onPress={handleSaveApiKey}
            activeOpacity={0.85}
          >
            <Text style={styles.saveKeyButtonText}>
              {savedKeyExists ? 'API Key আপডেট করুন' : 'API Key সংরক্ষণ করুন'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.guideText}>
            💡 কিভাবে পাবেন? Google AI Studio (aistudio.google.com) থেকে সম্পূর্ণ বিনামূল্যে এক মিনিটের মধ্যে ব্যক্তিগত API Key নেওয়া যায়।
          </Text>
        </View>

        {/* 4. Sample Demo Data */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircleGold}>
              <Ionicons name="sparkles-outline" size={20} color={Colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>নমুনা উপলব্ধি (Demo Data)</Text>
              <Text style={styles.sectionSubtitle}>অ্যাপের কার্যকারিতা দেখার জন্য নমুনা ডেটা</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sampleButton}
            onPress={handleSeedSampleData}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.sampleButtonText}>৩টি নমুনা উপলব্ধি যুক্ত করুন</Text>
          </TouchableOpacity>
        </View>

        {/* About & Privacy */}
        <View style={styles.aboutBox}>
          <Text style={styles.appName}>ইবরা (Ibrah) — ভার্সন ১.০.০</Text>
          <Text style={styles.appDescription}>
            ব্যক্তিগত প্রজ্ঞা, আত্মশুদ্ধি ও দৈনন্দিন শিক্ষার নিরিবিলি সঙ্গী। আপনার সমস্ত চিন্তা ও অডিও সম্পূর্ণ আপনার ডিভাইসে সুরক্ষিত থাকে।
          </Text>
        </View>
      </ScrollView>

      {/* SQL Schema Modal */}
      <Modal
        visible={isSqlModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSqlModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supabase SQL সেটআপ কোড</Text>
            <TouchableOpacity onPress={() => setIsSqlModalVisible(false)}>
              <Text style={styles.modalCloseText}>বন্ধ করুন</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalHelp}>
              আপনার বিনামূল্যে পাওয়া Supabase ড্যাশবোর্ডে গিয়ে **SQL Editor** এ নিচের কোডটি পেস্ট করে **Run** চাপুন:
            </Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable>
                {SyncService.getSetupSQL()}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconCircleEmerald: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGold: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
  },
  syncBadgeActive: {
    backgroundColor: Colors.successLight,
  },
  syncBadgeInactive: {
    backgroundColor: Colors.borderLight,
  },
  syncStatusText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  syncStatusTextActive: {
    color: Colors.success,
    fontWeight: Typography.fontWeights.semibold,
  },
  sectionHelpText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  keyInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: Typography.fontSizes.sm,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  syncButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveSyncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  saveSyncButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  syncNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 6,
  },
  syncNowButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  syncAuxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sqlHelpLink: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semibold,
  },
  disconnectLink: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.danger,
    fontWeight: Typography.fontWeights.medium,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  statsLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  statsValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  backupButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  restoreButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  securityNote: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    backgroundColor: Colors.primaryFaded,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  saveKeyButton: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveKeyButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  guideText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFaded,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    gap: 8,
  },
  sampleButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  aboutBox: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  appName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  appDescription: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  modalCloseText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  modalContent: {
    padding: Spacing.xl,
  },
  modalHelp: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: '#1E2925',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  codeText: {
    color: '#A7F3D0',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
