export const STORY_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian'] as const;
export type StoryLanguage = typeof STORY_LANGUAGES[number];

export const STORY_AUDIENCES = ['Children', 'Teens', 'Family'] as const;
export type StoryAudience = typeof STORY_AUDIENCES[number];

export const VIDEO_DURATIONS = [15, 30, 45, 60] as const;
export type VideoDuration = typeof VIDEO_DURATIONS[number];

export const ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];

export const VISUAL_STYLES = ['Painterly Storybook', 'Cinematic Glow', 'Graphic Novel'] as const;
export type VisualStyle = typeof VISUAL_STYLES[number];

export const NARRATOR_VOICES = ['Warm Narrator', 'Bright Storyteller', 'Gentle Bedtime'] as const;
export type NarratorVoice = typeof NARRATOR_VOICES[number];

export type GenreId = 'fantasy' | 'mystery' | 'science-fiction' | 'comedy' | 'adventure' | 'folktales-mythology' | 'bedtime' | 'inspirational';
export type StoryProvider = 'manus-ai' | 'deterministic';

export interface StoryGenerationRequest {
  genre: GenreId;
  title?: string;
  language: StoryLanguage;
  targetAudience: StoryAudience;
  durationSeconds: VideoDuration;
  visualStyle: VisualStyle;
  narratorVoice: NarratorVoice;
  aspectRatio: AspectRatio;
  answers: Record<string, string>;
  useAI: boolean;
}

export interface GeneratedScene {
  id: string;
  title: string;
  narration: string;
  visualId: GenreId;
}

export interface GeneratedStoryDraft extends Omit<StoryGenerationRequest, 'useAI' | 'title'> {
  id: string;
  title: string;
  logline: string;
  scenes: GeneratedScene[];
  provider: StoryProvider;
  createdAt: string;
  note?: string;
}

export type RenderStage = 'queued' | 'validating' | 'artwork' | 'narration' | 'rendering' | 'verifying' | 'complete' | 'error';

export interface RenderProgress {
  jobId: string;
  status: 'queued' | 'running' | 'complete' | 'error';
  stage: RenderStage;
  progress: number;
  message: string;
  error?: string;
  downloadPath?: string;
  audioAvailable?: boolean;
  width?: number;
  height?: number;
  durationSeconds?: number;
  fileName?: string;
}

export interface SavedVideoRecord {
  id: string;
  createdAt: string;
  story: GeneratedStoryDraft;
  blob: Blob;
  audioAvailable: boolean;
  durationSeconds: number;
  width: number;
  height: number;
  fileName: string;
  sizeBytes: number;
}
