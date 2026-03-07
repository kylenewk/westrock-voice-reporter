import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { useVoiceRecognition } from "./useVoiceRecognition";
import { useTextToSpeech } from "./useTextToSpeech";
import * as api from "../services/api";
import type {
  InterviewState,
  InterviewMessage,
  DealContext,
  StructuredReport,
} from "../types";

/**
 * Configure the iOS audio session for the interview using
 * expo-speech-recognition's own setCategoryIOS().
 *
 * This sets playAndRecord which:
 * 1. Ignores the physical mute switch (TTS plays even on silent)
 * 2. Supports mic input (speech recognition works)
 *
 * We use expo-speech-recognition's API instead of expo-av to avoid
 * conflicts between the two modules fighting over the audio session.
 */
async function configureAudioSessionForInterview(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const mod = require("expo-speech-recognition");
    const srModule = mod?.ExpoSpeechRecognitionModule;
    if (!srModule?.setCategoryIOS) {
      console.warn("[Interview] setCategoryIOS not available");
      return;
    }
    // Import constants for audio session configuration
    const constants = mod;
    srModule.setCategoryIOS({
      category: "playAndRecord",
      categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
      mode: "spokenAudio",
    });
    console.log("[Interview] Audio session set to playAndRecord via expo-speech-recognition");
  } catch (e: any) {
    console.warn("[Interview] Failed to configure audio session:", e.message);
  }
}

interface UseInterviewReturn {
  state: InterviewState;
  messages: InterviewMessage[];
  currentTranscript: string;
  isListening: boolean;
  isSpeaking: boolean;
  dealContext: DealContext | null;
  report: StructuredReport | null;
  sessionId: string | null;
  error: string | null;
  voiceError: string | null;
  startInterview: (dealId: string) => Promise<void>;
  finishSpeaking: () => void;
  endInterview: () => Promise<void>;
  generateReport: () => Promise<void>;
}

export function useInterview(): UseInterviewReturn {
  const [state, setState] = useState<InterviewState>("idle");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [dealContext, setDealContext] = useState<DealContext | null>(null);
  const [report, setReport] = useState<StructuredReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const voice = useVoiceRecognition();
  const tts = useTextToSpeech();

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      const msg: InterviewMessage = {
        role,
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  const startListeningPhase = useCallback(async () => {
    console.log("[Interview] Transitioning to listening phase");
    // Short delay to let the iOS audio session settle after TTS playback.
    // Without this, speech recognition can fail with "not available" because
    // the audio session is still transitioning from playback to recording.
    await new Promise((r) => setTimeout(r, 500));
    setState("listening");
    await voice.startListening();
    console.log("[Interview] voice.startListening() completed");
  }, [voice]);

  // Called when silence detected or user taps "Done"
  const finishSpeaking = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      await voice.stopListening();

      const userText = voice.transcript.trim();
      if (!userText || !sessionIdRef.current) {
        processingRef.current = false;
        await startListeningPhase();
        return;
      }

      // Add user message to display
      addMessage("user", userText);
      voice.resetTranscript();
      setState("processing");

      // Send to Claude
      const result = await api.sendInterviewMessage(
        sessionIdRef.current,
        userText
      );

      // Add assistant response
      addMessage("assistant", result.response);

      if (result.interviewComplete) {
        // Speak the AI's final response, then auto-generate the report
        setState("responding");
        await tts.speak(result.response);
        setState("summarizing");
        // Auto-generate report
        if (sessionIdRef.current) {
          try {
            const reportResult = await api.generateReport(sessionIdRef.current);
            setReport(reportResult.report);
            setState("complete");
          } catch (reportErr: any) {
            setError(reportErr.message || "Failed to generate report");
          }
        }
      } else {
        // Speak the response, then start listening again
        setState("responding");
        await tts.speak(result.response);
        await startListeningPhase();
      }
    } catch (e: any) {
      setError(e.message || "Failed to process message");
      setState("listening");
    } finally {
      processingRef.current = false;
    }
  }, [voice, tts, addMessage, startListeningPhase]);

  // Wire up silence detection to auto-submit
  useEffect(() => {
    voice.onSilenceDetected.current = () => {
      if (state === "listening" && voice.transcript.trim().length > 0) {
        finishSpeaking();
      }
    };
    return () => {
      voice.onSilenceDetected.current = null;
    };
  }, [voice, state, finishSpeaking]);

  const startInterview = useCallback(
    async (dealId: string) => {
      try {
        setError(null);
        setMessages([]);
        setReport(null);
        setState("greeting");

        // Configure audio session ONCE for the entire interview
        // This sets playAndRecord + playsInSilentModeIOS so both
        // TTS and speech recognition work without conflicts
        await configureAudioSessionForInterview();

        const result = await api.startInterview(dealId);
        sessionIdRef.current = result.sessionId;
        setDealContext(result.dealContext);

        // Add greeting message
        addMessage("assistant", result.greeting);

        // Speak greeting, then start listening
        console.log("[Interview] Speaking greeting...");
        setState("responding");
        await tts.speak(result.greeting);
        console.log("[Interview] Greeting TTS finished, starting listening phase");
        await startListeningPhase();
      } catch (e: any) {
        setError(e.message || "Failed to start interview");
        setState("idle");
      }
    },
    [addMessage, tts, startListeningPhase]
  );

  const endInterview = useCallback(async () => {
    try {
      tts.stop();
      await voice.stopListening();
      if (sessionIdRef.current) {
        await api.endInterview(sessionIdRef.current);
      }
      setState("summarizing");
    } catch (e: any) {
      setError(e.message || "Failed to end interview");
    }
  }, [tts, voice]);

  const generateReportFromSession = useCallback(async () => {
    try {
      if (!sessionIdRef.current) {
        setError("No active session");
        return;
      }
      setState("summarizing");
      const result = await api.generateReport(sessionIdRef.current);
      setReport(result.report);
      setState("complete");
    } catch (e: any) {
      setError(e.message || "Failed to generate report");
    }
  }, []);

  return {
    state,
    messages,
    currentTranscript: voice.transcript,
    isListening: voice.isListening,
    isSpeaking: tts.isSpeaking,
    dealContext,
    report,
    sessionId: sessionIdRef.current,
    error,
    voiceError: voice.error,
    startInterview,
    finishSpeaking,
    endInterview,
    generateReport: generateReportFromSession,
  };
}
