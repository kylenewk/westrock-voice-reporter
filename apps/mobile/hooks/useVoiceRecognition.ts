import { useState, useCallback, useEffect, useRef } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

interface UseVoiceRecognitionReturn {
  transcript: string;
  isListening: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (event.results && event.results.length > 0) {
      setTranscript(event.results[0]?.transcript ?? "");
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setError(event.error || "Speech recognition error");
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    try {
      setTranscript("");
      setError(null);

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
  }, []);

  const stopListening = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (e: any) {
      setError(e.message || "Failed to stop voice recognition");
    }
  }, []);

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
  };
}
