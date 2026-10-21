import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADVENTURE_GENRES, type CustomAdventureInput } from '../src/domain/types';
import { createCustomAdventure } from '../src/engine/customAdventure';
import { applyChoice, createSession, getCurrentScene, getReachableEndings, isFinished } from '../src/engine/storyEngine';
import { addCustomStory, createEmptySnapshot, loadSnapshot, saveSnapshot, upsertSession, type StorageLike } from '../src/state/storage';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function sampleInput(overrides: Partial<CustomAdventureInput> = {}): CustomAdventureInput {
  return {
    genre: 'Mystery',
    title: 'The Comet Observatory',
    protagonist: 'Mina',
    characterType: 'Detective',
    setting: 'an observatory inside a comet',
    ageRange: 'Teens',
    storyLength: 'Medium',
    narration: false,
    tone: 'Gentle mystery',
    ...overrides,
  };
}

function pathLength(story: ReturnType<typeof createCustomAdventure>): number {
  let session = createSession(story);
  let count = 0;
  while (!isFinished(story, session) && count < 10) {
    const scene = getCurrentScene(story, session);
    session = applyChoice(story, session, scene.choices[0]!.id);
    count++;
  }
  assert.ok(isFinished(story, session));
  return count;
}

test('the create form supports exactly the requested eight genres and custom fields shape the first scene', () => {
  assert.deepEqual(ADVENTURE_GENRES, ['Fantasy', 'Mystery', 'Science Fiction', 'Comedy', 'Adventure', 'Folktales & Mythology', 'Bedtime', 'Inspirational']);
  const story = createCustomAdventure(sampleInput());
  assert.equal(story.title, 'The Comet Observatory');
  assert.equal(story.genre, 'Mystery');
  assert.equal(story.ageRange, 'Teens');
  assert.equal(story.duration, '4–5 minutes');
  assert.equal(story.protagonist, 'Mina');
  assert.equal(story.customAdventure?.characterType, 'Detective');
  assert.equal(story.customAdventure?.narration, false);
  assert.equal(story.scenes.opening?.setting, 'an observatory inside a comet');
  assert.match(story.scenes.opening?.body ?? '', /Mina, a detective/);
  assert.match(story.scenes.opening?.body ?? '', /harder questions/);
});

test('all eight genres produce valid playable scenes with reachable endings', () => {
  for (const genre of ADVENTURE_GENRES) {
    const story = createCustomAdventure(sampleInput({ genre }));
    assert.equal(story.genre, genre);
    assert.ok(story.image, `${genre} has its existing illustration`);
    assert.equal(getReachableEndings(story).length, 3, `${genre} reaches three endings`);
    for (const scene of Object.values(story.scenes)) {
      if (scene.ending) assert.equal(scene.choices.length, 0);
      else assert.ok(scene.choices.length >= 2 && scene.choices.length <= 4, `${genre}/${scene.id} offers 2–4 choices`);
      for (const choice of scene.choices) assert.ok(story.scenes[choice.nextSceneId], `${genre}/${scene.id} has a valid link`);
    }
  }
});

test('Short, Medium, and Long selections change the playable path length', () => {
  assert.equal(pathLength(createCustomAdventure(sampleInput({ storyLength: 'Short' }))), 2);
  assert.equal(pathLength(createCustomAdventure(sampleInput({ storyLength: 'Medium' }))), 3);
  assert.equal(pathLength(createCustomAdventure(sampleInput({ storyLength: 'Long' }))), 4);
  assert.equal(createCustomAdventure(sampleInput({ storyLength: 'Short' })).duration, '2–3 minutes');
  assert.equal(createCustomAdventure(sampleInput({ storyLength: 'Long' })).duration, '6–8 minutes');
});

test('blank optional title is generated and selected details survive local save/resume', () => {
  const memory = new MemoryStorage();
  const story = createCustomAdventure(sampleInput({ title: '', narration: true, storyLength: 'Long' }));
  assert.match(story.title, /^Mina and the Observatory Inside a Comet$/);
  let snapshot = addCustomStory(createEmptySnapshot(), story);
  const session = createSession(story);
  assert.equal(session.customAdventure?.characterType, 'Detective');
  assert.equal(session.customAdventure?.storyLength, 'Long');
  assert.equal(session.customAdventure?.narration, true);
  snapshot = upsertSession(snapshot, session);
  saveSnapshot(snapshot, memory);
  const restored = loadSnapshot(memory);
  assert.equal(restored.customStories[0]?.customAdventure?.storyLength, 'Long');
  assert.equal(restored.sessions[0]?.customAdventure?.narration, true);
  assert.equal(restored.sessions[0]?.protagonist, 'Mina');
});
