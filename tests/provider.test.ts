import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateSceneWithFallback, validateGeneratedScene, type GeneratedScene } from '../src/engine/provider';

const fallback: GeneratedScene = {
  title: 'A familiar beginning',
  body: 'The lantern waits beside the door.',
  choices: [
    { id: 'open-door', label: 'Open the door', consequence: 'A new path appears.', nextSceneId: 'path' },
    { id: 'stay-close', label: 'Stay beside the lantern', consequence: 'A friend arrives.', nextSceneId: 'friend' },
  ],
};

test('future AI response validation accepts bounded scenes with two to four choices', () => {
  assert.deepEqual(validateGeneratedScene(fallback), fallback);
  assert.equal(validateGeneratedScene({ ...fallback, choices: [fallback.choices[0]] }), null);
  assert.equal(validateGeneratedScene({ ...fallback, choices: [...fallback.choices, ...fallback.choices, fallback.choices[0]] }), null);
  assert.equal(validateGeneratedScene({ ...fallback, body: 'story '.repeat(300) }), null);
  assert.equal(validateGeneratedScene({ ...fallback, choices: [{ ...fallback.choices[0]!, id: 'unsafe/id' }, fallback.choices[1]] }), null);
});

test('disabled, failed, and malformed optional providers all return deterministic fallback', async () => {
  const context = { storyTitle: 'A Tale', protagonist: 'Ari', genre: 'Fantasy', setting: 'A garden', priorChoices: [], priorClues: [] };
  assert.deepEqual(await generateSceneWithFallback(null, context, fallback), { scene: fallback, source: 'deterministic' });
  const thrown = await generateSceneWithFallback(async () => { throw new Error('offline'); }, context, fallback);
  assert.equal(thrown.source, 'deterministic');
  const malformed = await generateSceneWithFallback(async () => ({ title: '', body: 'Not a scene', choices: [] }), context, fallback);
  assert.deepEqual(malformed, { scene: fallback, source: 'deterministic' });
});
