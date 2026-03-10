import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../../constants/config";
import { useInterview } from "../../hooks/useInterview";
import { VoiceOrb } from "../../components/VoiceOrb";
import { TranscriptBubble } from "../../components/TranscriptBubble";
import type { InterviewMessage } from "../../types";

// Screen-level error boundary so a crash here doesn't kill the whole app
class InterviewErrorBoundary extends React.Component<
  { children: React.ReactNode; onGoBack: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[InterviewError]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.container}>
          <Text style={boundaryStyles.icon}>!</Text>
          <Text style={boundaryStyles.title}>Interview Error</Text>
          <ScrollView style={boundaryStyles.errorBox}>
            <Text style={boundaryStyles.errorText}>
              {this.state.error?.message || "An unexpected error occurred"}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={boundaryStyles.button}
            onPress={this.props.onGoBack}
          >
            <Text style={boundaryStyles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: COLORS.primary,
  },
  icon: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.error,
    marginBottom: 12,
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: "center",
    borderRadius: 32,
    borderWidth: 3,
    borderColor: COLORS.error,
    overflow: "hidden",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },
  errorBox: {
    maxHeight: 120,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});

function InterviewContent() {
  // Prevent the screen from sleeping during an interview.
  // iOS kills native audio/speech modules when the screen goes dark,
  // causing a hard crash. The screen should stay on while interviewing.
  useKeepAwake();

  const { dealId } = useLocalSearchParams<{ dealId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList<InterviewMessage>>(null);

  const {
    state,
    messages,
    currentTranscript,
    error,
    voiceError,
    sessionId,
    startInterview,
    finishSpeaking,
    endInterview,
    generateReport,
  } = useInterview();

  // Combine errors — show voice errors alongside interview errors
  const displayError = error || voiceError;

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
      router.replace({ pathname: "/report/[dealId]", params: { dealId, sessionId: sessionId || "" } } as any);
    }
  }, [state]);

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
      {displayError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{displayError}</Text>
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
              Speak naturally about your call. I'll listen and move on
              when you pause.
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

export default function InterviewScreen() {
  const router = useRouter();
  return (
    <InterviewErrorBoundary onGoBack={() => router.back()}>
      <InterviewContent />
    </InterviewErrorBoundary>
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
