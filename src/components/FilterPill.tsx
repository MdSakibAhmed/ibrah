import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CATEGORIES } from '../constants/categories';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

interface FilterPillProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === (cat.id === 'all' ? 'all' : cat.name);
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.pill,
              isSelected ? styles.pillSelected : styles.pillUnselected,
            ]}
            onPress={() => onSelectCategory(cat.id === 'all' ? 'all' : cat.name)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillUnselected: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  pillTextSelected: {
    color: Colors.textInverse,
    fontWeight: Typography.fontWeights.semibold,
  },
  pillTextUnselected: {
    color: Colors.textSecondary,
  },
});
