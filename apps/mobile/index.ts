import { AppRegistry, View, Text } from "react-native";
import React from "react";

// Absolute minimum app — no expo-router, no hooks, no imports
function MinimalApp() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a2e" }}>
      <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "bold" }}>
        WestRock Voice Reporter
      </Text>
      <Text style={{ color: "#b2bec3", fontSize: 16, marginTop: 8 }}>
        Minimal test — app launched successfully!
      </Text>
    </View>
  );
}

AppRegistry.registerComponent("main", () => MinimalApp);
