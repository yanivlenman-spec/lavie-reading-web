import { useState, useEffect, useRef, useCallback } from 'react';

const HINT_THRESHOLDS = [[20000, 4], [14000, 3], [9000, 2], [5000, 1]];

function breakIntoSyllables(word, lang = 'he') {
  const cleaned = word.replace(/[^a-zA-Z\u0590-\u05FF]/g, '');
  if (cleaned.length <= 3) return word;

  const syllables = [];
  let current = '';
  const vowels = lang === 'he' ? '' : 'aeiouyAEIOUY';

  for (let i = 0; i < cleaned.length; i++) {
    current += cleaned[i];
    if (current.length >= 2 && i < cleaned.length - 2) {
      const isVowel = vowels.includes(cleaned[i]);
      const nextIsConsonant = !vowels.includes(cleaned[i + 1]);
      const nextNextIsVowel = vowels.includes(cleaned[i + 2]);

      if (isVowel && nextIsConsonant && nextNextIsVowel) {
        syllables.push(current);
        current = '';
      }
    }
  }

  if (current) syllables.push(current);

  if (syllables.length <= 1 && cleaned.length > 4) {
    const mid = Math.ceil(cleaned.length / 2);
    return cleaned.slice(0, mid) + '·' + cleaned.slice(mid);
  }

  return syllables.length > 1 ? syllables.join('·') : word;
}

export function useWordHint({ currentWordIndex, currentWord, isComplete, started, onAutoAdvance, lang = 'en', onBeforeSpeak, onAfterSpeak }) {
  const [hintLevel, setHintLevel] = useState(0);
  const wordStartTimeRef = useRef(Date.now());
  const wordIndexRef = useRef(currentWordIndex);
  const hasSpokenRef = useRef(false);
  const hasAutoAdvancedRef = useRef(false);

  useEffect(() => {
    if (currentWordIndex !== wordIndexRef.current) {
      wordIndexRef.current = currentWordIndex;
      wordStartTimeRef.current = Date.now();
      hasSpokenRef.current = false;
      hasAutoAdvancedRef.current = false;
      setHintLevel(0);
    }
  }, [currentWordIndex]);

  useEffect(() => {
    if (isComplete || !started) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - wordStartTimeRef.current;
      let newLevel = 0;

      for (const [threshold, level] of HINT_THRESHOLDS) {
        if (elapsed >= threshold) {
          newLevel = level;
          break;
        }
      }

      setHintLevel(newLevel);

      if (newLevel >= 3 && !hasSpokenRef.current) {
        hasSpokenRef.current = true;
        onBeforeSpeak?.();
        speakWord(currentWord, lang);
        setTimeout(() => onAfterSpeak?.(), 1500);
      }

      if (newLevel >= 4 && !hasAutoAdvancedRef.current) {
        hasAutoAdvancedRef.current = true;
        playBleep();
        onAutoAdvance?.();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isComplete, started, currentWord, lang, onAutoAdvance, onBeforeSpeak, onAfterSpeak]);

  const syllables = hintLevel >= 2 ? breakIntoSyllables(currentWord, lang) : null;

  return { hintLevel, syllables };
}

function speakWord(word, lang = 'en') {
  try {
    const clean = word.replace(/[^\p{L}\p{N}]/gu, '');
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = lang === 'he' ? 'he-IL' : 'en-US';
    utt.rate = 0.7;
    utt.volume = 0.8;

    const timeout = Math.max(1500, (clean.length / utt.rate) * 200);
    let finished = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        window.speechSynthesis.cancel();
      }
    };

    utt.onend = finish;
    utt.onerror = finish;
    setTimeout(finish, timeout);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  } catch (e) {
    console.warn('[TTS] error:', e);
  }
}

function playBleep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {
    console.warn('[Audio] error:', e);
  }
}
