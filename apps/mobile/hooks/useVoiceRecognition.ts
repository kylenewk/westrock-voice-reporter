import { useState, useCallback, useRef, useEffect } from "react";

// Lazy-load expo-speech-recognition to avoid crashing in Expo Go
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
let speechRecognitionAvailable = false;

try {
  const mod = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
  speechRecognitionAvailable = !!ExpoSpeechRecognitionModule;
} catch {
  console.warn("[VoiceRecognition] expo-speech-recognition not available (Expo Go?)");
}

// No-op hook for when the native module isn't available
const useNoOpEvent = (_event: string, _handler: any) => {};

// How long to wait after the user stops talking before auto-submitting (ms)
const SILENCE_TIMEOUT_MS = 2000;

interface UseVoiceRecognitionReturn {
  transcript: string;
  isListening: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
  onSilenceDetected: React.MutableRefObject<(() => void) | null>;
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Silence detection refs
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenRef = useRef(false);
  const onSilenceDetected = useRef<(() => void) | null>(null);

  const useEvent = speechRecognitionAvailable ? useSpeechRecognitionEvent : useNoOpEvent;

  // Clear the silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Reset and start a new silence timer
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    // Only start the timer if the user has actually spoken something
    if (hasSpokenRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        console.log("[VoiceRecognition] Silence detected — auto-submitting");
        if (onSilenceDetected.current) {
          onSilenceDetected.current();
        }
      }, SILENCE_TIMEOUT_MS);
    }
  }, [clearSilenceTimer]);

  useEvent("start", () => {
    setIsListening(true);
    setError(null);
    hasSpokenRef.current = false;
    clearSilenceTimer();
  });

  useEvent("end", () => {
    setIsListening(false);
    clearSilenceTimer();
  });

  useEvent("result", (event: any) => {
    if (event.results && event.results.length > 0) {
      const text = event.results[0]?.transcript ?? "";
      setTranscript(text);

      // User is actively speaking — mark as spoken and reset the silence timer
      if (text.trim().length > 0) {
        hasSpokenRef.current = true;
        resetSilenceTimer();
      }
    }
  });

  useEvent("error", (event: any) => {
    setError(event.error || "Speech recognition error");
    setIsListening(false);
    clearSilenceTimer();
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => clearSilenceTimer();
  }, [clearSilenceTimer]);

  const startListening = useCallback(async () => {
    if (!speechRecognitionAvailable) {
      setError(
        "Speech recognition requires a dev client build. Run: npx expo run:ios --device"
      );
      return;
    }

    try {
      setTranscript("");
      setError(null);
      hasSpokenRef.current = false;
      clearSilenceTimer();

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setError("Microphone permission is required for voice input.");
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
    } catch (e: any) {
      setError(e.message || "Failed to start voice recognition");
    }
  }, [clearSilenceTimer]);

  const stopListening = useCallback(async () => {
    if (!speechRecognitionAvailable) return;
    clearSilenceTimer();
    try {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (e: any) {
      setError(e.message || "Failed to stop voice recognition");
    }
  }, [clearSilenceTimer]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    resetTranscript,
    onSilenceDetected,
  };
}
