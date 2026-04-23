import { useState, useEffect, useRef, useCallback } from 'react';
import storiesData from '../data/stories.json';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { matchTranscriptToWord, stripNikud } from '../utils/sttMatcher';

const HINT_THRESHOLDS = [0, 4, 7, 10, 15];

function stripPunctuation(text) {
  return text.replace(/[.,!?"״]/g, '');
}

function normalizeForMatching(text) {
  return stripNikud(text.replace(/[.,!?"״]/g, '')).toLowerCase();
}

function splitToLetters(word) {
  const cleaned = word.replace(/[.,!?"״]/g, '');
  const letters = [];
  let cur = '';
  for (const ch of cleaned) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x05D0 && code <= 0x05EA) {
      if (cur) letters.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) letters.push(cur);
  return letters;
}

function formatWithDots(word) {
  return splitToLetters(word).join('·');
}

function isPhonemeConfusion(a, b) {
  const confusions = { 'ח': 'כ', 'כ': 'ח', 'ש': 'ס', 'ס': 'ש', 'ת': 'ט', 'ט': 'ת' };
  return confusions[a] === b;
}

function getLettersReadInWord(word, transcript) {
  const normWord = normalizeForMatching(word);
  const normTranscript = normalizeForMatching(transcript);
  if (!normWord || !normTranscript) return 0;

  let matched = 0;
  for (let i = 0; i < normWord.length && i < normTranscript.length; i++) {
    const wChar = normWord[i];
    const tChar = normTranscript[i];
    if (wChar === tChar || isPhonemeConfusion(wChar, tChar)) {
      matched++;
    } else {
      break;
    }
  }
  return matched;
}

function splitWordByProgress(word, lettersRead) {
  const letters = splitToLetters(word);
  const read = letters.slice(0, lettersRead).join('');
  const unread = letters.slice(lettersRead).join('');
  return [read, unread];
}

function speakWord(word) {
  const clean = word.replace(/[\u0591-\u05C7.,!?"״]/g, '');
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'he-IL';
    utt.rate = 0.75;
    window.speechSynthesis.speak(utt);
  }
}

function playBleep() {
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
}

export default function StoryScreen({ storyId, onBack }) {
  const storyObj = storiesData.stories.find(s => s.id === storyId);
  if (!storyObj) return <div>Story not found</div>;

  const allWords = storyObj.sentences.flat();
  const totalWords = allWords.length;

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showLetterBreak, setShowLetterBreak] = useState(false);
  const [lettersReadInWord, setLettersReadInWord] = useState(0);
  const [stars, setStars] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);

  const currentIndexRef = useRef(0);
  const completedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const wordStartTimeRef = useRef(Date.now());
  const prevTranscriptRef = useRef('');
  const hasSpokenHintRef = useRef(false);
  const hintIntervalRef = useRef(null);

  const startHintTimer = useCallback((onAutoAdvance) => {
    if (hintIntervalRef.current) clearInterval(hintIntervalRef.current);
    wordStartTimeRef.current = Date.now();

    hintIntervalRef.current = setInterval(() => {
      if (completedRef.current) return;
      const elapsed = (Date.now() - wordStartTimeRef.current) / 1000;

      let level = 0;
      for (let i = HINT_THRESHOLDS.length - 1; i >= 0; i--) {
        if (elapsed >= HINT_THRESHOLDS[i]) { level = i; break; }
      }

      setHintLevel(level);

      if (level === 3 && !hasSpokenHintRef.current) {
        hasSpokenHintRef.current = true;
        const word = allWords[currentIndexRef.current];
        if (word) speakWord(word);
      }

      if (level >= 4) {
        clearInterval(hintIntervalRef.current);
        playBleep();
        onAutoAdvance();
      }
    }, 500);
  }, [allWords]);

  const advanceTo = useCallback((nextIndex) => {
    if (hintIntervalRef.current) clearInterval(hintIntervalRef.current);
    setHintLevel(0);
    setShowLetterBreak(false);
    setLettersReadInWord(0);
    hasSpokenHintRef.current = false;

    if (nextIndex >= totalWords) {
      const t = Math.round((Date.now() - startTimeRef.current) / 1000);
      const wpm = t > 0 ? Math.round((totalWords / t) * 60) : 0;
      let s = 1;
      if (wpm > 40) s = 3;
      else if (wpm > 20) s = 2;
      setStars(s);
      setTimeSeconds(t);
      completedRef.current = true;
      setCompleted(true);
      return;
    }

    currentIndexRef.current = nextIndex;
    setCurrentWordIndex(nextIndex);

    startHintTimer(() => {
      const next = currentIndexRef.current + 1;
      hasSpokenHintRef.current = false;
      currentIndexRef.current = next;
      setCurrentWordIndex(next);
      if (next >= totalWords) {
        const t = Math.round((Date.now() - startTimeRef.current) / 1000);
        const wpm = t > 0 ? Math.round((totalWords / t) * 60) : 0;
        let s = 1;
        if (wpm > 40) s = 3;
        else if (wpm > 20) s = 2;
        setStars(s);
        setTimeSeconds(t);
        completedRef.current = true;
        setCompleted(true);
      }
    });
  }, [totalWords, startHintTimer]);

  const handleTranscript = useCallback((transcripts, isFinal) => {
    if (completedRef.current) return;

    const primary = transcripts[0] ?? '';
    const prev = prevTranscriptRef.current;
    let delta = primary;
    if (prev && primary.startsWith(prev)) {
      delta = primary.slice(prev.length).trim();
    }

    const phrasesToTry = [
      ...(delta ? [delta] : []),
      ...transcripts.slice(1),
    ];

    if (phrasesToTry.length === 0) return;

    const result = matchTranscriptToWord(phrasesToTry, allWords, currentIndexRef.current);
    if (result.matched) {
      playBleep();
      setShowLetterBreak(false);
      setLettersReadInWord(0);
      advanceTo(result.advanceTo);
    } else {
      let maxLettersRead = 0;
      for (const phrase of phrasesToTry) {
        const letters = getLettersReadInWord(allWords[currentIndexRef.current], phrase);
        maxLettersRead = Math.max(maxLettersRead, letters);
      }
      setLettersReadInWord(maxLettersRead);

      if (isFinal && phrasesToTry.some((p) => p.trim().length > 1)) {
        setShowLetterBreak(true);
      }
    }
    if (isFinal) prevTranscriptRef.current = primary;
  }, [allWords, advanceTo]);

  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    lang: 'he-IL',
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    if (isSupported) {
      start();
      startHintTimer(() => advanceTo(currentIndexRef.current + 1));
    }
    return () => {
      stop();
      if (hintIntervalRef.current) clearInterval(hintIntervalRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const strippedHint = hintLevel >= 2 ? stripNikud(allWords[currentIndexRef.current]) : '';
  const visibleSentenceIndex = Math.floor(currentWordIndex / 100); // Rough estimation

  return (
    <div className="min-h-screen bg-white flex flex-col text-right" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">{storyObj.title}</h1>
        <button
          onClick={onBack}
          className="text-white hover:opacity-80 transition text-2xl"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-yellow-400 transition-all"
          style={{ width: `${(currentWordIndex / totalWords) * 100}%` }}
        />
      </div>

      {/* Story Image */}
      {storyObj.image && (
        <div className="overflow-hidden bg-gray-100 mx-4 mt-4 rounded-lg">
          <img
            src={storyObj.image}
            alt={storyObj.title}
            className="w-full object-cover"
            style={{ aspectRatio: '16/5' }}
          />
        </div>
      )}

      {/* Hints */}
      {hintLevel >= 2 && !showLetterBreak && (
        <div className="flex justify-center mt-4">
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg px-4 py-2">
            <p className="text-lg font-bold text-gray-700 font-mono">{strippedHint}</p>
          </div>
        </div>
      )}
      {hintLevel >= 3 && (
        <div className="text-center text-sm text-red-600 font-medium mt-1">
          🔊 {hintLevel >= 4 ? 'Moving forward...' : 'Listening...'}
        </div>
      )}

      {/* Words Container */}
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
          {allWords.map((word, idx) => {
            const isPast = idx < currentWordIndex;
            const isActive = idx === currentWordIndex;
            const isDone = isPast;

            let bgColor = 'transparent';
            let textColor = '#999';
            if (isActive) {
              if (hintLevel >= 3) bgColor = '#FF6B6B';
              else if (hintLevel >= 1) bgColor = '#FFB300';
              else bgColor = '#FFD700';
              textColor = '#333';
            } else if (isDone) {
              textColor = '#4CAF50';
            }

            let displayWord = word;
            if (isActive) {
              if (showLetterBreak) {
                displayWord = formatWithDots(word);
              } else if (lettersReadInWord > 0) {
                const [read, unread] = splitWordByProgress(word, lettersReadInWord);
                return (
                  <span
                    key={idx}
                    className="mx-1 px-2 py-1 rounded transition"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      opacity: isPast ? 0.35 : 1,
                    }}
                  >
                    <span style={{ color: '#2196F3' }}>{read}</span>
                    <span>{unread}</span>
                  </span>
                );
              }
            }

            return (
              <span
                key={idx}
                className="mx-1 px-2 py-1 rounded transition"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  opacity: isPast ? 0.35 : 1,
                }}
              >
                {displayWord}
              </span>
            );
          })}
        </div>
      </div>

      {/* Completion Screen */}
      {completed && (
        <div className="bg-gradient-to-b from-blue-50 to-white p-6 border-t-2 border-blue-200 text-center">
          <p className="text-lg font-bold text-gray-900 mb-3">🎉 Story Complete!</p>
          <div className="text-4xl mb-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i}>{i < stars ? '⭐' : '☆'}</span>
            ))}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {timeSeconds}s • {Math.round((totalWords / timeSeconds) * 60)} WPM
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            Back to Stories
          </button>
        </div>
      )}

      {/* Mic Bar */}
      {!completed && (
        <div className="bg-white border-t-2 border-gray-200 p-4 flex justify-center gap-3">
          <button
            onClick={isListening ? stop : start}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl transition ${
              isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isListening ? '🎤' : '🔇'}
          </button>
          <div className="flex items-center text-sm">
            <p className={isListening ? 'text-red-600 font-medium' : 'text-gray-600'}>
              {!isSupported
                ? 'Speech recognition not supported'
                : isListening
                ? 'Listening... Read the highlighted word!'
                : 'Tap to listen'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
