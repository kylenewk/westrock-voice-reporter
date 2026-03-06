import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WestRock Voice Reporter</Text>
      <Text style={styles.subtitle}>App launched successfully!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#b2bec3",
    fontSize: 16,
    marginTop: 8,
  },
});
