import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '../components/Header';
import { DatabaseService } from '../services/database';
import { Reflection } from '../types/reflection';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

export default function LearningsScreen() {
  const router = useRouter();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const list = await DatabaseService.getReflections({
        searchQuery: selectedTag ? `#${selectedTag}` : undefined,
      });
      setReflections(list);

      const tags = await DatabaseService.getAllTags();
      setAllTags(tags);
    } catch (err) {
      console.error('[LearningsScreen] Error loading learnings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const renderTagSelector = () => {
    if (allTags.length === 0) return null;

    return (
      <View style={styles.tagsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
          <TouchableOpacity
            style={[styles.tagPill, selectedTag === null && styles.tagPillActive]}
            onPress={() => setSelectedTag(null)}
          >
            <Text style={[styles.tagPillText, selectedTag === null && styles.tagPillTextActive]}>
              সব শিক্ষা ({reflections.length})
            </Text>
          </TouchableOpacity>

          {allTags.map((tag, idx) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.tagPill, isSelected && styles.tagPillActive]}
                onPress={() => setSelectedTag(isSelected ? null : tag)}
              >
                <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderLearningCard = ({ item }: { item: Reflection }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => router.push(`/reflection/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.category}</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <Text style={styles.itemTitle}>{item.title}</Text>

        <View style={styles.learningQuote}>
          <Ionicons name="sparkles" size={16} color={Colors.accentDark} style={styles.sparkleIcon} />
          <Text style={styles.learningText}>"{item.learning}"</Text>
        </View>

        {item.actionCommitment ? (
          <View style={styles.actionItem}>
            <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />
            <Text style={styles.actionText}>ভবিষ্যতের করণীয়: {item.actionCommitment}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="প্রজ্ঞা ও শিক্ষা হাব"
        subtitle="অতীতের সমস্ত উপলব্ধির সারসংক্ষেপ"
        showBack
        rightAction="none"
      />

      {renderTagSelector()}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : reflections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={44} color={Colors.accent} />
          <Text style={styles.emptyTitle}>কোনো শিক্ষা পাওয়া যায়নি</Text>
          <Text style={styles.emptySub}>
            হোম পেজ থেকে নতুন কোনো ঘটনা বা কথা রেকর্ড করলে তার মূল শিক্ষা এখানে একত্রিত হবে।
          </Text>
        </View>
      ) : (
        <FlatList
          data={reflections}
          keyExtractor={(item) => item.id}
          renderItem={renderLearningCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tagsContainer: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tagsScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  tagPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagPillText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  tagPillTextActive: {
    color: Colors.textInverse,
    fontWeight: Typography.fontWeights.semibold,
  },
  listContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  categoryPill: {
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  categoryPillText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
  dateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
  },
  itemTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  learningQuote: {
    flexDirection: 'row',
    backgroundColor: Colors.accentLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    marginBottom: Spacing.sm,
  },
  sparkleIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  learningText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.primaryDark,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    color: Colors.success,
    fontWeight: Typography.fontWeights.medium,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
