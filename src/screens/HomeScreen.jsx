import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { STORIES } from '../data/stories';
import PinInput from '../components/PinInput';
import homeBackground from '../assets/home-background.webp';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DIFFICULTY_LABEL = { 1: 'קל ⭐', 2: 'בינוני ⭐⭐', 3: 'מאתגר ⭐⭐⭐' };
const LAUNCH_DATE = new Date('2026-04-22');

function getDaysSinceLaunch() {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - LAUNCH_DATE.getTime()) / msPerDay) + 1;
}

function getCurrentEpisode(storyStars) {
  for (let ep = 1; ; ep++) {
    const epStories = STORIES.filter((s) => s.episode === ep);
    if (epStories.length === 0) return ep - 1;
    const required = epStories.length * 2;
    const earned = epStories.reduce((sum, s) => sum + (storyStars[s.id] ?? 0), 0);
    if (earned < required) return ep;
  }
}

function getStarsNeeded(episodeId, storyStars) {
  const epStories = STORIES.filter((s) => s.episode === episodeId);
  const required = epStories.length * 2;
  const earned = epStories.reduce((sum, s) => sum + (storyStars[s.id] ?? 0), 0);
  return Math.max(0, required - earned);
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')} דק'` : `${s} שנ'`;
}

function getStoryToContinue(currentEpisodeId, storyStars) {
  const epStories = STORIES.filter((s) => s.episode === currentEpisodeId).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  for (let i = 0; i < epStories.length; i++) {
    const stars = storyStars[epStories[i].id] ?? 0;
    if (stars < 3) {
      return { type: 'continue', story: epStories[i], storyNumber: i + 1, stars };
    }
  }

  const allIncomplete = STORIES.filter((s) => (storyStars[s.id] ?? 0) < 3);
  if (allIncomplete.length === 0) return null;

  const suggested = allIncomplete.sort((a, b) => {
    const starsA = storyStars[a.id] ?? 0;
    const starsB = storyStars[b.id] ?? 0;
    if (starsA !== starsB) return starsA - starsB;
    return a.difficulty - b.difficulty;
  })[0];

  return { type: 'suggest', story: suggested, episodeId: suggested.episode };
}

export default function HomeScreen({ onSelectStory }) {
  const { state, deductPoints, resetAll, isTestMode, enableTestMode, disableTestMode } = useApp();
  const [parentMode, setParentMode] = useState('locked');
  const [showTestPin, setShowTestPin] = useState(false);
  const [deductAmount, setDeductAmount] = useState('');

  const totalStars = Object.values(state.storyStars).reduce((sum, s) => sum + s, 0);
  const today = new Date();
  const dayName = DAY_NAMES[today.getDay()];
  const daysSinceLaunch = getDaysSinceLaunch();
  const currentEpisode = getCurrentEpisode(state.storyStars);
  const starsNeeded = getStarsNeeded(currentEpisode, state.storyStars);
  const storyToContinue = getStoryToContinue(currentEpisode, state.storyStars);

  const handleReset = () => {
    if (window.confirm('האם אתה בטוח? כל הנתונים של לביא יאופסו.')) {
      resetAll();
      setParentMode('locked');
      alert('✅ כל הנתונים אופסו בהצלחה.');
    }
  };

  const handleDeduct = () => {
    const amount = parseInt(deductAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('שגיאה: אנא הכנס מספר חיובי');
      return;
    }
    if (amount > state.totalPoints) {
      alert(`שגיאה: אין מספיק זמן מסך (יש ${state.totalPoints} דקות)`);
      return;
    }
    deductPoints(amount);
    setDeductAmount('');
    alert(`✅ נוכו ${amount} דקות. נשאר: ${state.totalPoints - amount} דקות`);
  };

  if (parentMode === 'pin') {
    return <PinInput onSuccess={() => setParentMode('open')} onCancel={() => setParentMode('locked')} />;
  }

  if (showTestPin) {
    return (
      <PinInput
        title="מצב בדיקה 🧪"
        onSuccess={() => { enableTestMode(); setShowTestPin(false); }}
        onCancel={() => setShowTestPin(false)}
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col overflow-hidden" style={{ backgroundImage: `url(${homeBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Background image overlay */}
      <div className="absolute inset-0 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-sm sm:max-w-2xl md:max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-right mb-6">
          <p className="text-white text-sm font-semibold">
            יום {dayName} · יום {daysSinceLaunch}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2">היי, לביא 👋</h1>
          <p className="text-white text-sm mt-3 opacity-90">
            {starsNeeded > 0
              ? `חסרים לך עוד ${starsNeeded} כוכבים להשלמת פרק ${currentEpisode}`
              : `פרק ${currentEpisode} הושלם! 🎉`}
          </p>
        </div>

        {/* Continue reading banner */}
        {storyToContinue && (
          <button
            onClick={() => onSelectStory(storyToContinue.story.id)}
            className="w-full bg-white rounded-2xl p-5 mb-6 shadow-lg hover:shadow-xl transition text-right flex gap-4 items-center transform hover:scale-105"
          >
            <div className="w-16 h-20 sm:w-20 sm:h-24 bg-gradient-to-br from-blue-200 to-blue-100 rounded-lg flex items-center justify-center text-3xl sm:text-5xl flex-shrink-0 shadow">
              📖
            </div>
            <div className="flex-1">
              {storyToContinue.type === 'continue' ? (
                <>
                  <p className="text-xs text-gray-500 font-bold uppercase">המשך קריאה</p>
                  <h3 className="font-bold text-gray-900 mt-2 text-lg">{storyToContinue.story.title}</h3>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${(storyToContinue.stars / 3) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2 font-medium">
                    {Math.round((storyToContinue.stars / 3) * 100)}% · סיפור {storyToContinue.storyNumber}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 font-bold uppercase">קרא עוד מסדרה {storyToContinue.episodeId}</p>
                  <h3 className="font-bold text-gray-900 mt-2 text-lg">{storyToContinue.story.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 font-medium">{DIFFICULTY_LABEL[storyToContinue.story.difficulty]}</p>
                </>
              )}
            </div>
          </button>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-yellow-200 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-lg text-center transform hover:scale-105 transition">
            <div className="text-3xl sm:text-5xl mb-2">📅</div>
            <div className="text-xl sm:text-3xl font-bold text-gray-800 mb-1">{state.streakDays}</div>
            <div className="text-xs sm:text-sm font-bold text-gray-700">רצף ימים</div>
            <div className="mt-1 text-xl">🔥</div>
          </div>
          <div className="bg-blue-200 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-lg text-center transform hover:scale-105 transition">
            <div className="text-3xl sm:text-5xl mb-2">⏱️</div>
            <div className="text-xl sm:text-3xl font-bold text-gray-800 mb-1">{state.totalPoints}</div>
            <div className="text-xs sm:text-sm font-bold text-gray-700">זמן מסך שנצבור</div>
          </div>
          <div className="bg-green-200 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-lg text-center transform hover:scale-105 transition">
            <div className="text-3xl sm:text-5xl mb-2">📖</div>
            <div className="text-xl sm:text-3xl font-bold text-gray-800 mb-1">{state.storiesCompleted}</div>
            <div className="text-xs sm:text-sm font-bold text-gray-700">סיפורים שהושלמו</div>
          </div>
          <div className="bg-pink-200 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-lg text-center transform hover:scale-105 transition">
            <div className="text-3xl sm:text-5xl mb-2">⭐</div>
            <div className="text-xl sm:text-3xl font-bold text-gray-800 mb-1">{totalStars}</div>
            <div className="text-xs sm:text-sm font-bold text-gray-700">כוכבים שנאספו</div>
          </div>
        </div>

        {/* Lock buttons */}
        {parentMode === 'locked' && !isTestMode && (
          <div className="flex justify-center gap-8 mb-6">
            <button
              onClick={() => setParentMode('pin')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition text-sm"
            >
              🔒 מצב הורה
            </button>
            <button
              onClick={() => setShowTestPin(true)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition text-sm"
            >
              🔒 מצב בדיקה
            </button>
          </div>
        )}

        {/* Test mode active button */}
        {isTestMode && (
          <div className="flex justify-center mb-6">
            <button
              onClick={disableTestMode}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 transition text-sm font-medium"
            >
              🔓 כבה מצב בדיקה
            </button>
          </div>
        )}

        {/* Parent mode panel */}
        {parentMode === 'open' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setParentMode('locked')}
                className="text-sm text-gray-600 hover:text-gray-900 transition flex items-center gap-1"
              >
                🔓 נעל מחדש
              </button>
              <h2 className="text-lg font-bold text-gray-900">מצב הורה 👨‍👩‍👧‍👦</h2>
            </div>

            {/* Per-story stats */}
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {STORIES.map((story) => {
                const stats = state.storyStats[story.id];
                const stars = state.storyStars[story.id] ?? 0;
                return (
                  <div key={story.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{DIFFICULTY_LABEL[story.difficulty]}</span>
                      <h3 className="font-semibold text-gray-900 text-sm">{story.title}</h3>
                    </div>
                    {stats ? (
                      <div className="flex justify-between text-xs gap-4">
                        <div className="text-center">
                          <div className="font-bold text-green-600">{fmtTime(stats.timeSeconds)}</div>
                          <div className="text-gray-500">זמן</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-red-600">{stats.wpm}</div>
                          <div className="text-gray-500">מילים/דק'</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-yellow-500">
                            {stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '—'}
                          </div>
                          <div className="text-gray-500">כוכבים</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">טרם נקרא</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Screen time balance */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center mb-6">
              <div className="text-4xl mb-2">⏱️</div>
              <div className="text-5xl font-bold text-gray-900 mb-1">{state.totalPoints}</div>
              <div className="text-sm text-gray-600">דקות זמן מסך שנצברו</div>
            </div>

            {/* Deduct controls */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3">השתמשנו בזמן מסך:</h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[10, 20, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDeductAmount(String(mins))}
                    className="py-2 rounded bg-green-100 hover:bg-green-200 transition text-sm font-medium text-gray-900"
                  >
                    {mins} דק'
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={handleDeduct}
                  className="px-4 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600 transition text-sm"
                >
                  נכה
                </button>
                <input
                  type="number"
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(e.target.value)}
                  placeholder="כמה דקות?"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded font-medium text-right"
                />
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-lg bg-red-50 border-2 border-red-200 text-red-700 font-bold hover:bg-red-100 transition"
            >
              איפוס כל הנתונים 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
