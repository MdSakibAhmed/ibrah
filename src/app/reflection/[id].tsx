import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayerCard } from '../../components/AudioPlayerCard';
import { DatabaseService } from '../../services/database';
import { Reflection } from '../../types/reflection';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

export default function ReflectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editLearning, setEditLearning] = useState<string>('');
  const [editAction, setEditAction] = useState<string>('');
  const [editStory, setEditStory] = useState<string>('');

  const loadReflection = useCallback(async () => {
    if (!id) return;
    try {
      const data = await DatabaseService.getReflectionById(id);
      if (data) {
        setReflection(data);
        setEditTitle(data.title);
        setEditLearning(data.learning);
        setEditAction(data.actionCommitment);
        setEditStory(data.story);
      }
    } catch (err) {
      console.error('[ReflectionDetail] Error loading reflection:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReflection();
  }, [loadReflection]);

  const handleToggleFavorite = async () => {
    if (!reflection) return;
    try {
      const newFav = await DatabaseService.toggleFavorite(reflection.id);
      setReflection({ ...reflection, isFavorite: newFav });
    } catch (err) {
      console.error('[ReflectionDetail] Toggle favorite error:', err);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'নোট মুছে ফেলুন',
      'আপনি কি নিশ্চিতভাবে এই উপলব্ধি ও শিক্ষাটি মুছে ফেলতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: async () => {
            if (!reflection) return;
            try {
              await DatabaseService.deleteReflection(reflection.id);
              router.back();
            } catch (err) {
              Alert.alert('ত্রুটি', 'মুছে ফেলতে সমস্যা হয়েছে।');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!reflection) return;
    try {
      const shareContent = `📌 ${reflection.title}\n\n💡 মূল শিক্ষা:\n"${reflection.learning}"\n\n🎯 অঙ্গীকার:\n${reflection.actionCommitment || 'সচেতন থাকা'}\n\n📖 প্রেক্ষাপট:\n${reflection.story}\n\n— ইবরা অ্যাপ থেকে সংরক্ষিত`;
      await Share.share({
        message: shareContent,
      });
    } catch (err) {
      console.error('[ReflectionDetail] Share error:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!reflection) return;
    try {
      await DatabaseService.updateReflection(reflection.id, {
        title: editTitle,
        learning: editLearning,
        actionCommitment: editAction,
        story: editStory,
      });
      setReflection({
        ...reflection,
        title: editTitle,
        learning: editLearning,
        actionCommitment: editAction,
        story: editStory,
      });
      setIsEditModalVisible(false);
    } catch (err) {
      Alert.alert('ত্রুটি', 'আপডেট সেভ করতে সমস্যা হয়েছে।');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!reflection) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <Text style={styles.notFoundText}>উপলব্ধিটি পাওয়া যায়নি।</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>ফিরে যান</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = new Date(reflection.createdAt).toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Action Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.navRightActions}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleToggleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={reflection.isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={reflection.isFavorite ? Colors.accent : Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => setIsEditModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category & Date */}
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{reflection.category}</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{reflection.title}</Text>

        {/* Audio Player (if recorded audio exists) */}
        {reflection.audioUri ? (
          <AudioPlayerCard
            audioUri={reflection.audioUri}
            durationSeconds={reflection.audioDurationSeconds}
          />
        ) : null}

        {/* Core Hikmah / Learning Card */}
        <View style={styles.hikmahCard}>
          <View style={styles.hikmahHeader}>
            <Ionicons name="bulb" size={20} color={Colors.accentDark} />
            <Text style={styles.hikmahTitle}>মূল উপলব্ধি ও শিক্ষা (Hikmah)</Text>
          </View>
          <Text style={styles.hikmahBody}>{reflection.learning}</Text>
        </View>

        {/* Action Commitment Box */}
        {reflection.actionCommitment ? (
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <Ionicons name="compass-outline" size={18} color={Colors.success} />
              <Text style={styles.actionTitle}>ভবিষ্যতের জন্য আমার করণীয় / অঙ্গীকার</Text>
            </View>
            <Text style={styles.actionBody}>{reflection.actionCommitment}</Text>
          </View>
        ) : null}

        {/* Summary Card */}
        {reflection.summary ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>এক নজরে সারসংক্ষেপ</Text>
            <Text style={styles.sectionBody}>{reflection.summary}</Text>
          </View>
        ) : null}

        {/* Full Story / Context */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>ঘটনা বা প্রেক্ষাপট</Text>
          <Text style={styles.sectionBody}>{reflection.story}</Text>
        </View>

        {/* Raw Speech Transcript Accordion */}
        {reflection.rawTranscript ? (
          <View style={styles.accordionContainer}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setShowTranscript(!showTranscript)}
              activeOpacity={0.7}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="document-text-outline" size={17} color={Colors.textSecondary} />
                <Text style={styles.accordionTitle}>কথোপকথনের মূল টেক্সট (Transcript)</Text>
              </View>
              <Ionicons
                name={showTranscript ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {showTranscript && (
              <View style={styles.accordionBody}>
                <Text style={styles.rawTranscriptText}>{reflection.rawTranscript}</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Tags */}
        {reflection.tags && reflection.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>ট্যাগসমূহ:</Text>
            <View style={styles.tagsWrapper}>
              {reflection.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagPill}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <SafeAreaView style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Text style={styles.cancelText}>বাতিল</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>নোট সম্পাদনা</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={styles.saveText}>সংরক্ষণ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editForm} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>শিরোনাম</Text>
            <TextInput
              style={styles.textInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="শিরোনাম লিখুন"
            />

            <Text style={styles.inputLabel}>মূল উপলব্ধি ও শিক্ষা (Learning)</Text>
            <TextInput
              style={[styles.textInput, styles.multiInput]}
              value={editLearning}
              onChangeText={setEditLearning}
              multiline
              numberOfLines={4}
              placeholder="কী শিক্ষা পেলেন?"
            />

            <Text style={styles.inputLabel}>ভবিষ্যতের করণীয় / অঙ্গীকার (Action Item)</Text>
            <TextInput
              style={[styles.textInput, styles.multiInput]}
              value={editAction}
              onChangeText={setEditAction}
              multiline
              numberOfLines={3}
              placeholder="ভবিষ্যতে কীভাবে নিজেকে শুধরাবেন?"
            />

            <Text style={styles.inputLabel}>ঘটনা বা প্রেক্ষাপট (Story)</Text>
            <TextInput
              style={[styles.textInput, styles.multiInput, { minHeight: 120 }]}
              value={editStory}
              onChangeText={setEditStory}
              multiline
              numberOfLines={6}
              placeholder="সম্পূর্ণ ঘটনা বা বিবরণ..."
            />
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
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  notFoundText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  backBtnText: {
    color: Colors.textInverse,
    fontWeight: Typography.fontWeights.semibold,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
  dateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
  },
  title: {
    fontSize: Typography.fontSizes.title,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
    lineHeight: 34,
    marginBottom: Spacing.md,
  },
  hikmahCard: {
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentDark,
  },
  hikmahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  hikmahTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.accentDark,
  },
  hikmahBody: {
    fontSize: Typography.fontSizes.md,
    color: Colors.primaryDark,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  actionTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.success,
  },
  actionBody: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  sectionBody: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  accordionContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.sm,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
  },
  accordionBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  rawTranscriptText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tagsSection: {
    marginTop: Spacing.md,
  },
  tagsLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  editModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
  },
  editModalTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  saveText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  editForm: {
    padding: Spacing.xl,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: Typography.fontSizes.sm,
    color: Colors.text,
  },
  multiInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
