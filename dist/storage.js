// Versioned browser storage for Crystal Garden progression & customization
import { COSMETICS } from './cosmetics.js';

export const STORAGE_KEY_V3 = 'crystal_garden_save_v3';
export const STORAGE_KEY_V2 = 'crystal_garden_save_v2';

export const DEFAULT_LOADOUT = {
  body: 'body_default',
  visor: 'visor_default',
  antenna: 'antenna_default',
  backpack: 'backpack_default',
  badge: 'badge_default',
  trail: 'trail_default',
};

const DEFAULT_STATE = {
  version: 3,
  unlockedLevels: [1],
  completedLevels: [],
  bestTimes: {},
  challenges: {}, // { [levelId]: { completed: true, flawless: true, speedrun: true, relic: true } }
  unlockedCosmetics: COSMETICS.filter(c => c.unlockedByDefault).map(c => c.id),
  equippedCosmetics: { ...DEFAULT_LOADOUT },
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

  // Ensure default cosmetics are always present
  const defaultUnlocked = COSMETICS.filter(c => c.unlockedByDefault).map(c => c.id);
  const unlockedCosmetics = Array.isArray(parsed.unlockedCosmetics)
    ? Array.from(new Set([...defaultUnlocked, ...parsed.unlockedCosmetics.filter(id => typeof id === 'string')]))
    : [...defaultUnlocked];

  const equipped = { ...DEFAULT_LOADOUT };
  if (parsed.equippedCosmetics && typeof parsed.equippedCosmetics === 'object') {
    for (const key of Object.keys(DEFAULT_LOADOUT)) {
      if (typeof parsed.equippedCosmetics[key] === 'string' && unlockedCosmetics.includes(parsed.equippedCosmetics[key])) {
        equipped[key] = parsed.equippedCosmetics[key];
      }
    }
  }

  const state = {
    version: 3,
    unlockedLevels: Array.isArray(parsed.unlockedLevels) && parsed.unlockedLevels.length
      ? Array.from(new Set(parsed.unlockedLevels.filter(n => typeof n === 'number'))).sort((a, b) => a - b)
      : [1],
    completedLevels: Array.isArray(parsed.completedLevels)
      ? Array.from(new Set(parsed.completedLevels.filter(n => typeof n === 'number'))).sort((a, b) => a - b)
      : [],
    bestTimes: parsed.bestTimes && typeof parsed.bestTimes === 'object' && !Array.isArray(parsed.bestTimes)
      ? parsed.bestTimes
      : {},
    challenges: parsed.challenges && typeof parsed.challenges === 'object' && !Array.isArray(parsed.challenges)
      ? parsed.challenges
      : {},
    unlockedCosmetics,
    equippedCosmetics: equipped,
    lastSelectedLevel: typeof parsed.lastSelectedLevel === 'number' ? parsed.lastSelectedLevel : 1,
  };

  if (!state.unlockedLevels.includes(1)) {
    state.unlockedLevels.unshift(1);
  }

  return state;
}

/**
 * Migrates v2 or legacy saves to v3 without losing progression
 */
function migrateLegacySave(rawV2) {
  try {
    const v2 = JSON.parse(rawV2);
    const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
    if (Array.isArray(v2.unlockedLevels)) fresh.unlockedLevels = v2.unlockedLevels;
    if (Array.isArray(v2.completedLevels)) fresh.completedLevels = v2.completedLevels;
    if (v2.bestTimes) fresh.bestTimes = v2.bestTimes;
    if (v2.lastSelectedLevel) fresh.lastSelectedLevel = v2.lastSelectedLevel;

    // Migrate completed level unlocks for v2 completions
    fresh.completedLevels.forEach(lvlId => {
      fresh.challenges[lvlId] = {
        completed: true,
        flawless: false,
        speedrun: false,
        relic: false,
      };
      // Award first completion cosmetics for completed worlds
      COSMETICS.filter(c => c.unlockLevel === lvlId && c.unlockType === 'completion').forEach(c => {
        if (!fresh.unlockedCosmetics.includes(c.id)) {
          fresh.unlockedCosmetics.push(c.id);
        }
      });
    });

    return normalizeState(fresh);
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

export function loadProgress() {
  const store = getStore();
  let raw = null;
  if (store) {
    try {
      raw = store.getItem(STORAGE_KEY_V3);
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

  // Check for legacy v2 save to migrate
  if (store) {
    try {
      const legacyRaw = store.getItem(STORAGE_KEY_V2);
      if (legacyRaw) {
        const migrated = migrateLegacySave(legacyRaw);
        saveProgress(migrated);
        return migrated;
      }
    } catch (e) {
      // ignore
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
      store.setItem(STORAGE_KEY_V3, JSON.stringify(state));
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

/**
 * Records completion and challenge outcomes for a level run.
 * Ensures previously earned challenges/records are preserved even on worse replays.
 */
export function recordCompletion(levelId, { time, livesRemaining, relicFound, targetTime = 60 }) {
  const state = loadProgress();

  if (!state.completedLevels.includes(levelId)) {
    state.completedLevels.push(levelId);
    state.completedLevels.sort((a, b) => a - b);
  }

  const currentBest = state.bestTimes[levelId];
  if (currentBest === undefined || time < currentBest) {
    state.bestTimes[levelId] = Math.round(time * 10) / 10;
  }

  // Challenge tracking
  if (!state.challenges[levelId]) {
    state.challenges[levelId] = {
      completed: true,
      flawless: false,
      speedrun: false,
      relic: false,
    };
  }

  const chal = state.challenges[levelId];
  chal.completed = true;
  if (livesRemaining === 3) chal.flawless = true;
  if (time <= targetTime) chal.speedrun = true;
  if (relicFound) chal.relic = true;

  // Unlock next sequential level up to level 8
  if (levelId < 8) {
    const nextId = levelId + 1;
    if (!state.unlockedLevels.includes(nextId)) {
      state.unlockedLevels.push(nextId);
      state.unlockedLevels.sort((a, b) => a - b);
    }
  }

  saveProgress(state);
  return state;
}

export function unlockCosmetic(cosmeticId) {
  const state = loadProgress();
  if (!state.unlockedCosmetics.includes(cosmeticId)) {
    state.unlockedCosmetics.push(cosmeticId);
    saveProgress(state);
  }
  return state;
}

export function equipCosmetic(category, cosmeticId) {
  const state = loadProgress();
  if (state.unlockedCosmetics.includes(cosmeticId)) {
    state.equippedCosmetics[category] = cosmeticId;
    saveProgress(state);
  }
  return state;
}

/**
 * Restores player's appearance back to default without affecting campaign progression
 */
export function resetAppearance() {
  const state = loadProgress();
  state.equippedCosmetics = { ...DEFAULT_LOADOUT };
  saveProgress(state);
  return state;
}

/**
 * Deletes all progression and resets everything back to starting defaults
 */
export function resetAllProgression() {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveProgress(fresh);
  return fresh;
}

export const resetProgress = resetAllProgression;
