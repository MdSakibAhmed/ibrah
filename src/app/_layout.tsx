import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseService } from '../services/database';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    // Initialize SQLite database schemas on startup
    DatabaseService.init().catch((err) => {
      console.error('[RootLayout] Database initialization failed:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
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
    </SafeAreaProvider>
  );
}
