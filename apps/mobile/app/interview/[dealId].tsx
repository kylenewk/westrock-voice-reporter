import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../../constants/config";
import { useInterview } from "../../hooks/useInterview";
import { VoiceOrb } from "../../components/VoiceOrb";
import { TranscriptBubble } from "../../components/TranscriptBubble";
import type { InterviewMessage } from "../../types";

export default function InterviewScreen() {
  const { dealId } = useLocalSearchParams<{ dealId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList<InterviewMessage>>(null);

  const {
    state,
    messages,
    currentTranscript,
    error,
    startInterview,
    finishSpeaking,
    endInterview,
    generateReport,
  } = useInterview();

  // Start interview on mount
  useEffect(() => {
    if (dealId && state === "idle") {
      startInterview(dealId);
    }
  }, [dealId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Navigate to report when complete
  useEffect(() => {
    if (state === "complete") {
      router.replace(`/report/${dealId}`);
    }
  }, [state]);

  const handleDone = () => {
    if (state === "listening" && currentTranscript.trim()) {
      finishSpeaking();
    }
  };

  const handleEnd = () => {
    Alert.alert(
      "End Interview",
      "Are you sure you want to end the interview and generate the report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End & Generate Report",
          style: "destructive",
          onPress: async () => {
            await endInterview();
            await generateReport();
          },
        },
      ]
    );
  };

  const stateLabel = (() => {
    switch (state) {
      case "greeting":
        return "Starting...";
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "responding":
        return "AI Speaking...";
      case "summarizing":
        return "Generating Report...";
      default:
        return "";
    }
  })();

  return (
    <View style={styles.container}>
      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Transcript */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.transcriptContent}
        renderItem={({ item }) => <TranscriptBubble message={item} />}
        ListHeaderComponent={
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptHint}>
              Speak naturally about your call. Tap "Done" when you finish a
              thought.
            </Text>
          </View>
        }
      />

      {/* Live Transcript Preview */}
      {state === "listening" && currentTranscript.trim() !== "" && (
        <View style={styles.livePreview}>
          <Text style={styles.livePreviewText} numberOfLines={2}>
            {currentTranscript}
          </Text>
        </View>
      )}

      {/* Voice Orb & Controls */}
      <View style={styles.controls}>
        <Text style={styles.stateLabel}>{stateLabel}</Text>

        <VoiceOrb state={state} />

        <View style={styles.buttonRow}>
          {state === "listening" && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
          {(state === "listening" || state === "responding") && (
            <TouchableOpacity
              style={styles.endButton}
              onPress={handleEnd}
              activeOpacity={0.8}
            >
              <Text style={styles.endButtonText}>End Interview</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: "#ffeaea",
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  transcriptContent: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  transcriptHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  transcriptHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 18,
  },
  livePreview: {
    marginHorizontal: 16,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  livePreviewText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontStyle: "italic",
  },
  controls: {
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 40,
  },
  stateLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  doneButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  doneButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  endButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  endButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
});
