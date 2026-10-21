import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, Text, LogBox } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { getDatabase } from '@/lib/database/client';

SplashScreen.preventAutoHideAsync().catch(() => {});


export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize SQLite database and run schema migrations
        await getDatabase();
      } catch (err: any) {
        console.error('[RootLayout] Startup initialization error:', err);
        setInitError(err?.message || 'Database initialization failed');
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#a1d783" />
      </View>
    );
  }

  if (initError) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-[#FAFAFA]">
        <Text className="text-red-500 text-lg font-bold mb-2">
          Initialization Error
        </Text>
        <Text className="text-slate-500 text-center">
          {initError}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#FAFAFA',
              },
              headerTintColor: '#0F172A',
              headerTitleStyle: {
                fontWeight: '600',
              },
              contentStyle: {
                backgroundColor: '#FAFAFA',
              },
              animation: 'slide_from_right',
            }}>
            <Stack.Screen
              name="index"
              options={{
                title: 'Video Diary',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="crop/index"
              options={{
                title: 'New Video Entry',
                presentation: 'formSheet',
                sheetAllowedDetents: [0.75],
                sheetCornerRadius: 24,
                sheetGrabberVisible: false,
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#FFFFFF',
                },
              }}
            />
            <Stack.Screen
              name="videos/[id]"
              options={{
                title: 'Video Details',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="edit/[id]"
              options={{
                title: 'Edit Video',
                presentation: 'formSheet',
                sheetAllowedDetents: [0.75],
                sheetCornerRadius: 24,
                sheetGrabberVisible: false,
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#FFFFFF',
                },
              }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
