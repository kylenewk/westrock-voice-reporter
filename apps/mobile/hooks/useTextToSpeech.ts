import { useState, useCallback, useRef } from "react";
import * as Speech from "expo-speech";

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);

  const speak = useCallback(async (text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setIsSpeaking(true);

      Speech.speak(text, {
        language: "en-US",
        rate: 1.0,
        pitch: 1.0,
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
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  return { isSpeaking, speak, stop };
}
