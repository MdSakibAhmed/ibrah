import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
} from 'expo-audio';
import { WaveformIndicator } from '../components/WaveformIndicator';
import { AIService } from '../services/ai';
import { DatabaseService } from '../services/database';
import { SecurityService } from '../services/securityService';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

export default function RecordScreen() {
  const router = useRouter();

  // Audio Recording states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Mode: 'voice' | 'text'
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [manualText, setManualText] = useState<string>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize expo-audio recorder
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Check microphone permissions on mount
  useEffect(() => {
    async function checkPermission() {
      try {
        const { status } = await getRecordingPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);
        } else {
          const requested = await requestRecordingPermissionsAsync();
          setHasPermission(requested.granted);
        }
      } catch (err) {
        console.error('[RecordScreen] Permission check error:', err);
        setHasPermission(false);
      }
    }
    checkPermission();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer interval for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!hasPermission) {
      const requested = await requestRecordingPermissionsAsync();
      if (!requested.granted) {
        Alert.alert(
          'পারমিশন প্রয়োজন',
          'কথা রেকর্ড করার জন্য মাইক্রোফোন পারমিশন সক্রিয় করা প্রয়োজন। আপনার মোবাইল সেটিংস থেকে পারমিশন দিন।'
        );
        return;
      }
      setHasPermission(true);
    }

    try {
      setDurationSeconds(0);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err: any) {
      console.error('[RecordScreen] Failed to start recording:', err);
      Alert.alert('রেকর্ডিং ত্রুটি', 'ভয়েস রেকর্ড শুরু করা সম্ভব হয়নি: ' + (err?.message || 'অজানা সমস্যা'));
    }
  };

  const pauseOrResumeRecording = async () => {
    try {
      if (isRecording) {
        recorder.pause();
        setIsRecording(false);
      } else {
        recorder.record();
        setIsRecording(true);
      }
    } catch (err) {
      console.error('[RecordScreen] Pause/resume error:', err);
    }
  };

  const cancelRecording = async () => {
    try {
      if (isRecording) {
        await recorder.stop();
      }
      setIsRecording(false);
      setDurationSeconds(0);
      router.back();
    } catch (err) {
      router.back();
    }
  };

  const finishRecordingAndProcess = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus('অডিও ফাইল প্রস্তুত করা হচ্ছে...');

      if (isRecording) {
        await recorder.stop();
        setIsRecording(false);
      }

      const tempUri = recorder.uri;
      if (!tempUri) {
        throw new Error('রেকর্ডকৃত অডিও ফাইল খুঁজে পাওয়া যায়নি।');
      }

      // Ensure directory exists for permanent storage
      const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
      }

      const fileName = `rec_${Date.now()}.m4a`;
      const permanentUri = `${recordingsDir}${fileName}`;

      // Move audio file to permanent internal storage
      await FileSystem.moveAsync({
        from: tempUri,
        to: permanentUri,
      });

      setProcessingStatus('AI এর মাধ্যমে আপনার কথা শুনে শিক্ষা ও সারসংক্ষেপ তৈরি হচ্ছে...');

      let aiResult;
      try {
        aiResult = await AIService.analyzeAudio(permanentUri);
      } catch (aiErr: any) {
        console.warn('[RecordScreen] AI processing failed, saving default note:', aiErr);
        // Fallback: save voice note safely without losing user's audio
        aiResult = AIService.generateDefaultTemplate();
      }

      setProcessingStatus('নোটটি ডাটাবেজে সংরক্ষণ করা হচ্ছে...');

      const saved = await DatabaseService.saveReflection({
        title: aiResult.title,
        rawTranscript: aiResult.rawTranscript || '',
        story: aiResult.story,
        learning: aiResult.learning,
        actionCommitment: aiResult.actionCommitment,
        summary: aiResult.summary,
        category: aiResult.category,
        tags: aiResult.tags,
        audioUri: permanentUri,
        audioDurationSeconds: durationSeconds,
        isFavorite: false,
      });

      setIsProcessing(false);
      router.replace(`/reflection/${saved.id}`);
    } catch (error: any) {
      setIsProcessing(false);
      console.error('[RecordScreen] Processing error:', error);
      Alert.alert(
        'সংরক্ষণ ত্রুটি',
        error?.message || 'ভয়েস প্রসেস ও সংরক্ষণ করতে সমস্যা হয়েছে।'
      );
    }
  };

  const processManualText = async () => {
    if (!manualText.trim()) {
      Alert.alert('খালি নোট', 'দয়া করে আপনার কথা বা ঘটনাটি লিখুন।');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStatus('AI বিশ্লেষণ করছে ও প্রজ্ঞা আলাদা করছে...');

      let aiResult;
      try {
        aiResult = await AIService.analyzeText(manualText);
      } catch (aiErr) {
        console.warn('[RecordScreen] AI text analysis failed, using fallback:', aiErr);
        aiResult = AIService.generateDefaultTemplate(manualText);
      }

      const saved = await DatabaseService.saveReflection({
        title: aiResult.title,
        rawTranscript: manualText,
        story: aiResult.story || manualText,
        learning: aiResult.learning,
        actionCommitment: aiResult.actionCommitment,
        summary: aiResult.summary,
        category: aiResult.category,
        tags: aiResult.tags,
        audioUri: null,
        audioDurationSeconds: 0,
        isFavorite: false,
      });

      setIsProcessing(false);
      router.replace(`/reflection/${saved.id}`);
    } catch (error: any) {
      setIsProcessing(false);
      Alert.alert('সংরক্ষণ ত্রুটি', error?.message || 'নোট সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={cancelRecording}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'voice' && styles.toggleBtnActive]}
              onPress={() => setMode('voice')}
              disabled={isRecording}
            >
              <Ionicons
                name="mic"
                size={16}
                color={mode === 'voice' ? Colors.textInverse : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  mode === 'voice' && styles.toggleTextActive,
                ]}
              >
                ভয়েস
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'text' && styles.toggleBtnActive]}
              onPress={() => setMode('text')}
              disabled={isRecording}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={mode === 'text' ? Colors.textInverse : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  mode === 'text' && styles.toggleTextActive,
                ]}
              >
                লিখে
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Processing Loading Overlay */}
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.processingTitle}>অনুগ্রহ করে অপেক্ষা করুন</Text>
              <Text style={styles.processingDesc}>{processingStatus}</Text>
            </View>
          </View>
        ) : mode === 'voice' ? (
          /* Voice Recording Mode View */
          <View style={styles.voiceContent}>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>
                {isRecording
                  ? 'মন খুলে আপনার কথা বা ঘটনাটি বলুন...'
                  : durationSeconds > 0
                  ? 'রেকর্ডিং বিরতিতে রয়েছে'
                  : 'যেকোনো উপলব্ধি বা দ্বীনি কথা রেকর্ড করুন'}
              </Text>
              <Text style={styles.instructionSubtitle}>
                {isRecording
                  ? 'কথা শেষ হলে নিচের "সম্পন্ন" বাটনে ট্যাপ করুন। AI স্বয়ংক্রিয়ভাবে মূল শিক্ষা আলাদা করবে।'
                  : 'মাইক বাটনে চাপ দিয়ে শুরু করুন।'}
              </Text>
            </View>

            {/* Waveform Visualization */}
            <View style={styles.waveformContainer}>
              <WaveformIndicator isRecording={isRecording} />
            </View>

            {/* Timer Counter */}
            <View style={styles.timerContainer}>
              <View style={[styles.recordingDot, isRecording && styles.recordingDotActive]} />
              <Text style={styles.timerText}>{formatTimer(durationSeconds)}</Text>
            </View>

            {/* Recording Controls */}
            <View style={styles.controlsSection}>
              {durationSeconds > 0 && (
                <TouchableOpacity
                  style={styles.secondaryControlBtn}
                  onPress={cancelRecording}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={22} color={Colors.danger} />
                  <Text style={styles.secondaryControlText}>বাতিল</Text>
                </TouchableOpacity>
              )}

              {/* Big Main Mic Action Button */}
              <TouchableOpacity
                style={[
                  styles.mainMicButton,
                  isRecording && styles.mainMicButtonActive,
                ]}
                onPress={isRecording ? pauseOrResumeRecording : (durationSeconds === 0 ? startRecording : pauseOrResumeRecording)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isRecording ? 'pause' : 'mic'}
                  size={38}
                  color={Colors.textInverse}
                />
              </TouchableOpacity>

              {durationSeconds > 0 && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={finishRecordingAndProcess}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done" size={22} color={Colors.textInverse} />
                  <Text style={styles.doneButtonText}>সম্পন্ন</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Manual Written Text Mode View */
          <ScrollView contentContainerStyle={styles.textContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.textModeTitle}>আপনার আজকের ঘটনা বা উপলব্ধি লিখুন</Text>
            <Text style={styles.textModeSubtitle}>
              আপনি যা লিখবেন, AI সেটিকে বিশ্লেষণ করে সুন্দর গল্প, মূল হিকমাহ এবং ভবিষ্যৎ অঙ্গীকারে সাজিয়ে দেবে।
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="এখানে লিখুন... (যেমন: আজকে আলোচনা শোনার পর মনে হলো রাগ সংবরণ করাটা কেন জরুরি...)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              value={manualText}
              onChangeText={setManualText}
            />

            <TouchableOpacity
              style={styles.submitTextBtn}
              onPress={processManualText}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={18} color={Colors.textInverse} />
              <Text style={styles.submitTextBtnLabel}>AI দিয়ে বিশ্লেষণ ও সেভ করুন</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  toggleTextActive: {
    color: Colors.textInverse,
    fontWeight: Typography.fontWeights.semibold,
  },
  voiceContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  instructionBox: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  instructionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  instructionSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  waveformContainer: {
    height: 80,
    justifyContent: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textMuted,
  },
  recordingDotActive: {
    backgroundColor: Colors.danger,
  },
  timerText: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  mainMicButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  mainMicButtonActive: {
    backgroundColor: Colors.accentDark,
    borderColor: Colors.accentLight,
  },
  secondaryControlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  secondaryControlText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.danger,
    fontWeight: Typography.fontWeights.medium,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.success,
    gap: 2,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textInverse,
    fontWeight: Typography.fontWeights.semibold,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  processingCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    maxWidth: 320,
  },
  processingTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  processingDesc: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  textContent: {
    padding: Spacing.xl,
  },
  textModeTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  textModeSubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.sm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 180,
    marginBottom: Spacing.lg,
  },
  submitTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  submitTextBtnLabel: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
});
