export interface SceneContext {
  storyTitle: string;
  protagonist: string;
  genre: string;
  setting: string;
  priorChoices: string[];
  priorClues: string[];
}

export interface GeneratedChoice {
  id: string;
  label: string;
  consequence: string;
  nextSceneId: string;
}

export interface GeneratedScene {
  title: string;
  body: string;
  choices: GeneratedChoice[];
}

/** Future adapters must call a server-side provider; browser code must never hold credentials. */
export type SceneProvider = (context: SceneContext) => Promise<unknown>;

export const MAX_SCENE_WORDS = 280;

export function validateGeneratedScene(value: unknown): GeneratedScene | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== 'string' || candidate.title.trim().length === 0 || candidate.title.length > 120) return null;
  if (typeof candidate.body !== 'string' || candidate.body.trim().length === 0 || candidate.body.length > 2200) return null;
  if (candidate.body.trim().split(/\s+/).length > MAX_SCENE_WORDS) return null;
  if (!Array.isArray(candidate.choices) || candidate.choices.length < 2 || candidate.choices.length > 4) return null;
  const choices: GeneratedChoice[] = [];
  for (const raw of candidate.choices) {
    if (!raw || typeof raw !== 'object') return null;
    const choice = raw as Record<string, unknown>;
    if (typeof choice.id !== 'string' || !/^[a-z0-9-]{1,40}$/i.test(choice.id)) return null;
    if (typeof choice.label !== 'string' || choice.label.trim().length === 0 || choice.label.length > 140) return null;
    if (typeof choice.consequence !== 'string' || choice.consequence.length > 220) return null;
    if (typeof choice.nextSceneId !== 'string' || !/^[a-z0-9-]{1,60}$/i.test(choice.nextSceneId)) return null;
    choices.push({ id: choice.id, label: choice.label.trim(), consequence: choice.consequence.trim(), nextSceneId: choice.nextSceneId });
  }
  if (new Set(choices.map((choice) => choice.id)).size !== choices.length) return null;
  return { title: candidate.title.trim(), body: candidate.body.trim(), choices };
}

export async function generateSceneWithFallback(
  provider: SceneProvider | null,
  context: SceneContext,
  deterministicFallback: GeneratedScene,
): Promise<{ scene: GeneratedScene; source: 'ai' | 'deterministic' }> {
  if (!provider) return { scene: deterministicFallback, source: 'deterministic' };
  try {
    const generated = validateGeneratedScene(await provider(context));
    if (generated) return { scene: generated, source: 'ai' };
  } catch {
    // Provider timeout, network errors, and malformed responses all fall through safely.
  }
  return { scene: deterministicFallback, source: 'deterministic' };
}
