import { useState, useCallback, useRef, useEffect } from "react";

// How long to wait after the user stops talking before auto-submitting (ms)
const SILENCE_TIMEOUT_MS = 2000;

// Lazy-loaded references — only resolved when startListening() is called,
// NOT at module evaluation time (which would crash on launch).
let _speechModule: any = null;
let _loadAttempted = false;
let _loadError: string | null = null;

function getSpeechModule(): { module: any; error: string | null } {
  if (_loadAttempted) return { module: _speechModule, error: _loadError };
  _loadAttempted = true;
  try {
    const mod = require("expo-speech-recognition");
    if (mod?.ExpoSpeechRecognitionModule) {
      _speechModule = mod;
      console.log("[VoiceRecognition] Module loaded successfully");
    } else {
      _loadError = "Speech recognition module loaded but ExpoSpeechRecognitionModule is missing";
      console.warn("[VoiceRecognition]", _loadError);
    }
  } catch (e: any) {
    _loadError = e.message || "Failed to load speech recognition";
    console.warn("[VoiceRecognition] Load failed:", _loadError);
  }
  return { module: _speechModule, error: _loadError };
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
      console.log("[VoiceRecognition] startListening called");

      // Lazy-load the native module on first actual use
      const { module: mod, error: loadErr } = getSpeechModule();
      if (!mod) {
        const errMsg = loadErr || "Speech recognition not available. Requires a native build.";
        console.error("[VoiceRecognition] Module not available:", errMsg);
        setError(errMsg);
        return;
      }

      const srModule = mod.ExpoSpeechRecognitionModule;
      setTranscript("");
      setError(null);
      hasSpokenRef.current = false;
      clearSilenceTimer();

      // Request permissions
      console.log("[VoiceRecognition] Requesting permissions...");
      const result = await srModule.requestPermissionsAsync();
      console.log("[VoiceRecognition] Permission result:", JSON.stringify(result));
      if (!result.granted) {
        setError("Microphone & speech recognition permissions are required. Check Settings > Privacy.");
        return;
      }

      // Remove old event subscriptions
      eventSubsRef.current.forEach((sub) => {
        try { sub.remove(); } catch {}
      });
      eventSubsRef.current = [];

      // Set up event listeners via the library's addListener API
      if (mod.addSpeechRecognitionListener) {
        console.log("[VoiceRecognition] Setting up event listeners");

        eventSubsRef.current.push(
          mod.addSpeechRecognitionListener("start", () => {
            console.log("[VoiceRecognition] EVENT: start — recognition active");
            setIsListening(true);
            setError(null);
            hasSpokenRef.current = false;
          })
        );

        eventSubsRef.current.push(
          mod.addSpeechRecognitionListener("end", () => {
            console.log("[VoiceRecognition] EVENT: end — recognition stopped");
            setIsListening(false);
            clearSilenceTimer();
          })
        );

        eventSubsRef.current.push(
          mod.addSpeechRecognitionListener("result", (event: any) => {
            if (event.results && event.results.length > 0) {
              const text = event.results[0]?.transcript ?? "";
              const isFinal = event.results[0]?.isFinal ?? false;
              console.log("[VoiceRecognition] EVENT: result —", isFinal ? "FINAL:" : "interim:", text.substring(0, 50));
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
            const errMsg = event.error || event.message || "Speech recognition error";
            console.error("[VoiceRecognition] EVENT: error —", JSON.stringify(event));
            setError(errMsg);
            setIsListening(false);
            clearSilenceTimer();
          })
        );
      } else {
        console.warn("[VoiceRecognition] addSpeechRecognitionListener not available — events won't fire");
        setError("Speech recognition event system not available");
        return;
      }

      // Start recognition — let expo-speech-recognition manage its own audio session
      console.log("[VoiceRecognition] Calling srModule.start()");
      srModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
      console.log("[VoiceRecognition] srModule.start() returned");
    } catch (e: any) {
      const errMsg = e.message || "Failed to start voice recognition";
      console.error("[VoiceRecognition] startListening error:", e);
      setError(errMsg);
    }
  }, [clearSilenceTimer, resetSilenceTimer]);

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    try {
      if (_speechModule?.ExpoSpeechRecognitionModule) {
        console.log("[VoiceRecognition] Stopping recognition");
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
