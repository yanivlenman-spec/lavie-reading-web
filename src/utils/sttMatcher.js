export function stripNikud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function stripPunctuation(text) {
  return text.replace(/[^\p{L}\p{N}]/gu, '');
}

const LATIN_TO_HEBREW = {
  lavie: 'לביא', lavi: 'לביא', lavia: 'לביא',
  ari: 'ארי', arie: 'ארי',
  ben: 'בן',
  yaniv: 'יניב',
  yafat: 'יפעת', yafet: 'יפעת',
};

function normalize(text) {
  const stripped = stripNikud(stripPunctuation(text)).trim().toLowerCase();
  return LATIN_TO_HEBREW[stripped] ?? stripped;
}

const PHONEME_CONFUSIONS = {
  'ח': 'כ', 'כ': 'ח',
  'ש': 'ס', 'ס': 'ש',
  'ת': 'ט', 'ט': 'ת',
};

function isPhonemeConfusion(a, b) {
  return PHONEME_CONFUSIONS[a] === b;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : isPhonemeConfusion(a[i - 1], b[j - 1]) ? 0.5 : 1;
      dp[i][j] =
        cost === 0
          ? dp[i - 1][j - 1]
          : cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function maxEdits(wordLen) {
  if (wordLen <= 2) return 1;
  if (wordLen <= 4) return 1;
  if (wordLen <= 6) return 2;
  return 3;
}

export function isWordMatch(target, recognized) {
  const t = normalize(target);
  const r = normalize(recognized);
  if (!t || !r) return false;
  if (t === r) return true;

  const shorter = Math.min(t.length, r.length);
  if (shorter >= 3 && Math.max(t.length, r.length) >= 4) {
    if (t.startsWith(r) || r.startsWith(t)) return true;
  }

  const threshold = maxEdits(Math.min(t.length, r.length));
  return levenshtein(t, r) <= threshold;
}

function matchPhrase(phrase, words, currentIndex) {
  const tokens = phrase.trim().split(/\s+/).filter((w) => w.length > 0);
  if (tokens.length === 0) return { matched: false, advanceTo: currentIndex };

  let anchorTokenIdx = -1;
  let advanceIdx = currentIndex;

  outer:
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    if (words[advanceIdx] && isWordMatch(token, words[advanceIdx])) {
      anchorTokenIdx = ti;
      advanceIdx++;
      break outer;
    }
    if (normalize(token).length >= 2) {
      for (let skip = 1; skip <= 2; skip++) {
        if (words[advanceIdx + skip] && isWordMatch(token, words[advanceIdx + skip])) {
          anchorTokenIdx = ti;
          advanceIdx += skip + 1;
          break outer;
        }
      }
    }
  }

  if (anchorTokenIdx < 0) return { matched: false, advanceTo: currentIndex };

  for (let ti = anchorTokenIdx + 1; ti < tokens.length; ti++) {
    if (advanceIdx >= words.length) break;
    if (isWordMatch(tokens[ti], words[advanceIdx])) {
      advanceIdx++;
    } else break;
  }

  return { matched: true, advanceTo: advanceIdx };
}

export function matchTranscriptToWord(phrases, words, currentIndex) {
  for (const phrase of phrases) {
    const result = matchPhrase(phrase, words, currentIndex);
    if (result.matched) return result;
  }
  return { matched: false, advanceTo: currentIndex };
}
