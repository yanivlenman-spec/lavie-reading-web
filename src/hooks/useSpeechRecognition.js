import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition({ lang, onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const isSupported = getSpeechRecognition() !== null;

  const stop = useCallback(() => {
    activeRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const finalAlts = [];
      const interimAlts = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let alt = 0; alt < result.length; alt++) {
          const t = result[alt]?.transcript?.trim();
          if (t) {
            (result.isFinal ? finalAlts : interimAlts).push(t);
          }
        }
      }

      if (finalAlts.length > 0) {
        onTranscriptRef.current(finalAlts, true);
      } else if (interimAlts.length > 0) {
        onTranscriptRef.current(interimAlts, false);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed') {
        activeRef.current = false;
        setIsListening(false);
        return;
      }
      console.warn('[STT] error:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (activeRef.current) {
        try {
          recognition.start();
          setIsListening(true);
        } catch {
          activeRef.current = false;
        }
      }
    };

    recognitionRef.current = recognition;
    activeRef.current = true;

    try {
      recognition.start();
    } catch {
      activeRef.current = false;
    }
  }, [lang]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  return { isListening, isSupported, start, stop };
}
