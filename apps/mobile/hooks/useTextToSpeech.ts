import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";

// Preferred voice names in order of naturalness
const PREFERRED_NAMES = ["Ava", "Zoe", "Samantha", "Allison", "Nicky"];

// Lazy-loaded — NOT imported at module evaluation time to avoid crash on launch
let _speechLib: any = null;
let _speechLoadAttempted = false;

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

  const speak = useCallback(async (text: string): Promise<void> => {
    const Speech = getSpeechLib();
    if (!Speech) {
      console.warn("[TTS] expo-speech not available, skipping");
      return;
    }

    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setIsSpeaking(true);

      try {
        Speech.speak(text, {
          language: "en-US",
          voice: selectedVoice.current,
          rate: 1.1,
          pitch: 1.05,
          onDone: () => {
            setIsSpeaking(false);
            resolveRef.current = null;
            resolve();
          },
          onStopped: () => {
            setIsSpeaking(false);
            resolveRef.current = null;
            resolve();
          },
          onError: () => {
            setIsSpeaking(false);
            resolveRef.current = null;
            resolve();
          },
        });
      } catch (e: any) {
        console.warn("[TTS] speak error:", e.message);
        setIsSpeaking(false);
        resolveRef.current = null;
        resolve();
      }
    });
  }, []);

  const stop = useCallback(() => {
    try {
      const Speech = getSpeechLib();
      if (Speech) Speech.stop();
    } catch {}
    setIsSpeaking(false);
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  return { isSpeaking, speak, stop };
}
