import { randomUUID } from 'node:crypto';
import { findGenre, isGenreId } from '../src/videoStudio/genres.js';
import {
  ASPECT_RATIOS,
  NARRATOR_VOICES,
  STORY_AUDIENCES,
  STORY_LANGUAGES,
  VIDEO_DURATIONS,
  VISUAL_STYLES,
  type GeneratedScene,
  type GeneratedStoryDraft,
  type StoryGenerationRequest,
  type StoryLanguage,
} from '../src/videoStudio/types.js';

const MAX_SCENE_CHARS = 680;
const MAX_SCENE_WORDS = 92;
const MAX_TITLE_LENGTH = 90;
const MAX_LOG_LINE = 260;
const LANGUAGE_STYLES: Record<StoryLanguage, { titles: string[]; opening: (hero: string, setting: string, hook: string) => string; challenge: (hero: string, obstacle: string, goal: string) => string; turning: (hero: string, clue: string, message: string) => string; ending: (hero: string, goal: string, message: string) => string; logline: (hero: string, goal: string) => string }> = {
  English: {
    titles: ['A Lantern for the Unknown', 'The Quiet Clue', 'A Small Beginning'],
    opening: (hero, setting, hook) => `At ${setting}, ${hero} discovers ${hook}. The first step is small, but the world is ready to change.`,
    challenge: (hero, obstacle, goal) => `${hero} meets ${obstacle}. The goal still matters, and one new detail suggests there may be a kinder way forward: ${goal}.`,
    turning: (hero, clue, message) => `A closer look gives ${hero} a new idea: ${clue}. The pieces begin to fit, and ${message.toLowerCase()}.`,
    ending: (hero, goal, message) => `${hero} takes the final brave step toward ${goal}. The journey leaves a little more light behind: ${message}.`,
    logline: (hero, goal) => `${hero} sets out to ${goal}, discovering that one thoughtful choice can change the whole story.`,
  },
  Spanish: {
    titles: ['Una luz para lo desconocido', 'La pista tranquila', 'Un pequeño comienzo'],
    opening: (hero, setting, hook) => `En ${setting}, ${hero} descubre ${hook}. El primer paso es pequeño, pero el mundo está listo para cambiar.`,
    challenge: (hero, obstacle, goal) => `${hero} encuentra ${obstacle}. La meta sigue siendo importante, y un nuevo detalle sugiere un camino más amable: ${goal}.`,
    turning: (hero, clue, message) => `Al mirar con atención, ${hero} encuentra una idea nueva: ${clue}. Las piezas encajan y ${message.toLowerCase()}.`,
    ending: (hero, goal, message) => `${hero} da el último paso valiente hacia ${goal}. El viaje deja un poco más de luz: ${message}.`,
    logline: (hero, goal) => `${hero} se dispone a ${goal}, y descubre que una decisión cuidadosa puede cambiar toda la historia.`,
  },
  French: {
    titles: ['Une lumière vers l’inconnu', 'L’indice discret', 'Un petit commencement'],
    opening: (hero, setting, hook) => `À ${setting}, ${hero} découvre ${hook}. Le premier pas est petit, mais le monde est prêt à changer.`,
    challenge: (hero, obstacle, goal) => `${hero} rencontre ${obstacle}. Le but compte toujours, et un détail suggère un chemin plus doux : ${goal}.`,
    turning: (hero, clue, message) => `En observant mieux, ${hero} trouve une idée nouvelle : ${clue}. Les pièces s’assemblent et ${message.toLowerCase()}.`,
    ending: (hero, goal, message) => `${hero} fait le dernier pas courageux vers ${goal}. Le voyage laisse un peu plus de lumière : ${message}.`,
    logline: (hero, goal) => `${hero} se met en route pour ${goal} et découvre qu’un choix réfléchi peut changer toute l’histoire.`,
  },
  German: {
    titles: ['Ein Licht ins Unbekannte', 'Die leise Spur', 'Ein kleiner Anfang'],
    opening: (hero, setting, hook) => `In ${setting} entdeckt ${hero} ${hook}. Der erste Schritt ist klein, doch die Welt ist bereit, sich zu verändern.`,
    challenge: (hero, obstacle, goal) => `${hero} begegnet ${obstacle}. Das Ziel bleibt wichtig, und ein neues Detail weist auf einen freundlicheren Weg: ${goal}.`,
    turning: (hero, clue, message) => `Beim genaueren Hinsehen findet ${hero} eine neue Idee: ${clue}. Die Teile fügen sich zusammen, und ${message.toLowerCase()}.`,
    ending: (hero, goal, message) => `${hero} wagt den letzten Schritt zu ${goal}. Die Reise lässt ein wenig mehr Licht zurück: ${message}.`,
    logline: (hero, goal) => `${hero} macht sich auf, um ${goal} zu erreichen, und entdeckt, dass eine überlegte Wahl die ganze Geschichte verändern kann.`,
  },
  Italian: {
    titles: ['Una luce verso l’ignoto', 'L’indizio gentile', 'Un piccolo inizio'],
    opening: (hero, setting, hook) => `A ${setting}, ${hero} scopre ${hook}. Il primo passo è piccolo, ma il mondo è pronto a cambiare.`,
    challenge: (hero, obstacle, goal) => `${hero} incontra ${obstacle}. L’obiettivo è ancora importante e un nuovo dettaglio suggerisce una strada più gentile: ${goal}.`,
    turning: (hero, clue, message) => `Osservando meglio, ${hero} trova una nuova idea: ${clue}. I pezzi iniziano a combaciare e ${message.toLowerCase()}.`,
    ending: (hero, goal, message) => `${hero} compie l’ultimo passo coraggioso verso ${goal}. Il viaggio lascia un po’ più di luce: ${message}.`,
    logline: (hero, goal) => `${hero} parte per ${goal} e scopre che una scelta attenta può cambiare tutta la storia.`,
  },
};

function oneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function cleanText(value: string, maxLength: number): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function validateGenerationRequest(value: unknown): StoryGenerationRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Story details are missing.');
  const raw = value as Record<string, unknown>;
  if (!isGenreId(raw.genre)) throw new Error('Choose one of the available story genres.');
  if (!oneOf(raw.language, STORY_LANGUAGES) || !oneOf(raw.targetAudience, STORY_AUDIENCES)
    || !oneOf(raw.visualStyle, VISUAL_STYLES) || !oneOf(raw.narratorVoice, NARRATOR_VOICES)
    || !oneOf(raw.aspectRatio, ASPECT_RATIOS) || !VIDEO_DURATIONS.includes(raw.durationSeconds as (typeof VIDEO_DURATIONS)[number])) {
    throw new Error('Choose a valid language, audience, duration, style, narrator, and video format.');
  }
  if (typeof raw.answers !== 'object' || raw.answers === null || Array.isArray(raw.answers)) throw new Error('Complete the questions for this genre.');
  const genre = findGenre(raw.genre);
  if (!genre) throw new Error('This genre is not available.');
  const answersRaw = raw.answers as Record<string, unknown>;
  const allowed = new Set(genre.questions.map((question) => question.id));
  if (Object.keys(answersRaw).some((key) => !allowed.has(key))) throw new Error('Some answers do not match the selected genre.');
  const answers: Record<string, string> = {};
  for (const question of genre.questions) {
    const answer = answersRaw[question.id];
    if (typeof answer !== 'string') throw new Error(`Add an answer for “${question.label}”.`);
    const normalized = cleanText(answer, question.maxLength);
    if (normalized.length < 2) throw new Error(`Add an answer for “${question.label}”.`);
    answers[question.id] = normalized;
  }
  const title = typeof raw.title === 'string' ? cleanText(raw.title, MAX_TITLE_LENGTH) : '';
  return {
    genre: raw.genre,
    ...(title ? { title } : {}),
    language: raw.language,
    targetAudience: raw.targetAudience,
    durationSeconds: raw.durationSeconds as StoryGenerationRequest['durationSeconds'],
    visualStyle: raw.visualStyle,
    narratorVoice: raw.narratorVoice,
    aspectRatio: raw.aspectRatio,
    answers,
    useAI: raw.useAI === true,
  };
}

function answer(request: StoryGenerationRequest, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = request.answers[key];
    if (value) return value;
  }
  return undefined;
}

function expectedSceneCount(duration: number): number {
  return Math.max(3, Math.min(6, Math.round(duration / 15) + 2));
}

function maxWordsPerScene(duration: number, sceneCount = expectedSceneCount(duration)): number {
  return Math.max(10, Math.min(32, Math.floor((duration / sceneCount) * 2.4)));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function limitWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text;
  return `${words.slice(0, limit).join(' ').replace(/[,:;—-]+$/, '')}…`;
}

export function createDeterministicStory(request: StoryGenerationRequest, note?: string): GeneratedStoryDraft {
  const genre = findGenre(request.genre);
  if (!genre) throw new Error('The requested genre is not supported.');
  const language = LANGUAGE_STYLES[request.language];
  const protagonist = answer(request, 'hero', 'detective', 'protagonist', 'characters', 'mainCharacter') ?? 'the main character';
  const setting = answer(request, 'magicalWorld', 'setting', 'planet', 'destination', 'tradition', 'dreamWorld') ?? 'a new and curious place';
  const hook = answer(request, 'mysteryType', 'quest', 'mission', 'situation', 'goal', 'moral', 'lesson', 'message') ?? 'a new path';
  const obstacle = answer(request, 'obstacles', 'clues', 'creatures', 'technology', 'challenge', 'situation') ?? 'one unexpected challenge';
  const clue = answer(request, 'clues', 'magicalPowers', 'technology', 'tradition', 'mood') ?? 'a detail they nearly missed';
  const message = answer(request, 'message', 'moral', 'lesson', 'desiredReveal') ?? 'one thoughtful choice makes a difference';
  const endingText = request.targetAudience === 'Children'
    ? 'Every discovery stays gentle, and there is always someone kind nearby.'
    : request.targetAudience === 'Teens'
      ? 'A patient question helps turn uncertainty into a choice of their own.'
      : 'The best part of the journey is what everyone discovers together.';
  const snippets = [
    language.opening(protagonist, setting, hook),
    language.challenge(protagonist, obstacle, hook),
    language.turning(protagonist, clue, message),
    language.ending(protagonist, hook, `${endingText} ${message}`),
    `In the final quiet, ${endingText}`,
    `The story leaves a small light waiting for the next chapter.`,
  ];
  const count = expectedSceneCount(request.durationSeconds);
  const wordLimit = maxWordsPerScene(request.durationSeconds, count);
  const scenes: GeneratedScene[] = snippets.slice(0, count).map((narration, index) => ({
    id: `scene-${String(index + 1).padStart(2, '0')}`,
    title: language.titles[index % language.titles.length],
    narration: limitWords(cleanText(narration, MAX_SCENE_CHARS), wordLimit),
    visualId: request.genre,
  }));
  const title = request.title || `${language.titles[0]}: ${genre.name}`;
  const logline = cleanText(language.logline(protagonist, hook), MAX_LOG_LINE);
  return {
    id: randomUUID(),
    title: cleanText(title, MAX_TITLE_LENGTH) || `${genre.name} Story`,
    logline,
    genre: request.genre,
    language: request.language,
    targetAudience: request.targetAudience,
    durationSeconds: request.durationSeconds,
    visualStyle: request.visualStyle,
    narratorVoice: request.narratorVoice,
    aspectRatio: request.aspectRatio,
    answers: request.answers,
    scenes,
    provider: 'deterministic',
    createdAt: new Date().toISOString(),
    ...(note ? { note } : {}),
  };
}

function parseJsonContent(content: unknown): Record<string, unknown> | null {
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((part) => (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string' ? (part as Record<string, string>).text : '')).join('\n')
      : '';
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(unfenced.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function validateModelStory(value: unknown, request: StoryGenerationRequest): Pick<GeneratedStoryDraft, 'title' | 'logline' | 'scenes'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== 'string' || typeof raw.logline !== 'string' || !Array.isArray(raw.scenes)) return null;
  const title = cleanText(raw.title, MAX_TITLE_LENGTH);
  const logline = cleanText(raw.logline, MAX_LOG_LINE);
  const expectedCount = expectedSceneCount(request.durationSeconds);
  const wordLimit = maxWordsPerScene(request.durationSeconds, expectedCount);
  if (title.length < 2 || logline.length < 8 || raw.scenes.length !== expectedCount) return null;
  const scenes: GeneratedScene[] = [];
  for (const [index, candidate] of raw.scenes.entries()) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    if (typeof item.title !== 'string' || typeof item.narration !== 'string') return null;
    const sceneTitle = cleanText(item.title, 64);
    const narration = cleanText(item.narration, MAX_SCENE_CHARS);
    if (sceneTitle.length < 2 || narration.length < 12 || wordCount(narration) > wordLimit || wordCount(narration) > MAX_SCENE_WORDS) return null;
    scenes.push({ id: `scene-${String(index + 1).padStart(2, '0')}`, title: sceneTitle, narration, visualId: request.genre });
  }
  return { title, logline, scenes };
}

export interface StoryGeneratorOptions {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

async function requestModelStory(request: StoryGenerationRequest, options: StoryGeneratorOptions): Promise<Pick<GeneratedStoryDraft, 'title' | 'logline' | 'scenes'> | null> {
  const apiUrl = options.apiUrl ?? process.env.MANUS_API_URL;
  const apiKey = options.apiKey ?? process.env.MANUS_API_KEY;
  if (!apiUrl || !apiKey) return null;
  const genre = findGenre(request.genre);
  if (!genre) return null;
  const sceneCount = expectedSceneCount(request.durationSeconds);
  const wordLimit = maxWordsPerScene(request.durationSeconds, sceneCount);
  const system = `You are a family-friendly storyteller. Return exactly one JSON object with keys title (string), logline (string), and scenes (array). Produce exactly ${sceneCount} scenes. Each scene has only title (string) and narration (string). Keep each narration at most ${wordLimit} words and under ${MAX_SCENE_CHARS} characters so spoken narration fits a ${request.durationSeconds}-second video. Match the requested language and audience. Be coherent, warm, age-appropriate, and concrete. Do not return Markdown, URLs, HTML, unsafe content, or external image paths.`;
  const user = JSON.stringify({ selectedGenre: genre.name, selectedTitle: request.title ?? null, language: request.language, targetAudience: request.targetAudience, visualStyle: request.visualStyle, details: request.answers });
  const body: Record<string, unknown> = { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.7 };
  const model = options.model ?? process.env.STORY_AI_MODEL;
  if (model) body.model = model;
  const response = await (options.fetcher ?? fetch)(`${apiUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 18000),
  });
  const envelope: unknown = await response.json().catch(() => null);
  if (!response.ok || !envelope || typeof envelope !== 'object') return null;
  const record = envelope as Record<string, unknown>;
  if (record.error) return null;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const first = choices[0];
  if (!first || typeof first !== 'object') return null;
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as Record<string, unknown>).content;
  const parsed = parseJsonContent(content);
  return parsed ? validateModelStory(parsed, request) : null;
}

export async function generateStoryDraft(value: unknown, options: StoryGeneratorOptions = {}): Promise<GeneratedStoryDraft> {
  const request = validateGenerationRequest(value);
  if (!request.useAI) return createDeterministicStory(request, 'Created with the built-in story engine.');
  try {
    const modelStory = await requestModelStory(request, options);
    if (modelStory) {
      return {
        ...request,
        id: randomUUID(),
        title: modelStory.title,
        logline: modelStory.logline,
        scenes: modelStory.scenes,
        provider: 'manus-ai',
        createdAt: new Date().toISOString(),
      };
    }
  } catch {
    // Network failures and timeouts intentionally take the same safe offline path.
  }
  return createDeterministicStory(request, 'AI drafting was unavailable, so this story was created locally.');
}

export function isValidGeneratedStory(value: unknown): value is GeneratedStoryDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id.length < 1 || raw.id.length > 100 || typeof raw.title !== 'string' || cleanText(raw.title, MAX_TITLE_LENGTH).length < 2
    || typeof raw.logline !== 'string' || cleanText(raw.logline, MAX_LOG_LINE).length < 8 || !Array.isArray(raw.scenes)
    || (raw.provider !== 'manus-ai' && raw.provider !== 'deterministic') || typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt))) return false;
  if (raw.note !== undefined && (typeof raw.note !== 'string' || raw.note.length > 200)) return false;
  let request: StoryGenerationRequest;
  try { request = validateGenerationRequest(raw); } catch { return false; }
  const expectedCount = expectedSceneCount(request.durationSeconds);
  const wordLimit = maxWordsPerScene(request.durationSeconds, expectedCount);
  if (!isGenreId(raw.genre) || raw.scenes.length !== expectedCount) return false;
  return raw.scenes.every((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const scene = item as Record<string, unknown>;
    return scene.id === `scene-${String(index + 1).padStart(2, '0')}`
      && typeof scene.title === 'string' && cleanText(scene.title, 64).length >= 2
      && typeof scene.narration === 'string' && scene.narration.length <= MAX_SCENE_CHARS && cleanText(scene.narration, MAX_SCENE_CHARS).length >= 12
      && wordCount(scene.narration) <= wordLimit && scene.visualId === raw.genre;
  });
}
