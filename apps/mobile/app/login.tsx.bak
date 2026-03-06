import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/config";
import { useAuth } from "../hooks/useAuth";

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch {
      // User will be redirected back via deep link
    }
    // Don't set loading false — the app will navigate away on callback
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>WestRock</Text>
        <Text style={styles.subtitle}>Voice Reporter</Text>
        <Text style={styles.description}>
          Connect your HubSpot account to start recording call reports.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Connect HubSpot</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.textLight,
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
