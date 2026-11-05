import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Reflection } from '../types/reflection';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

interface DailyWisdomCardProps {
  wisdom: Reflection | null;
  onRefresh?: () => void;
}

export const DailyWisdomCard: React.FC<DailyWisdomCardProps> = ({
  wisdom,
  onRefresh,
}) => {
  const router = useRouter();

  if (!wisdom) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBadge}>
          <Ionicons name="sparkles" size={24} color={Colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>আপনার আত্মশুদ্ধির যাত্রা শুরু হোক</Text>
        <Text style={styles.emptySubtitle}>
          আজকের কোনো ঘটনা বা দ্বীনি কথা রেকর্ড করুন। সময়ের সাথে সাথে আপনার অতীতের শিক্ষাগুলো এখানে মনে করিয়ে দেওয়া হবে।
        </Text>
      </View>
    );
  }

  const formattedDate = new Date(wisdom.createdAt).toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => router.push(`/reflection/${wisdom.id}`)}
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={13} color={Colors.accentDark} />
          <Text style={styles.badgeText}>অতীতের উপলব্ধি • ফ্ল্যাশব্যাক</Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh-outline" size={16} color={Colors.accentDark} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {wisdom.title}
      </Text>

      <View style={styles.quoteBox}>
        <Ionicons
          name="bulb-outline"
          size={16}
          color={Colors.accentDark}
          style={styles.quoteIcon}
        />
        <Text style={styles.learningText} numberOfLines={3}>
          "{wisdom.learning}"
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.dateText}>{formattedDate}</Text>
        <View style={styles.readMore}>
          <Text style={styles.readMoreText}>মূল ঘটনা পড়ুন</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    shadowColor: Colors.accentDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  badgeText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.accentDark,
  },
  refreshBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.sm,
  },
  quoteBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  quoteIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  learningText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
    color: Colors.text,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  dateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
