export const ADVENTURE_GENRES = [
  'Fantasy',
  'Mystery',
  'Science Fiction',
  'Comedy',
  'Adventure',
  'Folktales & Mythology',
  'Bedtime',
  'Inspirational',
] as const;
export type AdventureGenre = typeof ADVENTURE_GENRES[number];

export const CHARACTER_TYPES = ['Explorer', 'Detective', 'Inventor', 'Guardian', 'Storyteller', 'Animal friend'] as const;
export type CharacterType = typeof CHARACTER_TYPES[number];

export const AGE_GROUPS = ['Children', 'Teens', 'Family'] as const;
export type AgeGroup = typeof AGE_GROUPS[number];

export const STORY_LENGTHS = ['Short', 'Medium', 'Long'] as const;
export type StoryLength = typeof STORY_LENGTHS[number];

export const ADVENTURE_TONES = ['Wonder & hope', 'Gentle mystery', 'Lighthearted humor', 'Brave and kind'] as const;

export type EffectValue = string | number | boolean;

export interface StoryEffects {
  inventoryAdd?: string[];
  cluesAdd?: string[];
  relationships?: Record<string, number>;
  flags?: Record<string, EffectValue>;
}

export interface StoryChoice {
  id: string;
  label: string;
  consequence: string;
  nextSceneId: string;
  effects?: StoryEffects;
}

export interface StoryEnding {
  title: string;
  epilogue: string;
  badge: string;
}

export interface StoryScene {
  id: string;
  chapter: string;
  title: string;
  setting: string;
  body: string;
  choices: StoryChoice[];
  ending?: StoryEnding;
}

/** Optional fields allow the previously saved version-1 stories to remain readable. */
export interface CustomAdventureMetadata {
  title?: string;
  characterType?: string;
  setting: string;
  tone: string;
  ageRange: string;
  storyLength?: StoryLength;
  narration?: boolean;
}

export interface StoryDefinition {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  ageRange: string;
  duration: string;
  image: string;
  accent: string;
  protagonist: string;
  cast: string[];
  startSceneId: string;
  scenes: Record<string, StoryScene>;
  customAdventure?: CustomAdventureMetadata;
}

export interface StoryDecision {
  sceneId: string;
  sceneTitle: string;
  choiceId: string;
  choiceLabel: string;
  consequence: string;
  decidedAt: string;
}

export interface StorySession {
  id: string;
  storyId: string;
  title: string;
  genre: string;
  protagonist: string;
  createdAt: string;
  updatedAt: string;
  currentSceneId: string;
  decisions: StoryDecision[];
  inventory: string[];
  clues: string[];
  relationships: Record<string, number>;
  flags: Record<string, EffectValue>;
  completedAt?: string;
  endingTitle?: string;
  customAdventure?: CustomAdventureMetadata;
}

export interface StoryPreferences {
  captions: boolean;
  narration: boolean;
  familyVoting: boolean;
  players: string[];
  textSize: 'standard' | 'large' | 'extra-large';
  reducedMotion: boolean;
  contrast: boolean;
  protagonistStyle: 'scout' | 'dreamer' | 'inventor';
  protagonistAccent: 'gold' | 'teal' | 'rose';
}

export interface AppSnapshot {
  version: 1;
  activeSessionId: string | null;
  sessions: StorySession[];
  customStories: StoryDefinition[];
  history: string[];
  preferences: StoryPreferences;
}

export interface CustomAdventureInput {
  genre: AdventureGenre;
  title: string;
  protagonist: string;
  characterType: CharacterType;
  setting: string;
  ageRange: AgeGroup;
  storyLength: StoryLength;
  narration: boolean;
  tone: string;
}
