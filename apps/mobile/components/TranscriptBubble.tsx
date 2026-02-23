import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/config";
import type { InterviewMessage } from "../types";

interface TranscriptBubbleProps {
  message: InterviewMessage;
}

export function TranscriptBubble({ message }: TranscriptBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.label, isUser ? styles.userLabel : styles.assistantLabel]}>
          {isUser ? "You" : "Reporter AI"}
        </Text>
        <Text
          style={[styles.text, isUser ? styles.userText : styles.assistantText]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  userLabel: {
    color: "rgba(255,255,255,0.7)",
  },
  assistantLabel: {
    color: COLORS.textSecondary,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#ffffff",
  },
  assistantText: {
    color: COLORS.text,
  },
});
