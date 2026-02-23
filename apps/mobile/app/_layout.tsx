import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/config";

export default function RootLayout() {
  return (
    <>
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
    </>
  );
}
