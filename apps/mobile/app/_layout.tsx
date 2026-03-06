import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Slot } from "expo-router";

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
});
