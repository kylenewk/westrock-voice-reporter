import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";

// How long to wait after the user stops talking before auto-submitting (ms)
const SILENCE_TIMEOUT_MS = 2000;

// Lazy-loaded references — only resolved when startListening() is called,
// NOT at module evaluation time (which would crash on launch).
let _speechModule: any = null;
let _loadAttempted = false;
let _loadError: string | null = null;
let _avLib: any = null;
let _avLoadAttempted = false;

function getSpeechModule(): { module: any; error: string | null } {
  if (_loadAttempted) return { module: _speechModule, error: _loadError };
  _loadAttempted = true;
  try {
    const mod = require("expo-speech-recognition");
    if (mod?.ExpoSpeechRecognitionModule) {
      _speechModule = mod;
    } else {
      _loadError = "Speech recognition module loaded but is empty";
    }
  } catch (e: any) {
    _loadError = e.message || "Failed to load speech recognition";
    console.warn("[VoiceRecognition] Load failed:", _loadError);
  }
  return { module: _speechModule, error: _loadError };
}

function getAvLib(): any {
  if (_avLoadAttempted) return _avLib;
  _avLoadAttempted = true;
  try {
    _avLib = require("expo-av");
  } catch (e: any) {
    console.warn("[VoiceRecognition] Failed to load expo-av:", e.message);
  }
  return _avLib;
}

/**
 * Ensure the iOS audio session allows recording before starting
 * speech recognition. TTS may have changed the session config.
 */
async function ensureRecordingAudioSession(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const av = getAvLib();
    if (!av?.Audio) return;
    await av.Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      staysActiveInBackground: false,
    });
    console.log("[VoiceRecognition] Audio session configured for recording");
  } catch (e: any) {
    console.warn("[VoiceRecognition] Failed to configure audio session:", e.message);
  }
}

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
  const eventSubsRef = useRef<Array<{ remove: () => void }>>([]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    if (hasSpokenRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        console.log("[VoiceRecognition] Silence detected — auto-submitting");
        if (onSilenceDetected.current) {
          onSilenceDetected.current();
        }
      }, SILENCE_TIMEOUT_MS);
    }
  }, [clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      eventSubsRef.current.forEach((sub) => {
        try { sub.remove(); } catch {}
      });
      eventSubsRef.current = [];
    };
  }, [clearSilenceTimer]);

  const startListening = useCallback(async () => {
    try {
      // Lazy-load the native module on first actual use
      const { module: mod, error: loadErr } = getSpeechModule();
      if (!mod) {
        setError(loadErr || "Speech recognition not available. Requires a native build.");
        return;
      }

      const srModule = mod.ExpoSpeechRecognitionModule;
      setTranscript("");
      setError(null);
      hasSpokenRef.current = false;
      clearSilenceTimer();

      // Ensure audio session allows recording (TTS may have changed it)
      await ensureRecordingAudioSession();

      // Request permissions
      const result = await srModule.requestPermissionsAsync();
      if (!result.granted) {
        setError("Microphone permission is required for voice input.");
        return;
      }

      // Remove old event subscriptions
      eventSubsRef.current.forEach((sub) => {
        try { sub.remove(); } catch {}
      });
      eventSubsRef.current = [];

      // Set up event listeners via the library's addListener API
      if (mod.addSpeechRecognitionListener) {
        eventSubsRef.current.push(
          mod.addSpeechRecognitionListener("start", () => {
            setIsListening(true);
            setError(null);
            hasSpokenRef.current = false;
          })
        );

        eventSubsRef.current.push(
          mod.addSpeechRecognitionListener("end", () => {
            setIsListening(false);
            clearSilenceTimer();
          })
        );

        eventSubsRef.current.push(
          mod.addSpeechRecognitionListener("result", (event: any) => {
            if (event.results && event.results.length > 0) {
              const text = event.results[0]?.transcript ?? "";
              setTranscript(text);
              if (text.trim().length > 0) {
                hasSpokenRef.current = true;
                resetSilenceTimer();
              }
            }
          })
        );

        eventSubsRef.current.push(
          mod.addSpeechRecognitionListener("error", (event: any) => {
            setError(event.error || "Speech recognition error");
            setIsListening(false);
            clearSilenceTimer();
          })
        );
      }

      // Start recognition
      srModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
    } catch (e: any) {
      setError(e.message || "Failed to start voice recognition");
      console.error("[VoiceRecognition] startListening error:", e);
    }
  }, [clearSilenceTimer, resetSilenceTimer]);

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    try {
      if (_speechModule?.ExpoSpeechRecognitionModule) {
        _speechModule.ExpoSpeechRecognitionModule.stop();
      }
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
