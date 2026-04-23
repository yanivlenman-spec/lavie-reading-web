import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { loadState, saveState } from '../utils/storage';
import { STORIES } from '../data/stories';

const INITIAL_STATE = {
  streakDays: 0,
  totalPoints: 0,
  storiesCompleted: 0,
  storyStars: {},
  storyStats: {},
  unlockedStories: [STORIES[0]?.id || ''],
  badges: [],
  lastOpenedDate: '',
};

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOADED': {
      const fixed = new Set(action.payload.unlockedStories);
      fixed.add(STORIES[0]?.id || '');
      for (let i = 0; i < STORIES.length - 1; i++) {
        const s = STORIES[i];
        if (fixed.has(s.id) && (action.payload.storyStars[s.id] ?? 0) > 0) {
          fixed.add(STORIES[i + 1].id);
        }
      }
      return {
        ...action.payload,
        storyStats: action.payload.storyStats ?? {},
        unlockedStories: Array.from(fixed),
      };
    }

    case 'UPDATE_STREAK': {
      const today = getTodayISO();
      if (state.lastOpenedDate === today) return state;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const streak =
        state.lastOpenedDate === yesterday ? state.streakDays + 1 : 1;
      return { ...state, streakDays: streak, lastOpenedDate: today };
    }

    case 'COMPLETE_STORY': {
      const { storyId, stars, stats } = action;
      const alreadyCompleted = (state.storyStars[storyId] ?? 0) > 0;
      const prevStars = state.storyStars[storyId] ?? 0;
      const newStars = Math.max(prevStars, stars);

      const storyIndex = STORIES.findIndex((s) => s.id === storyId);
      const nextStory = STORIES[storyIndex + 1];
      const unlockedStories = nextStory
        ? [...new Set([...state.unlockedStories, nextStory.id])]
        : state.unlockedStories;

      const badges = [...state.badges];
      if (!alreadyCompleted && storyIndex === 0 && !badges.includes('first_story')) {
        badges.push('first_story');
      }
      if (stars === 3 && !badges.includes('perfect')) {
        badges.push('perfect');
      }
      if (storyIndex === STORIES.length - 1 && !badges.includes('level_champion')) {
        badges.push('level_champion');
      }

      return {
        ...state,
        storyStars: { ...state.storyStars, [storyId]: newStars },
        storyStats: stats ? { ...state.storyStats, [storyId]: stats } : state.storyStats,
        storiesCompleted: alreadyCompleted ? state.storiesCompleted : state.storiesCompleted + 1,
        totalPoints: alreadyCompleted ? state.totalPoints : state.totalPoints + 5,
        unlockedStories,
        badges,
      };
    }

    case 'DEDUCT_POINTS':
      return {
        ...state,
        totalPoints: Math.max(0, state.totalPoints - action.amount),
      };

    case 'RESTORE_SNAPSHOT':
      return action.payload;

    case 'RESET_ALL':
      return { ...INITIAL_STATE, lastOpenedDate: state.lastOpenedDate };

    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [isTestMode, setIsTestMode] = useState(false);
  const snapshotRef = useRef(null);
  const isTestModeRef = useRef(false);

  useEffect(() => {
    loadState(INITIAL_STATE).then((saved) => {
      dispatch({ type: 'LOADED', payload: saved });
      dispatch({ type: 'UPDATE_STREAK' });
    });
  }, []);

  useEffect(() => {
    if (!isTestModeRef.current) saveState(state);
  }, [state]);

  const completeStory = (storyId, stars, stats) => {
    dispatch({ type: 'COMPLETE_STORY', storyId, stars, stats });
  };

  const deductPoints = (amount) => {
    dispatch({ type: 'DEDUCT_POINTS', amount });
  };

  const resetAll = () => {
    dispatch({ type: 'RESET_ALL' });
  };

  const enableTestMode = () => {
    snapshotRef.current = state;
    isTestModeRef.current = true;
    setIsTestMode(true);
  };

  const disableTestMode = () => {
    isTestModeRef.current = false;
    if (snapshotRef.current) {
      dispatch({ type: 'RESTORE_SNAPSHOT', payload: snapshotRef.current });
      snapshotRef.current = null;
    }
    setIsTestMode(false);
  };

  return (
    <AppContext.Provider value={{ state, completeStory, deductPoints, resetAll, isTestMode, enableTestMode, disableTestMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
