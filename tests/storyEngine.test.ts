import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stories } from '../src/data/stories';
import { applyChoice, createSession, findStory, getCurrentScene, getReachableEndings, isFinished } from '../src/engine/storyEngine';
import { activateSession, addCustomStory, createEmptySnapshot, loadSnapshot, saveSnapshot, upsertSession, type StorageLike } from '../src/state/storage';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

test('all built-in scene links resolve, choice counts are meaningful, and three endings are reachable', () => {
  assert.equal(stories.length, 3);
  for (const story of stories) {
    assert.ok(story.scenes[story.startSceneId], `${story.id} start scene exists`);
    for (const scene of Object.values(story.scenes)) {
      if (scene.ending) assert.equal(scene.choices.length, 0);
      else assert.ok(scene.choices.length >= 2 && scene.choices.length <= 4, `${story.id}/${scene.id} has 2–4 choices`);
      for (const choice of scene.choices) assert.ok(story.scenes[choice.nextSceneId], `${choice.id} target exists`);
    }
    assert.ok(getReachableEndings(story).length >= 3, `${story.id} has multiple reachable endings`);
  }
});

test('a selected choice changes scene and tracks decisions, clues, inventory, and relationships', () => {
  const story = stories[0]!;
  let session = createSession(story, 'Ari');
  const first = getCurrentScene(story, session);
  const choice = first.choices[0]!;
  session = applyChoice(story, session, choice.id);
  assert.equal(session.currentSceneId, choice.nextSceneId);
  assert.equal(session.decisions.length, 1);
  assert.equal(session.decisions[0]?.choiceLabel, choice.label);
  for (const item of choice.effects?.inventoryAdd ?? []) assert.ok(session.inventory.includes(item));
  for (const item of choice.effects?.cluesAdd ?? []) assert.ok(session.clues.includes(item));
  for (const name of Object.keys(choice.effects?.relationships ?? {})) assert.ok(name in session.relationships);
});

test('every story can reach and record an ending by following valid choices', () => {
  for (const story of stories) {
    for (const firstChoice of story.scenes[story.startSceneId]!.choices) {
      let session = createSession(story);
      session = applyChoice(story, session, firstChoice.id);
      let safety = 0;
      while (!isFinished(story, session) && safety < 12) {
        const scene = getCurrentScene(story, session);
        assert.ok(scene.choices.length, `${story.id}/${scene.id} is not a dead end`);
        session = applyChoice(story, session, scene.choices[0]!.id);
        safety++;
      }
      assert.ok(isFinished(story, session), `${story.id} reached an ending`);
      assert.ok(session.completedAt);
      assert.ok(session.endingTitle);
    }
  }
});

test('save and resume preserves a session, history, custom story, and preferences', () => {
  const memory = new MemoryStorage();
  const story = stories[1]!;
  const session = createSession(story, 'Nico');
  const customStory = { ...stories[2]!, id: 'custom-test-story' };
  let snapshot = addCustomStory(createEmptySnapshot(), customStory);
  snapshot = upsertSession(snapshot, session);
  saveSnapshot(snapshot, memory);
  const restored = loadSnapshot(memory);
  assert.equal(restored.activeSessionId, session.id);
  assert.equal(restored.sessions[0]?.currentSceneId, story.startSceneId);
  assert.equal(restored.customStories[0]?.id, customStory.id);
  assert.equal(restored.preferences.captions, true);

  const invalid = new MemoryStorage();
  invalid.setItem('storyscreen.snapshot.v1', '{broken json');
  assert.deepEqual(loadSnapshot(invalid).sessions, []);
});

test('resuming an older in-progress session makes it the active Home session', () => {
  const story = stories[0]!;
  const earlier = createSession(story, 'Jun');
  const later = createSession(story, 'Ari');
  let snapshot = upsertSession(createEmptySnapshot(), earlier);
  snapshot = upsertSession(snapshot, later);
  assert.equal(snapshot.activeSessionId, later.id);

  snapshot = activateSession(snapshot, earlier.id);
  assert.equal(snapshot.activeSessionId, earlier.id);
  assert.equal(snapshot.sessions.length, 2);
  assert.equal(activateSession(snapshot, 'missing'), snapshot);
});

test('malformed nested v1 data is repaired without exposing invalid sessions or preferences', () => {
  const memory = new MemoryStorage();
  const validSession = createSession(stories[1]!, 'Nico');
  memory.setItem('storyscreen.snapshot.v1', JSON.stringify({
    version: 1,
    activeSessionId: validSession.id,
    sessions: [validSession, {
      id: 'forged-session', storyId: stories[0]!.id, title: 'Corrupt run', genre: 'Fantasy', protagonist: 'Jun',
      createdAt: 'not-a-date', updatedAt: 'not-a-date', currentSceneId: 'missing-scene', decisions: 'not-an-array',
      inventory: null, clues: [], relationships: { Mira: 'close' }, flags: {},
    }],
    customStories: [{}],
    history: [42, 'missing-session'],
    preferences: { captions: 'yes', narration: false, familyVoting: 'sometimes', players: [42], textSize: 'huge', contrast: null },
  }));

  const repaired = loadSnapshot(memory);
  assert.deepEqual(repaired.sessions.map((session) => session.id), [validSession.id]);
  assert.deepEqual(repaired.customStories, []);
  assert.deepEqual(repaired.history, []);
  assert.equal(repaired.activeSessionId, validSession.id);
  assert.equal(repaired.preferences.captions, true);
  assert.equal(repaired.preferences.familyVoting, false);
  assert.equal(repaired.preferences.textSize, 'standard');
  assert.deepEqual(repaired.preferences.players, ['Player 1', 'Player 2']);
});

test('story lookup returns undefined for a missing id', () => {
  assert.equal(findStory(stories, 'missing'), undefined);
});
