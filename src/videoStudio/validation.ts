import { GENRES, findGenre, isGenreId } from './genres';
import { ASPECT_RATIOS, NARRATOR_VOICES, STORY_AUDIENCES, STORY_LANGUAGES, VIDEO_DURATIONS, VISUAL_STYLES, type GeneratedStoryDraft } from './types';

export function validateGenreAnswers(genreId: string, answers: Record<string, string>): string[] {
  const genre = GENRES.find((item) => item.id === genreId);
  if (!genre) return ['Choose a story genre.'];
  return genre.questions.flatMap((question) => {
    const value = answers[question.id]?.trim() ?? '';
    if (!value) return [`Add an answer for “${question.label}”.`];
    if (value.length > question.maxLength) return [`Keep “${question.label}” under ${question.maxLength} characters.`];
    if (value.length < 2) return [`Add a little more detail for “${question.label}”.`];
    return [];
  });
}

function expectedSceneCount(duration: number): number {
  return Math.max(3, Math.min(6, Math.round(duration / 15) + 2));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateGeneratedStory(value: unknown): value is GeneratedStoryDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (!isGenreId(raw.genre) || typeof raw.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(raw.id) || typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 90
    || typeof raw.logline !== 'string' || !raw.logline.trim() || raw.logline.length > 260 || typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt))
    || !Array.isArray(raw.scenes) || raw.scenes.length < 3 || raw.scenes.length > 6) return false;
  if (!STORY_LANGUAGES.includes(raw.language as (typeof STORY_LANGUAGES)[number]) || !STORY_AUDIENCES.includes(raw.targetAudience as (typeof STORY_AUDIENCES)[number])
    || !VIDEO_DURATIONS.includes(raw.durationSeconds as (typeof VIDEO_DURATIONS)[number]) || !VISUAL_STYLES.includes(raw.visualStyle as (typeof VISUAL_STYLES)[number])
    || !NARRATOR_VOICES.includes(raw.narratorVoice as (typeof NARRATOR_VOICES)[number]) || !ASPECT_RATIOS.includes(raw.aspectRatio as (typeof ASPECT_RATIOS)[number])) return false;
  if (raw.provider !== 'manus-ai' && raw.provider !== 'deterministic') return false;
  const sceneCount = expectedSceneCount(raw.durationSeconds as number);
  const maxWords = Math.max(10, Math.min(32, Math.floor((Number(raw.durationSeconds) / sceneCount) * 2.4)));
  if (raw.scenes.length !== sceneCount) return false;
  if (!raw.scenes.every((scene, index) => {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) return false;
    const item = scene as Record<string, unknown>;
    return item.id === `scene-${String(index + 1).padStart(2, '0')}` && typeof item.title === 'string' && item.title.length > 1 && item.title.length <= 64
      && typeof item.narration === 'string' && item.narration.length >= 12 && item.narration.length <= 680 && wordCount(item.narration) <= maxWords && item.visualId === raw.genre;
  })) return false;
  const genre = findGenre(raw.genre);
  return !!genre && raw.scenes.length >= 3;
}
