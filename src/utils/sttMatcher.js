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
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else if (isPhonemeConfusion(a[i - 1], b[j - 1])) {
        cost = 0.5;
      }

      dp[i][j] = cost === 0
        ? dp[i - 1][j - 1]
        : cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

function maxEdits(wordLen) {
  if (wordLen <= 2) return 0;
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

  const threshold = maxEdits(shorter);
  return levenshtein(t, r) <= threshold;
}

function matchPhrase(phrase, words, currentIndex) {
  const tokens = phrase.trim().split(/\s+/).filter((w) => w.length > 0);
  if (tokens.length === 0) return { matched: false, advanceTo: currentIndex };

  const lastToken = tokens[tokens.length - 1];
  let advanceIdx = currentIndex;

  if (words[advanceIdx] && isWordMatch(lastToken, words[advanceIdx])) {
    advanceIdx++;
  } else if (normalize(lastToken).length >= 3) {
    for (let skip = 1; skip <= 2; skip++) {
      if (words[advanceIdx + skip] && isWordMatch(lastToken, words[advanceIdx + skip])) {
        advanceIdx += skip + 1;
        return { matched: true, advanceTo: advanceIdx };
      }
    }
  }

  if (tokens.length >= 2) {
    const prevToken = tokens[tokens.length - 2];
    if (words[advanceIdx] && isWordMatch(prevToken, words[advanceIdx])) {
      return { matched: true, advanceTo: advanceIdx };
    }
  }

  return { matched: false, advanceTo: currentIndex };
}

export function matchTranscriptToWord(phrases, words, currentIndex) {
  for (const phrase of phrases) {
    const result = matchPhrase(phrase, words, currentIndex);
    if (result.matched) return result;
  }
  return { matched: false, advanceTo: currentIndex };
}
