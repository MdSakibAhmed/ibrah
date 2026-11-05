import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '../components/Header';
import { FilterPill } from '../components/FilterPill';
import { DailyWisdomCard } from '../components/DailyWisdomCard';
import { ReflectionCard } from '../components/ReflectionCard';
import { DatabaseService } from '../services/database';
import { SyncService } from '../services/syncService';
import { Reflection } from '../types/reflection';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [dailyWisdom, setDailyWisdom] = useState<Reflection | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isCloudActive, setIsCloudActive] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load reflections whenever screen gains focus or filter changes
  const loadData = useCallback(async () => {
    try {
      const list = await DatabaseService.getReflections({
        category: selectedCategory,
        searchQuery: searchQuery.trim(),
      });
      setReflections(list);

      // Load a random past wisdom for the flashback card
      const randomList = await DatabaseService.getRandomWisdom(1);
      if (randomList.length > 0) {
        setDailyWisdom(randomList[0]);
      } else {
        setDailyWisdom(null);
      }
    } catch (error) {
      console.error('[HomeScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      SyncService.isConfigured().then((configured) => setIsCloudActive(configured));
    }, [loadData])
  );

  useEffect(() => {
    SyncService.isConfigured().then((configured) => {
      setIsCloudActive(configured);
      if (configured) {
        SyncService.initRealtime(() => {
          loadData();
        });
      }
    });

    const unsubscribe = SyncService.subscribeStatus(({ isSyncing: syncing }) => {
      setIsSyncing(syncing);
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleManualSync = async () => {
    const configured = await SyncService.isConfigured();
    if (!configured) {
      router.push('/settings');
      return;
    }
    await SyncService.syncAll();
    await loadData();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    const configured = await SyncService.isConfigured();
    if (configured) {
      SyncService.syncAll().then(() => loadData()).catch((e) => console.warn('[HomeScreen] Sync error:', e));
    }
  };

  const handleShuffleWisdom = async () => {
    try {
      const randomList = await DatabaseService.getRandomWisdom(1);
      if (randomList.length > 0) {
        setDailyWisdom(randomList[0]);
      }
    } catch (err) {
      console.error('[HomeScreen] Shuffle wisdom error:', err);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await DatabaseService.toggleFavorite(id);
      setReflections((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
      );
      if (dailyWisdom && dailyWisdom.id === id) {
        setDailyWisdom({ ...dailyWisdom, isFavorite: !dailyWisdom.isFavorite });
      }
    } catch (err) {
      console.error('[HomeScreen] Toggle favorite error:', err);
    }
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={18}
          color={Colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="উপলব্ধি, গল্প বা শিক্ষা খুঁজুন..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <FilterPill
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />
      </View>

      {/* Daily Wisdom Flashback Card (only shown when no specific search is active) */}
      {searchQuery.length === 0 && (
        <DailyWisdomCard
          wisdom={dailyWisdom}
          onRefresh={handleShuffleWisdom}
        />
      )}

      {/* Timeline Section Title */}
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTitle}>
          {selectedCategory === 'all'
            ? 'সকল নোট ও শিক্ষা'
            : `${selectedCategory}`}
        </Text>
        <Text style={styles.countBadge}>{reflections.length}টি</Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="mic" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>
          {searchQuery ? 'কোনো ফলাফল পাওয়া যায়নি' : 'এখনও কোনো নোট নেই'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? 'অন্য কোনো শব্দ বা ট্যাগ দিয়ে খুঁজে দেখুন।'
            : 'আপনার দৈনন্দিন জীবনের কোনো ঘটনা বা দ্বীনি কথা রেকর্ড করতে নিচের বাটনটি চাপুন।'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="ইবরা"
        subtitle="উপলব্ধি ও আত্মশুদ্ধির ডায়েরি"
        rightAction="settings"
        isCloudActive={isCloudActive}
        isSyncing={isSyncing}
        onSyncPress={handleManualSync}
      />

      <FlatList
        data={reflections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReflectionCard
            reflection={item}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button for Instant Voice Capture */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.learningsButton}
          onPress={() => router.push('/learnings')}
          activeOpacity={0.85}
          accessibilityLabel="হিকমাহ ও লার্নিংস হাব"
        >
          <Ionicons name="sparkles" size={18} color={Colors.accentDark} />
          <Text style={styles.learningsButtonText}>লার্নিংস</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/record')}
          activeOpacity={0.88}
          accessibilityLabel="ভয়েস রেকর্ড করুন"
        >
          <View style={styles.fabInnerRing}>
            <Ionicons name="mic" size={26} color={Colors.textInverse} />
          </View>
          <Text style={styles.fabText}>রেকর্ড</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 110,
  },
  listHeader: {
    paddingBottom: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.text,
  },
  categoriesWrapper: {
    marginBottom: Spacing.xs,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  timelineTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
  },
  countBadge: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  centerContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  learningsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    shadowColor: Colors.accentDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  learningsButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.accentDark,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  fabInnerRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
});
