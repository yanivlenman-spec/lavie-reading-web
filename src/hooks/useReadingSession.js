import { useState, useRef, useCallback } from 'react';
import { matchTranscriptToWord } from '../utils/sttMatcher';

export function useReadingSession({ sentences, language = 'he' }) {
  // sentences can be either array of arrays (words) or array of strings
  const allWords = sentences.flat();

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [mode, setMode] = useState('speech');
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState(null);

  const startTimeRef = useRef(Date.now());
  const wordsCorrectRef = useRef(0);
  const currentIndexRef = useRef(0);
  const isCompleteRef = useRef(false);
  const modeRef = useRef(mode);

  modeRef.current = mode;
  currentIndexRef.current = currentWordIndex;
  isCompleteRef.current = isComplete;

  const lang = language === 'he' ? 'he-IL' : 'en-US';

  const completeSession = useCallback(() => {
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const wordsRead = allWords.length;
    const wordsCorrect = Math.max(wordsCorrectRef.current, wordsRead);
    const accuracy = wordsRead > 0 ? Math.min(wordsCorrect / wordsRead, 1) : 1;
    const wpm = durationSeconds > 0 ? Math.round((wordsRead / durationSeconds) * 60) : 0;

    const starsEarned = wpm > 40 ? 3 : wpm > 20 ? 2 : 1;
    const points = 10 + starsEarned * 5;

    const stats = {
      wordsRead,
      wordsCorrect,
      accuracy,
      wordsPerMinute: wpm,
      durationSeconds,
      starsEarned,
      points,
      mode: modeRef.current,
    };

    setSessionStats(stats);
    setIsComplete(true);
    isCompleteRef.current = true;

    return stats;
  }, [allWords]);

  const advance = useCallback((nextIndex) => {
    if (isCompleteRef.current) return;

    const newIndex = nextIndex ?? currentIndexRef.current + 1;
    setCurrentWordIndex(newIndex);
    currentIndexRef.current = newIndex;
    wordsCorrectRef.current += 1;

    if (newIndex >= allWords.length) {
      completeSession();
    }
  }, [allWords.length, completeSession]);

  const handleTranscript = useCallback((transcript, isFinal) => {
    if (isCompleteRef.current || modeRef.current !== 'speech') return;

    const result = matchTranscriptToWord(
      Array.isArray(transcript) ? transcript : [transcript],
      allWords,
      currentIndexRef.current
    );

    if (result.matched) {
      advance(result.advanceTo);
    }
  }, [allWords, advance]);

  return {
    currentWordIndex,
    mode,
    setMode,
    isListening: mode === 'speech',
    isSupported: true,
    advance,
    sessionStats,
    isComplete,
    completeSession,
    allWords,
    lang,
    handleTranscript,
  };
}
