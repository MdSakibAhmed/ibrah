import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseService } from '../services/database';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database schemas on startup
    DatabaseService.init().catch((err) => {
      console.error('[RootLayout] Database initialization failed:', err);
    });
  }, []);

  return (
    <SafeAreaProvider style={styles.provider}>
      <StatusBar style="dark" />
      <View style={styles.webContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen
            name="record"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="reflection/[id]" />
          <Stack.Screen name="learnings" />
          <Stack.Screen name="settings" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#ECEFEA' : Colors.background,
  },
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 680 : undefined,
    alignSelf: 'center',
    backgroundColor: Colors.background,
    // Web shadow for card-like container
    ...Platform.select({
      web: {
        boxShadow: '0 4px 24px rgba(13, 59, 46, 0.08)',
      },
      default: {},
    }),
  },
});
