import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/theme';

interface WaveformIndicatorProps {
  isRecording: boolean;
}

export const WaveformIndicator: React.FC<WaveformIndicatorProps> = ({ isRecording }) => {
  const anim1 = useRef(new Animated.Value(0.4)).current;
  const anim2 = useRef(new Animated.Value(0.7)).current;
  const anim3 = useRef(new Animated.Value(1)).current;
  const anim4 = useRef(new Animated.Value(0.5)).current;
  const anim5 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!isRecording) {
      anim1.setValue(0.3);
      anim2.setValue(0.3);
      anim3.setValue(0.3);
      anim4.setValue(0.3);
      anim5.setValue(0.3);
      return;
    }

    const createPulse = (anim: Animated.Value, duration: number, toValue: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.25,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const l1 = createPulse(anim1, 400, 1.2);
    const l2 = createPulse(anim2, 320, 1.6);
    const l3 = createPulse(anim3, 450, 1.8);
    const l4 = createPulse(anim4, 380, 1.4);
    const l5 = createPulse(anim5, 410, 1.1);

    l1.start();
    l2.start();
    l3.start();
    l4.start();
    l5.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
      l4.stop();
      l5.stop();
    };
  }, [isRecording]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, { transform: [{ scaleY: anim1 }] }]} />
      <Animated.View style={[styles.bar, { transform: [{ scaleY: anim2 }] }]} />
      <Animated.View style={[styles.bar, styles.mainBar, { transform: [{ scaleY: anim3 }] }]} />
      <Animated.View style={[styles.bar, { transform: [{ scaleY: anim4 }] }]} />
      <Animated.View style={[styles.bar, { transform: [{ scaleY: anim5 }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 8,
  },
  bar: {
    width: 6,
    height: 36,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  mainBar: {
    backgroundColor: Colors.primary,
    height: 44,
    width: 7,
  },
});
