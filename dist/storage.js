// Versioned browser storage for Crystal Garden progression
export const STORAGE_KEY = 'crystal_garden_save_v2';

const DEFAULT_STATE = {
  version: 2,
  unlockedLevels: [1],
  completedLevels: [],
  bestTimes: {},
  lastSelectedLevel: 1,
};

let memoryFallback = null;

function getStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (e) {
    // Storage restricted or unavailable
  }
  return null;
}

function normalizeState(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
  const state = {
    version: 2,
    unlockedLevels: Array.isArray(parsed.unlockedLevels) && parsed.unlockedLevels.length
      ? parsed.unlockedLevels.filter(n => typeof n === 'number')
      : [1],
    completedLevels: Array.isArray(parsed.completedLevels)
      ? parsed.completedLevels.filter(n => typeof n === 'number')
      : [],
    bestTimes: parsed.bestTimes && typeof parsed.bestTimes === 'object' && !Array.isArray(parsed.bestTimes)
      ? parsed.bestTimes
      : {},
    lastSelectedLevel: typeof parsed.lastSelectedLevel === 'number' ? parsed.lastSelectedLevel : 1,
  };
  if (!state.unlockedLevels.includes(1)) {
    state.unlockedLevels.unshift(1);
  }
  return state;
}

export function loadProgress() {
  const store = getStore();
  let raw = null;
  if (store) {
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeState(parsed);
      memoryFallback = normalized;
      return normalized;
    } catch (e) {
      console.warn('Corrupted game save encountered. Reinitializing defaults.', e);
      const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveProgress(fresh);
      return fresh;
    }
  }

  if (memoryFallback) {
    const normalized = normalizeState(memoryFallback);
    memoryFallback = normalized;
    return normalized;
  }

  const initial = JSON.parse(JSON.stringify(DEFAULT_STATE));
  memoryFallback = initial;
  return initial;
}

export function saveProgress(state) {
  memoryFallback = { ...state };
  const store = getStore();
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('Could not write progress to localStorage:', e);
    }
  }
  return false;
}

export function isLevelUnlocked(levelId, state = loadProgress()) {
  if (levelId === 1) return true;
  return state.unlockedLevels.includes(levelId);
}

export function isLevelCompleted(levelId, state = loadProgress()) {
  return state.completedLevels.includes(levelId);
}

export function unlockLevel(levelId) {
  const state = loadProgress();
  if (!state.unlockedLevels.includes(levelId)) {
    state.unlockedLevels.push(levelId);
    state.unlockedLevels.sort((a, b) => a - b);
    saveProgress(state);
  }
  return state;
}

export function recordCompletion(levelId, time) {
  const state = loadProgress();
  if (!state.completedLevels.includes(levelId)) {
    state.completedLevels.push(levelId);
    state.completedLevels.sort((a, b) => a - b);
  }

  const currentBest = state.bestTimes[levelId];
  if (currentBest === undefined || time < currentBest) {
    state.bestTimes[levelId] = Math.round(time * 10) / 10;
  }

  saveProgress(state);
  return state;
}

export function resetProgress() {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveProgress(fresh);
  return fresh;
}
