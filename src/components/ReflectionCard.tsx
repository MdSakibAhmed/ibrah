import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Reflection } from '../types/reflection';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

interface ReflectionCardProps {
  reflection: Reflection;
  onToggleFavorite?: (id: string) => void;
}

export const ReflectionCard: React.FC<ReflectionCardProps> = ({
  reflection,
  onToggleFavorite,
}) => {
  const router = useRouter();

  const formattedDate = new Date(reflection.createdAt).toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'short',
  });

  const durationFormatted = reflection.audioDurationSeconds
    ? `${Math.floor(reflection.audioDurationSeconds / 60)}:${(
        Math.floor(reflection.audioDurationSeconds % 60)
      )
        .toString()
        .padStart(2, '0')}`
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/reflection/${reflection.id}`)}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{reflection.category}</Text>
        </View>

        <View style={styles.metaRow}>
          {durationFormatted && (
            <View style={styles.audioBadge}>
              <Ionicons name="mic-outline" size={13} color={Colors.primary} />
              <Text style={styles.audioDurationText}>{durationFormatted}</Text>
            </View>
          )}

          <Text style={styles.dateText}>{formattedDate}</Text>

          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(reflection.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.favoriteBtn}
            >
              <Ionicons
                name={reflection.isFavorite ? 'star' : 'star-outline'}
                size={18}
                color={reflection.isFavorite ? Colors.accent : Colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {reflection.title}
      </Text>

      <Text style={styles.summary} numberOfLines={2}>
        {reflection.summary || reflection.story}
      </Text>

      {reflection.actionCommitment ? (
        <View style={styles.actionContainer}>
          <Ionicons name="arrow-forward-circle" size={14} color={Colors.success} />
          <Text style={styles.actionText} numberOfLines={1}>
            ভবিষ্যতের অঙ্গীকার: {reflection.actionCommitment}
          </Text>
        </View>
      ) : null}

      {reflection.tags && reflection.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {reflection.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {reflection.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{reflection.tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  audioDurationText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  dateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
  },
  favoriteBtn: {
    marginLeft: 2,
  },
  title: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  summary: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    color: Colors.success,
    fontWeight: Typography.fontWeights.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  moreTagsText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
  },
});
