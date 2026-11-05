import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

interface AudioPlayerCardProps {
  audioUri: string;
  durationSeconds?: number;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({
  audioUri,
  durationSeconds = 0,
}) => {
  const [hasError, setHasError] = useState(false);

  // Initialize player with the audio URI
  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const status = useAudioPlayerStatus(player);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePlay = async () => {
    try {
      if (!player) return;
      if (status.playing) {
        player.pause();
      } else {
        // If track finished, replay from beginning
        if (status.duration > 0 && status.currentTime >= status.duration) {
          await player.seekTo(0);
        }
        player.play();
      }
    } catch (err) {
      console.error('[AudioPlayerCard] Playback error:', err);
      setHasError(true);
    }
  };

  const handleSeek = async (forward: boolean) => {
    try {
      if (!player || !status.duration) return;
      const step = 5; // 5 seconds
      const newPos = forward
        ? Math.min(status.duration, status.currentTime + step)
        : Math.max(0, status.currentTime - step);
      await player.seekTo(newPos);
    } catch (err) {
      console.error('[AudioPlayerCard] Seek error:', err);
    }
  };

  const currentTime = status.currentTime || 0;
  const totalDuration = status.duration || durationSeconds || 0;
  const progressPercent =
    totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
        <Text style={styles.errorText}>অডিও ফাইলটি চালাতে সমস্যা হচ্ছে</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.labelContainer}>
          <Ionicons name="mic" size={15} color={Colors.primary} />
          <Text style={styles.labelText}>রেকর্ডকৃত ভয়েস</Text>
        </View>

        <Text style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={() => handleSeek(false)}
          style={styles.seekButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="৫ সেকেন্ড পিছিয়ে যান"
        >
          <Ionicons name="play-back" size={18} color={Colors.primary} />
          <Text style={styles.seekText}>5s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleTogglePlay}
          style={styles.playButton}
          activeOpacity={0.8}
          accessibilityLabel={status.playing ? 'বিরতি দিন' : 'চালান'}
        >
          <Ionicons
            name={status.playing ? 'pause' : 'play'}
            size={22}
            color={Colors.textInverse}
            style={status.playing ? {} : { marginLeft: 2 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSeek(true)}
          style={styles.seekButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="৫ সেকেন্ড এগিয়ে যান"
        >
          <Text style={styles.seekText}>5s</Text>
          <Ionicons name="play-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
  timeText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(13, 59, 46, 0.12)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  seekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: Spacing.xs,
  },
  seekText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginVertical: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.danger,
  },
});
