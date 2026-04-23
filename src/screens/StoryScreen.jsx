import { useState, useEffect, useRef, useCallback } from 'react';
import storiesData from '../data/stories.json';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useWordHint } from '../hooks/useWordHint';
import { useReadingSession } from '../hooks/useReadingSession';
import { stripNikud } from '../utils/sttMatcher';
import { useApp } from '../context/AppContext';

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
  const { completeStory } = useApp();
  const storyObj = storiesData.stories.find(s => s.id === storyId);
  if (!storyObj) return <div>Story not found</div>;

  const {
    currentWordIndex,
    allWords,
    advance,
    isComplete,
    sessionStats,
    completeSession,
  } = useReadingSession({
    sentences: storyObj.sentences,
    language: 'he',
  });

  const [showLetterBreak, setShowLetterBreak] = useState(false);
  const [lettersReadInWord, setLettersReadInWord] = useState(0);
  const prevTranscriptRef = useRef('');

  const totalWords = allWords.length;

  const { hintLevel, syllables } = useWordHint({
    currentWordIndex,
    currentWord: allWords[currentWordIndex],
    isComplete,
    started: true,
    onAutoAdvance: () => advance(currentWordIndex + 1),
    lang: 'he',
  });

  const isWordMatch = useCallback((target, recognized) => {
    const t = normalizeForMatching(target);
    const r = normalizeForMatching(recognized);
    if (!t || !r) return false;
    if (t === r) return true;
    return Math.abs(t.length - r.length) <= 1;
  }, []);

  const handleTranscript = useCallback((transcripts, isFinal) => {
    if (isComplete) return;

    const primary = (Array.isArray(transcripts) ? transcripts[0] : transcripts) ?? '';
    const prev = prevTranscriptRef.current;
    let delta = primary;
    if (prev && primary.startsWith(prev)) {
      delta = primary.slice(prev.length).trim();
    }

    const phrasesToTry = [
      ...(delta ? [delta] : []),
      ...(Array.isArray(transcripts) ? transcripts.slice(1) : []),
    ];

    if (phrasesToTry.length === 0) return;

    let matched = false;

    for (const phrase of phrasesToTry) {
      const tokens = phrase.trim().split(/\s+/).filter(w => w.length > 0);
      if (tokens.length === 0) continue;

      const lastToken = tokens[tokens.length - 1];

      if (isWordMatch(lastToken, allWords[currentWordIndex])) {
        playBleep();
        advance(currentWordIndex + 1);
        matched = true;
        break;
      } else if (normalizeForMatching(lastToken).length >= 3) {
        for (let skip = 1; skip <= 2; skip++) {
          if (allWords[currentWordIndex + skip] && isWordMatch(lastToken, allWords[currentWordIndex + skip])) {
            playBleep();
            advance(currentWordIndex + skip + 1);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    if (!matched) {
      let maxLettersRead = 0;
      for (const phrase of phrasesToTry) {
        const letters = getLettersReadInWord(allWords[currentWordIndex], phrase);
        maxLettersRead = Math.max(maxLettersRead, letters);
      }
      setLettersReadInWord(maxLettersRead);

      if (isFinal && phrasesToTry.some((p) => p.trim().length > 1)) {
        setShowLetterBreak(true);
      }
    } else {
      setShowLetterBreak(false);
      setLettersReadInWord(0);
    }

    if (isFinal) prevTranscriptRef.current = primary;
  }, [allWords, currentWordIndex, advance, isComplete, isWordMatch]);

  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    lang: 'he-IL',
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    if (isSupported) {
      start();
    }
    return () => {
      stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [isSupported, start, stop]);

  useEffect(() => {
    if (isComplete && sessionStats) {
      completeStory(storyId, sessionStats.starsEarned, {
        timeSeconds: sessionStats.durationSeconds,
        wordsRead: sessionStats.wordsRead,
        wpm: sessionStats.wordsPerMinute,
        accuracy: sessionStats.accuracy,
        completedAt: new Date().toISOString(),
      });
    }
  }, [isComplete, sessionStats, storyId, completeStory]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col text-right" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light text-white p-4 sm:p-6 flex justify-between items-center shadow-md">
        <h1 className="text-lg sm:text-2xl font-bold">{storyObj.title}</h1>
        <button
          onClick={onBack}
          className="text-white hover:opacity-80 transition text-3xl"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-1 bg-yellow-400 transition-all rounded-full"
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
      {hintLevel >= 2 && !showLetterBreak && syllables && (
        <div className="flex justify-center mt-6 px-4">
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl px-6 py-3">
            <p className="text-3xl font-bold text-gray-800 font-mono tracking-wider">{syllables}</p>
          </div>
        </div>
      )}
      {hintLevel >= 3 && (
        <div className="text-center text-base text-red-600 font-bold mt-2">
          🔊 {hintLevel >= 4 ? 'Moving forward...' : 'Listening...'}
        </div>
      )}

      {/* Words Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl sm:max-w-4xl text-center leading-loose">
          <p style={{ fontSize: 'clamp(18px, 5vw, 28px)', lineHeight: '1.8', fontWeight: '600' }}>
            {allWords.map((word, idx) => {
              const isPast = idx < currentWordIndex;
              const isActive = idx === currentWordIndex;

              let bgColor = 'transparent';
              let textColor = '#636e72';
              if (isActive) {
                if (hintLevel >= 3) bgColor = '#ff7675';
                else if (hintLevel >= 1) bgColor = '#ffc107';
                else bgColor = '#ffd93d';
                textColor = '#2d3436';
              } else if (isPast) {
                textColor = '#6bcb77';
              }

              let displayWord = word;
              if (isActive) {
                if (showLetterBreak) {
                  displayWord = formatWithDots(word);
                } else if (lettersReadInWord > 0) {
                  const [read, unread] = splitWordByProgress(word, lettersReadInWord);
                  return (
                    <span key={idx} style={{ backgroundColor: bgColor, color: textColor, opacity: isPast ? 0.4 : 1, padding: '4px 8px', borderRadius: '4px' }}>
                      <span style={{ color: '#0984e3' }}>{read}</span>
                      <span>{unread}</span>
                    </span>
                  );
                }
              }

              return (
                <span key={idx} style={{ backgroundColor: bgColor, color: textColor, opacity: isPast ? 0.4 : 1, padding: '4px 8px', borderRadius: '4px' }}>
                  {displayWord}
                </span>
              );
            }).reduce((prev, curr, idx) => [prev, ' ', curr], [])}
          </p>
        </div>
      </div>

      {/* Completion Screen */}
      {isComplete && sessionStats && (
        <div className="bg-gradient-to-b from-purple-50 to-white p-4 sm:p-8 border-t-4 border-purple-300 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">🎉 סיפור הושלם!</p>
          <div className="text-3xl sm:text-5xl mb-6 tracking-widest">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i}>{i < sessionStats.starsEarned ? '⭐' : '☆'}</span>
            ))}
          </div>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 font-medium">
            {sessionStats.durationSeconds}s • {sessionStats.wordsPerMinute} WPM • {Math.round(sessionStats.accuracy * 100)}%
          </p>
          <button
            onClick={onBack}
            className="bg-primary hover:bg-primary-light text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition text-base sm:text-lg font-bold"
          >
            חזור לסיפורים
          </button>
        </div>
      )}

      {/* Mic Bar */}
      {!isComplete && (
        <div className="bg-white border-t-4 border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-4">
          <button
            onClick={isListening ? stop : start}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white text-2xl sm:text-4xl transition shadow-lg ${
              isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-primary-light'
            }`}
          >
            {isListening ? '🎤' : '🔊'}
          </button>
          <p className={`text-base sm:text-lg font-bold text-center ${isListening ? 'text-red-600' : 'text-gray-700'}`}>
            {!isSupported
              ? 'הקול לא נתמך'
              : isListening
              ? '👂 קראו את המילה בקול!'
              : 'לחצו להאזין'}
          </p>
        </div>
      )}
    </div>
  );
}
