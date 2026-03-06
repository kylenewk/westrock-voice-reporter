import React, { useEffect } from "react";
import { LogBox, ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { COLORS } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Suppress noisy dev warnings from showing the yellow banner
LogBox.ignoreLogs([
  "expo-speech-recognition",
  "VoiceRecognition",
  "new NativeEventEmitter",
  "Sending `on",
]);

export default function RootLayout() {
  const { isAuthenticated, loading, checkAuth, handleCallback } = useAuth();
  const router = useRouter();
  const navState = useRootNavigationState();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for deep link callbacks from OAuth flow
  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      if (handleCallback(event.url)) {
        // Auth succeeded — navigate to home
        router.replace("/");
      }
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleCallback(url);
      }
    });

    return () => subscription.remove();
  }, []);

  // Redirect to login if not authenticated (once navigation is ready)
  useEffect(() => {
    if (loading || !navState?.key) return;

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, navState?.key]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="index"
          options={{ title: "WestRock Voice Reporter" }}
        />
        <Stack.Screen
          name="deal/[id]"
          options={{ title: "Deal Details" }}
        />
        <Stack.Screen
          name="interview/[dealId]"
          options={{
            title: "Call Report",
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="report/[dealId]"
          options={{ title: "Review Report" }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
