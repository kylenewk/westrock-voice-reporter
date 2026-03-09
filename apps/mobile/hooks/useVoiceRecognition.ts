import { useState, useCallback, useRef, useEffect } from "react";

// How long to wait after the user stops talking before auto-submitting (ms)
const SILENCE_TIMEOUT_MS = 1200;

// Retry config for starting speech recognition
const MAX_START_RETRIES = 3;
const RETRY_DELAY_MS = 600;

/**
 * Load the expo-speech-recognition native module.
 * Can be called multiple times — will re-attempt if previous load failed.
 */
let _speechModule: any = null;

function getSpeechModule(): { srModule: any; error: string | null } {
  if (_speechModule) return { srModule: _speechModule, error: null };
  try {
    const mod = require("expo-speech-recognition");
    if (mod?.ExpoSpeechRecognitionModule) {
      _speechModule = mod.ExpoSpeechRecognitionModule;
      console.log("[VoiceRecognition] Module loaded successfully");
      return { srModule: _speechModule, error: null };
    } else {
      const err = "Speech module loaded but ExpoSpeechRecognitionModule missing";
      console.warn("[VoiceRecognition]", err);
      return { srModule: null, error: err };
    }
  } catch (e: any) {
    const err = e.message || "Failed to load speech recognition";
    console.warn("[VoiceRecognition] Load failed:", err);
    return { srModule: null, error: err };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  /** Remove all existing event subscriptions */
  const cleanupListeners = useCallback(() => {
    eventSubsRef.current.forEach((sub) => {
      try { sub.remove(); } catch {}
    });
    eventSubsRef.current = [];
  }, []);

  /** Set up fresh event listeners on the native module */
  const setupListeners = useCallback(
    (srModule: any) => {
      cleanupListeners();

      console.log("[VoiceRecognition] Setting up event listeners");

      eventSubsRef.current.push(
        srModule.addListener("start", () => {
          console.log("[VoiceRecognition] EVENT: start — recognition active");
          setIsListening(true);
          setError(null);
          hasSpokenRef.current = false;
        })
      );

      eventSubsRef.current.push(
        srModule.addListener("end", () => {
          console.log("[VoiceRecognition] EVENT: end — recognition stopped");
          setIsListening(false);
          clearSilenceTimer();
        })
      );

      eventSubsRef.current.push(
        srModule.addListener("result", (event: any) => {
          if (event.results && event.results.length > 0) {
            const text = event.results[0]?.transcript ?? "";
            const isFinal = event.isFinal ?? false;
            console.log(
              "[VoiceRecognition] EVENT: result —",
              isFinal ? "FINAL:" : "interim:",
              text.substring(0, 50)
            );
            setTranscript(text);
            if (text.trim().length > 0) {
              hasSpokenRef.current = true;
              resetSilenceTimer();
            }
          }
        })
      );

      eventSubsRef.current.push(
        srModule.addListener("error", (event: any) => {
          const errMsg = event.error || event.message || "Speech recognition error";
          console.error(
            "[VoiceRecognition] EVENT: error —",
            JSON.stringify(event)
          );
          // Don't show transient "not available" errors — the retry logic
          // in startListening will handle them.
          setError(errMsg);
          setIsListening(false);
          clearSilenceTimer();
        })
      );
    },
    [cleanupListeners, clearSilenceTimer, resetSilenceTimer]
  );

  const startListening = useCallback(async () => {
    try {
      console.log("[VoiceRecognition] startListening called");

      // Load the native module
      const { srModule, error: loadErr } = getSpeechModule();
      if (!srModule) {
        const errMsg =
          loadErr || "Speech recognition not available. Requires a native build.";
        console.error("[VoiceRecognition] Module not available:", errMsg);
        setError(errMsg);
        return;
      }

      setTranscript("");
      setError(null);
      hasSpokenRef.current = false;
      clearSilenceTimer();

      // Request permissions
      console.log("[VoiceRecognition] Requesting permissions...");
      const result = await srModule.requestPermissionsAsync();
      console.log(
        "[VoiceRecognition] Permission result:",
        JSON.stringify(result)
      );
      if (!result.granted) {
        setError(
          "Microphone & speech recognition permissions required. Check Settings > Privacy."
        );
        return;
      }

      // Set up fresh event listeners
      setupListeners(srModule);

      // Attempt to start recognition with retries.
      // iOS can throw "not available" errors if the audio session is still
      // transitioning from TTS playback; a short delay and retry fixes this.
      let lastErr: string | null = null;
      for (let attempt = 1; attempt <= MAX_START_RETRIES; attempt++) {
        try {
          console.log(
            `[VoiceRecognition] Calling srModule.start() (attempt ${attempt}/${MAX_START_RETRIES})`
          );

          // Stop any lingering recognition before retrying
          if (attempt > 1) {
            try { srModule.stop(); } catch {}
            await delay(RETRY_DELAY_MS);
            // Re-setup listeners since stop may have triggered "end" event
            setupListeners(srModule);
          }

          srModule.start({
            lang: "en-US",
            interimResults: true,
            continuous: true,
          });

          console.log("[VoiceRecognition] srModule.start() returned");

          // Give the native side a moment to report errors
          await delay(300);

          // If we're not in an error state, break out of retry loop
          // (the "start" event sets isListening=true, "error" event sets error)
          lastErr = null;
          break;
        } catch (startErr: any) {
          lastErr = startErr.message || "Failed to start recognition";
          console.warn(
            `[VoiceRecognition] start() attempt ${attempt} failed:`,
            lastErr
          );
          if (attempt < MAX_START_RETRIES) {
            await delay(RETRY_DELAY_MS);
          }
        }
      }

      if (lastErr) {
        setError(lastErr);
      }
    } catch (e: any) {
      const errMsg = e.message || "Failed to start voice recognition";
      console.error("[VoiceRecognition] startListening error:", e);
      setError(errMsg);
    }
  }, [clearSilenceTimer, setupListeners]);

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    try {
      if (_speechModule) {
        console.log("[VoiceRecognition] Stopping recognition");
        _speechModule.stop();
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
