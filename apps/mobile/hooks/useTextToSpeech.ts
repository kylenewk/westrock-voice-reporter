import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";

// Preferred voice names in order of naturalness
const PREFERRED_NAMES = ["Ava", "Zoe", "Samantha", "Allison", "Nicky"];

// Safety timeout — if TTS onDone/onStopped never fires, auto-resolve
const TTS_TIMEOUT_MS = 30000;

// Lazy-loaded — NOT imported at module evaluation time to avoid crash on launch
let _speechLib: any = null;
let _speechLoadAttempted = false;
let _avLib: any = null;
let _avLoadAttempted = false;

function getSpeechLib(): any {
  if (_speechLoadAttempted) return _speechLib;
  _speechLoadAttempted = true;
  try {
    _speechLib = require("expo-speech");
  } catch (e: any) {
    console.warn("[TTS] Failed to load expo-speech:", e.message);
  }
  return _speechLib;
}

function getAvLib(): any {
  if (_avLoadAttempted) return _avLib;
  _avLoadAttempted = true;
  try {
    _avLib = require("expo-av");
  } catch (e: any) {
    console.warn("[TTS] Failed to load expo-av:", e.message);
  }
  return _avLib;
}

/**
 * Configure the iOS audio session so TTS plays even when the
 * physical mute/silent switch is on.
 */
async function activateAudioForTTS(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const av = getAvLib();
    if (!av?.Audio) return;
    await av.Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
    console.log("[TTS] Audio session activated for playback");
  } catch (e: any) {
    console.warn("[TTS] Failed to activate audio session:", e.message);
  }
}

/**
 * Reset audio session to defaults after TTS finishes, so
 * expo-speech-recognition can configure its own AVAudioEngine
 * session without conflicts.
 */
async function deactivateAudioSession(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const av = getAvLib();
    if (!av?.Audio) return;
    await av.Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
    console.log("[TTS] Audio session reset to defaults");
  } catch (e: any) {
    console.warn("[TTS] Failed to reset audio session:", e.message);
  }
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);
  const selectedVoice = useRef<string | undefined>(undefined);
  const voiceInitRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize voice selection lazily — delayed so it doesn't block startup
  useEffect(() => {
    if (Platform.OS !== "ios" || voiceInitRef.current) return;
    voiceInitRef.current = true;

    const timer = setTimeout(() => {
      try {
        const Speech = getSpeechLib();
        if (!Speech) return;

        Speech.getAvailableVoicesAsync()
          .then((voices: any[]) => {
            const enUS = voices.filter(
              (v: any) => v.language === "en-US" || v.identifier?.includes("en-US")
            );

            const scored = enUS.map((v: any) => {
              const id = v.identifier.toLowerCase();
              const q = String(v.quality || "").toLowerCase();
              let score = 0;

              if (id.includes("premium") || q.includes("premium")) score += 1000;
              else if (id.includes("enhanced") || q.includes("enhanced")) score += 500;
              else if (id.includes("compact") && !id.includes("super-compact")) score += 100;
              else if (id.includes("super-compact")) score += 10;

              const nameIndex = PREFERRED_NAMES.findIndex((n) =>
                id.includes(n.toLowerCase())
              );
              if (nameIndex >= 0) score += (PREFERRED_NAMES.length - nameIndex) * 10;

              return { voice: v, score };
            });

            scored.sort((a: any, b: any) => b.score - a.score);

            if (scored.length > 0) {
              selectedVoice.current = scored[0].voice.identifier;
              console.log(`[TTS] Selected: ${scored[0].voice.identifier} (score: ${scored[0].score})`);
            }
          })
          .catch((err: any) => {
            console.warn("[TTS] Failed to get voices:", err.message);
          });
      } catch (e: any) {
        console.warn("[TTS] Voice init error:", e.message);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const cleanupAfterSpeak = useCallback(async (resolve: () => void) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsSpeaking(false);
    resolveRef.current = null;
    // Reset audio session so speech recognition can use its own
    await deactivateAudioSession();
    resolve();
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    const Speech = getSpeechLib();
    if (!Speech) {
      console.warn("[TTS] expo-speech not available, skipping");
      return;
    }

    // Activate audio session for TTS playback (plays in silent mode)
    await activateAudioForTTS();

    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setIsSpeaking(true);

      // Safety timeout — if onDone/onStopped never fires, force-resolve
      // so the interview flow continues to listening phase
      timeoutRef.current = setTimeout(() => {
        console.warn("[TTS] Timeout — forcing resolve after", TTS_TIMEOUT_MS, "ms");
        try { Speech.stop(); } catch {}
        cleanupAfterSpeak(resolve);
      }, TTS_TIMEOUT_MS);

      try {
        console.log("[TTS] Speaking:", text.substring(0, 80) + (text.length > 80 ? "..." : ""));
        Speech.speak(text, {
          language: "en-US",
          voice: selectedVoice.current,
          rate: 1.1,
          pitch: 1.05,
          onDone: () => {
            console.log("[TTS] onDone fired");
            cleanupAfterSpeak(resolve);
          },
          onStopped: () => {
            console.log("[TTS] onStopped fired");
            cleanupAfterSpeak(resolve);
          },
          onError: (err: any) => {
            console.warn("[TTS] onError fired:", err);
            cleanupAfterSpeak(resolve);
          },
        });
      } catch (e: any) {
        console.warn("[TTS] speak error:", e.message);
        cleanupAfterSpeak(resolve);
      }
    });
  }, [cleanupAfterSpeak]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      const Speech = getSpeechLib();
      if (Speech) Speech.stop();
    } catch {}
    setIsSpeaking(false);
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
    // Fire and forget — reset audio session
    deactivateAudioSession();
  }, []);

  return { isSpeaking, speak, stop };
}
