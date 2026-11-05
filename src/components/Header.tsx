import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: 'settings' | 'learnings' | 'none';
  isCloudActive?: boolean;
  isSyncing?: boolean;
  onSyncPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'ইবরা',
  subtitle = 'দৈনন্দিন প্রজ্ঞা ও আত্মশুদ্ধির ডায়েরি',
  showBack = false,
  rightAction = 'settings',
  isCloudActive = false,
  isSyncing = false,
  onSyncPress,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="ফিরে যান"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoBadge}>
            <Ionicons name="leaf-outline" size={18} color={Colors.accent} />
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {/* Cloud Sync Icon Indicator */}
        {onSyncPress && (
          <TouchableOpacity
            style={[styles.syncButton, isCloudActive && styles.syncButtonActive]}
            onPress={onSyncPress}
            activeOpacity={0.7}
            accessibilityLabel="ক্লাউড সিঙ্ক স্থিতি"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name={isCloudActive ? 'cloud-done-outline' : 'cloud-offline-outline'}
                size={19}
                color={isCloudActive ? Colors.success : Colors.textMuted}
              />
            )}
          </TouchableOpacity>
        )}

        {rightAction === 'settings' && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
            accessibilityLabel="সেটিংস ও ব্যাকআপ"
          >
            <Ionicons name="settings-outline" size={21} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {rightAction === 'learnings' && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/learnings')}
            activeOpacity={0.7}
            accessibilityLabel="সকল লার্নিং"
          >
            <Ionicons name="sparkles-outline" size={21} color={Colors.accentDark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  syncButtonActive: {
    borderColor: 'rgba(46, 125, 50, 0.3)',
    backgroundColor: Colors.successLight,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
