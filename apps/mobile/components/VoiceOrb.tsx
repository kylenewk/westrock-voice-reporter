import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from "../constants/config";
import type { InterviewState } from "../types";

interface VoiceOrbProps {
  state: InterviewState;
  onPress?: () => void;
}

const STATE_COLORS: Record<string, string> = {
  listening: COLORS.listening,
  processing: COLORS.processing,
  responding: COLORS.speaking,
  greeting: COLORS.speaking,
  summarizing: COLORS.processing,
  idle: COLORS.textLight,
  complete: COLORS.success,
};

export function VoiceOrb({ state, onPress }: VoiceOrbProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isActive = state === "listening" || state === "responding";

  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, pulseAnim]);

  const orbColor = STATE_COLORS[state] || COLORS.textLight;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.outerRing,
            {
              borderColor: orbColor,
              opacity: isActive ? 0.3 : 0,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <View style={[styles.orb, { backgroundColor: orbColor }]}>
          <View style={styles.innerHighlight} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
  },
  outerRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  orb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerHighlight: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginTop: -10,
    marginLeft: -10,
  },
});
