import type { StoryDefinition, StorySession } from '../domain/types';

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `ss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSession(
  story: StoryDefinition,
  protagonist = story.protagonist,
  customAdventure: StorySession['customAdventure'] = story.customAdventure,
): StorySession {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    storyId: story.id,
    title: story.title,
    genre: story.genre,
    protagonist: protagonist.trim().slice(0, 40) || story.protagonist,
    createdAt: now,
    updatedAt: now,
    currentSceneId: story.startSceneId,
    decisions: [],
    inventory: [],
    clues: [],
    relationships: {},
    flags: {},
    customAdventure,
  };
}

export function getCurrentScene(story: StoryDefinition, session: StorySession) {
  const scene = story.scenes[session.currentSceneId];
  if (!scene) throw new Error(`Scene "${session.currentSceneId}" is missing from "${story.id}".`);
  return scene;
}

export function isFinished(story: StoryDefinition, session: StorySession): boolean {
  return Boolean(session.completedAt || getCurrentScene(story, session).ending);
}

export function applyChoice(story: StoryDefinition, session: StorySession, choiceId: string): StorySession {
  if (isFinished(story, session)) throw new Error('This story has already reached its ending.');
  const scene = getCurrentScene(story, session);
  const choice = scene.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new Error(`Choice "${choiceId}" is not available in "${scene.id}".`);
  const nextScene = story.scenes[choice.nextSceneId];
  if (!nextScene) throw new Error(`The choice points to missing scene "${choice.nextSceneId}".`);

  const effects = choice.effects;
  const inventory = [...new Set([...session.inventory, ...(effects?.inventoryAdd ?? [])])];
  const clues = [...new Set([...session.clues, ...(effects?.cluesAdd ?? [])])];
  const relationships = { ...session.relationships };
  for (const [name, delta] of Object.entries(effects?.relationships ?? {})) {
    relationships[name] = Math.max(-5, Math.min(5, (relationships[name] ?? 0) + delta));
  }

  const next: StorySession = {
    ...session,
    updatedAt: new Date().toISOString(),
    currentSceneId: nextScene.id,
    inventory,
    clues,
    relationships,
    flags: { ...session.flags, ...(effects?.flags ?? {}) },
    decisions: [...session.decisions, {
      sceneId: scene.id,
      sceneTitle: scene.title,
      choiceId: choice.id,
      choiceLabel: choice.label,
      consequence: choice.consequence,
      decidedAt: new Date().toISOString(),
    }],
  };
  if (nextScene.ending) {
    next.completedAt = new Date().toISOString();
    next.endingTitle = nextScene.ending.title;
  }
  return next;
}

export function findStory(stories: StoryDefinition[], storyId: string): StoryDefinition | undefined {
  return stories.find((story) => story.id === storyId);
}

export function getReachableEndings(story: StoryDefinition): string[] {
  const reached = new Set<string>();
  const visited = new Set<string>();
  const pending = [story.startSceneId];
  while (pending.length) {
    const sceneId = pending.pop()!;
    if (visited.has(sceneId)) continue;
    visited.add(sceneId);
    const scene = story.scenes[sceneId];
    if (!scene) continue;
    if (scene.ending) reached.add(scene.ending.title);
    else for (const choice of scene.choices) pending.push(choice.nextSceneId);
  }
  return [...reached];
}
