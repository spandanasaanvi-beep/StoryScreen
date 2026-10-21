import type { AppSnapshot, CustomAdventureMetadata, StoryDefinition, StoryEffects, StoryPreferences, StorySession } from '../domain/types';
import { stories } from '../data/stories';

const STORAGE_KEY = 'storyscreen.snapshot.v1';

type UnknownRecord = Record<string, unknown>;

export const defaultPreferences: StoryPreferences = {
  captions: true,
  narration: false,
  familyVoting: false,
  players: ['Player 1', 'Player 2'],
  textSize: 'standard',
  reducedMotion: false,
  contrast: false,
  protagonistStyle: 'scout',
  protagonistAccent: 'gold',
};

export function createEmptySnapshot(): AppSnapshot {
  return {
    version: 1,
    activeSessionId: null,
    sessions: [],
    customStories: [],
    history: [],
    preferences: { ...defaultPreferences, players: [...defaultPreferences.players] },
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumberRecord(value: unknown): value is Record<string, number> {
  const record = asRecord(value);
  return Boolean(record && Object.values(record).every((item) => typeof item === 'number' && Number.isFinite(item)));
}

function isEffectValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
}

function isEffects(value: unknown): value is StoryEffects {
  const effects = asRecord(value);
  if (!effects) return false;
  if (effects.inventoryAdd !== undefined && !isStringArray(effects.inventoryAdd)) return false;
  if (effects.cluesAdd !== undefined && !isStringArray(effects.cluesAdd)) return false;
  if (effects.relationships !== undefined && !isFiniteNumberRecord(effects.relationships)) return false;
  if (effects.flags !== undefined) {
    const flags = asRecord(effects.flags);
    if (!flags || !Object.values(flags).every(isEffectValue)) return false;
  }
  return true;
}

function isCustomAdventureMetadata(value: unknown): value is CustomAdventureMetadata {
  const custom = asRecord(value);
  if (!custom || !['setting', 'tone', 'ageRange'].every((key) => typeof custom[key] === 'string')) return false;
  if (custom.title !== undefined && typeof custom.title !== 'string') return false;
  if (custom.characterType !== undefined && typeof custom.characterType !== 'string') return false;
  if (custom.storyLength !== undefined && !['Short', 'Medium', 'Long'].includes(custom.storyLength as string)) return false;
  if (custom.narration !== undefined && typeof custom.narration !== 'boolean') return false;
  return true;
}

function isStoryDefinition(value: unknown): value is StoryDefinition {
  const story = asRecord(value);
  if (!story) return false;
  const requiredStrings = ['id', 'title', 'subtitle', 'genre', 'ageRange', 'duration', 'image', 'accent', 'protagonist', 'startSceneId'];
  if (!requiredStrings.every((key) => typeof story[key] === 'string')) return false;
  if (!isStringArray(story.cast)) return false;
  if (story.customAdventure !== undefined && !isCustomAdventureMetadata(story.customAdventure)) return false;
  const scenes = asRecord(story.scenes);
  if (!scenes || !Object.keys(scenes).length || typeof story.startSceneId !== 'string' || !Object.hasOwn(scenes, story.startSceneId)) return false;

  for (const [sceneId, rawScene] of Object.entries(scenes)) {
    const scene = asRecord(rawScene);
    if (!scene || scene.id !== sceneId || !['chapter', 'title', 'setting', 'body'].every((key) => typeof scene[key] === 'string') || !Array.isArray(scene.choices)) return false;
    const ending = scene.ending;
    if (ending !== undefined) {
      const endingRecord = asRecord(ending);
      if (!endingRecord || typeof endingRecord.title !== 'string' || typeof endingRecord.epilogue !== 'string' || typeof endingRecord.badge !== 'string' || scene.choices.length !== 0) return false;
    } else if (scene.choices.length < 2 || scene.choices.length > 4) {
      return false;
    }

    for (const rawChoice of scene.choices) {
      const choice = asRecord(rawChoice);
      if (!choice || !['id', 'label', 'consequence', 'nextSceneId'].every((key) => typeof choice[key] === 'string')) return false;
      if (choice.effects !== undefined && !isEffects(choice.effects)) return false;
      if (!Object.hasOwn(scenes, choice.nextSceneId as string)) return false;
    }
  }
  return true;
}

function isSession(value: unknown, storyById: Map<string, StoryDefinition>): value is StorySession {
  const session = asRecord(value);
  if (!session || !['id', 'storyId', 'title', 'genre', 'protagonist', 'createdAt', 'updatedAt', 'currentSceneId'].every((key) => typeof session[key] === 'string')) return false;
  if (!Array.isArray(session.decisions) || !isStringArray(session.inventory) || !isStringArray(session.clues)) return false;
  if (!isFiniteNumberRecord(session.relationships)) return false;
  const flags = asRecord(session.flags);
  if (!flags || !Object.values(flags).every(isEffectValue)) return false;
  if (session.completedAt !== undefined && typeof session.completedAt !== 'string') return false;
  if (session.endingTitle !== undefined && typeof session.endingTitle !== 'string') return false;
  if (session.customAdventure !== undefined && !isCustomAdventureMetadata(session.customAdventure)) return false;

  const story = storyById.get(session.storyId as string);
  if (!story || typeof session.currentSceneId !== 'string') return false;
  const currentScene = story.scenes[session.currentSceneId];
  if (!currentScene || Boolean(session.completedAt) !== Boolean(currentScene.ending)) return false;

  for (const rawDecision of session.decisions) {
    const decision = asRecord(rawDecision);
    if (!decision || !['sceneId', 'sceneTitle', 'choiceId', 'choiceLabel', 'consequence', 'decidedAt'].every((key) => typeof decision[key] === 'string')) return false;
    const priorScene = story.scenes[decision.sceneId as string];
    if (!priorScene || !priorScene.choices.some((choice) => choice.id === decision.choiceId)) return false;
  }

  return true;
}

function normalizePreferences(value: unknown): StoryPreferences {
  const preferences = asRecord(value) ?? {};
  const players = Array.isArray(preferences.players)
    ? preferences.players.filter((player): player is string => typeof player === 'string').map((player) => player.slice(0, 24)).slice(0, 4)
    : [...defaultPreferences.players];
  const safePlayers = players.length ? players : [...defaultPreferences.players];
  const textSize = preferences.textSize === 'large' || preferences.textSize === 'extra-large' ? preferences.textSize : 'standard';
  const protagonistStyle = preferences.protagonistStyle === 'dreamer' || preferences.protagonistStyle === 'inventor' ? preferences.protagonistStyle : 'scout';
  const protagonistAccent = preferences.protagonistAccent === 'teal' || preferences.protagonistAccent === 'rose' ? preferences.protagonistAccent : 'gold';

  return {
    captions: typeof preferences.captions === 'boolean' ? preferences.captions : defaultPreferences.captions,
    narration: typeof preferences.narration === 'boolean' ? preferences.narration : defaultPreferences.narration,
    familyVoting: typeof preferences.familyVoting === 'boolean' ? preferences.familyVoting : defaultPreferences.familyVoting,
    players: safePlayers,
    textSize,
    reducedMotion: typeof preferences.reducedMotion === 'boolean' ? preferences.reducedMotion : defaultPreferences.reducedMotion,
    contrast: typeof preferences.contrast === 'boolean' ? preferences.contrast : defaultPreferences.contrast,
    protagonistStyle,
    protagonistAccent,
  };
}

export function loadSnapshot(storage?: StorageLike): AppSnapshot {
  try {
    const raw = browserStorage(storage)?.getItem(STORAGE_KEY);
    if (!raw) return createEmptySnapshot();
    const parsed: unknown = JSON.parse(raw);
    const root = asRecord(parsed);
    if (!root || root.version !== 1) return createEmptySnapshot();

    const builtinIds = new Set(stories.map((story) => story.id));
    const customById = new Map<string, StoryDefinition>();
    if (Array.isArray(root.customStories)) {
      for (const candidate of root.customStories) {
        if (isStoryDefinition(candidate) && !builtinIds.has(candidate.id)) customById.set(candidate.id, candidate);
      }
    }
    const customStories = [...customById.values()];
    const storyById = new Map([...stories, ...customStories].map((story) => [story.id, story]));
    const sessions = Array.isArray(root.sessions) ? root.sessions.filter((session): session is StorySession => isSession(session, storyById)) : [];
    const sessionIds = new Set(sessions.map((session) => session.id));
    const history = Array.isArray(root.history)
      ? [...new Set(root.history.filter((id): id is string => typeof id === 'string' && sessionIds.has(id))) ]
      : [];
    const activeCandidate = typeof root.activeSessionId === 'string' ? sessions.find((session) => session.id === root.activeSessionId && !session.completedAt) : undefined;

    return {
      version: 1,
      activeSessionId: activeCandidate?.id ?? null,
      sessions,
      customStories,
      history,
      preferences: normalizePreferences(root.preferences),
    };
  } catch {
    return createEmptySnapshot();
  }
}

export function saveSnapshot(snapshot: AppSnapshot, storage?: StorageLike): void {
  try {
    browserStorage(storage)?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Private browsing quotas or blocked storage must not break the current play session.
  }
}

export function upsertSession(snapshot: AppSnapshot, session: StorySession): AppSnapshot {
  const sessions = [...snapshot.sessions.filter((item) => item.id !== session.id), session];
  return {
    ...snapshot,
    activeSessionId: session.completedAt ? (snapshot.activeSessionId === session.id ? null : snapshot.activeSessionId) : session.id,
    sessions,
    history: session.completedAt ? [session.id, ...snapshot.history.filter((id) => id !== session.id)] : snapshot.history,
  };
}

export function activateSession(snapshot: AppSnapshot, sessionId: string): AppSnapshot {
  const session = snapshot.sessions.find((item) => item.id === sessionId);
  if (!session || session.completedAt) return snapshot;
  return { ...snapshot, activeSessionId: session.id };
}

export function addCustomStory(snapshot: AppSnapshot, story: StoryDefinition): AppSnapshot {
  return { ...snapshot, customStories: [story, ...snapshot.customStories.filter((item) => item.id !== story.id)] };
}

export function updatePreferences(snapshot: AppSnapshot, preferences: StoryPreferences): AppSnapshot {
  return { ...snapshot, preferences };
}
