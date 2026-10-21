import {
  ADVENTURE_GENRES,
  AGE_GROUPS,
  CHARACTER_TYPES,
  STORY_LENGTHS,
  type AdventureGenre,
  type CustomAdventureInput,
  type CustomAdventureMetadata,
  type StoryDefinition,
  type StoryScene,
} from '../domain/types';

const visualByGenre: Record<AdventureGenre, { image: string; accent: string }> = {
  Fantasy: { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-1.webp', accent: '#f0bc65' },
  Mystery: { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-2.webp', accent: '#8eb9ed' },
  'Science Fiction': { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-3.webp', accent: '#a7d28b' },
  Comedy: { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-1.webp', accent: '#efbb70' },
  Adventure: { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-3.webp', accent: '#a7d28b' },
  'Folktales & Mythology': { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-1.webp', accent: '#d9ad72' },
  Bedtime: { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-1.webp', accent: '#b5bde4' },
  Inspirational: { image: '/manus-storage/async-images/jpfqkMcSDT2IkLG1yedOGo/image-3.webp', accent: '#a7d28b' },
};

const clueByGenre: Record<AdventureGenre, string> = {
  Fantasy: 'a golden spark folded into a tiny lantern',
  Mystery: 'a blue clue slip tucked inside a self-folding map',
  'Science Fiction': 'a star-map projection blinking from a small rover',
  Comedy: 'a map stuck to a teacup that keeps politely tipping over',
  Adventure: 'a trail map with one last path left blank',
  'Folktales & Mythology': 'a bronze story-coin stamped with a tiny moon',
  Bedtime: 'a moonbeam folded into a soft paper star',
  Inspirational: 'a bright note about how one kind act can start a journey',
};

const durationByLength = {
  Short: '2–3 minutes',
  Medium: '4–5 minutes',
  Long: '6–8 minutes',
} as const;

function clean(value: string | undefined, fallback: string, max: number): string {
  return (value ?? '').replace(/[<>]/g, '').trim().slice(0, max) || fallback;
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generatedTitle(protagonist: string, setting: string): string {
  const place = setting
    .replace(/^(?:the|a|an)\s+/i, '')
    .split(/\s+/)
    .slice(0, 6)
    .map((word, index) => {
      const smallWord = index > 0 && /^(?:a|an|the|of|in|on|at|to|and)$/i.test(word);
      return smallWord ? word.toLowerCase() : word ? `${word[0]!.toUpperCase()}${word.slice(1)}` : '';
    })
    .join(' ');
  return `${protagonist} and the ${place || 'Hidden World'}`;
}

function ending(endingId: string, endingTitle: string, epilogue: string, badge: string, setting: string): StoryScene {
  return {
    id: endingId,
    chapter: 'The final page',
    title: endingTitle,
    setting,
    body: epilogue,
    choices: [],
    ending: { title: endingTitle, epilogue, badge },
  };
}

export function createCustomAdventure(input: CustomAdventureInput): StoryDefinition {
  const genre = ADVENTURE_GENRES.includes(input.genre) ? input.genre : 'Fantasy';
  const setting = clean(input.setting, 'a place just beyond the map', 80);
  const protagonist = clean(input.protagonist, 'Alex', 40);
  const characterType = CHARACTER_TYPES.includes(input.characterType) ? input.characterType : 'Explorer';
  const ageRange = AGE_GROUPS.includes(input.ageRange) ? input.ageRange : 'Family';
  const storyLength = STORY_LENGTHS.includes(input.storyLength) ? input.storyLength : 'Medium';
  const tone = clean(input.tone, 'Wonder & hope', 35);
  const title = clean(input.title, generatedTitle(protagonist, setting), 80);
  const article = /^[aeiou]/i.test(characterType) ? 'an' : 'a';
  const visual = visualByGenre[genre];
  const adventureId = `custom-${makeId()}`;
  const branchTarget = storyLength === 'Long' ? 'secret-chamber' : 'final-choice';
  const firstTarget = storyLength === 'Short' ? 'final-choice' : undefined;

  const audienceNote = {
    Children: 'Every surprise stays gentle, and a friendly clue is never far away.',
    Teens: 'Each clue invites closer observation, harder questions, and an earned surprise.',
    Family: 'There is room for younger and older readers to add ideas to the same journey.',
  }[ageRange];
  const toneNote = tone.toLowerCase().includes('humor') || tone.toLowerCase().includes('light')
    ? 'A little unexpected humor brightens the way forward.'
    : tone.toLowerCase().includes('mystery')
      ? 'Every new detail invites one more curious question.'
      : tone.toLowerCase().includes('brave')
        ? 'A brave and kind choice will open the next door.'
        : 'A gentle sense of wonder guides each step.';

  const opening: StoryScene = {
    id: 'opening',
    chapter: 'Chapter one',
    title: 'A door opens',
    setting,
    body: `${protagonist}, ${article} ${characterType.toLowerCase()}, arrives at ${setting} and discovers ${clueByGenre[genre]}. Mira sees a path beginning to glow. ${audienceNote} ${toneNote}`,
    choices: [
      {
        id: 'ask-mira',
        label: 'Ask Mira what the clue remembers',
        consequence: 'Mira trusts you with a tucked-away clue.',
        nextSceneId: firstTarget ?? 'map-room',
        effects: { cluesAdd: ['A map that remembers'], relationships: { Mira: 1 }, flags: { listenedFirst: true } },
      },
      {
        id: 'follow-light',
        label: 'Follow the light along the map',
        consequence: 'Pip discovers a hidden trail beside the clue.',
        nextSceneId: firstTarget ?? 'lantern-trail',
        effects: { inventoryAdd: ['Blue lantern'], relationships: { Pip: 1 }, flags: { braveStep: true } },
      },
    ],
  };

  const branchScenes: Record<string, StoryScene> = {};
  if (storyLength !== 'Short') {
    branchScenes['map-room'] = {
      id: 'map-room',
      chapter: 'Chapter two',
      title: 'A map in motion',
      setting: `${setting} — the map room`,
      body: 'The map redraws itself each time you speak. One path follows a quiet stream; another winds toward an open observatory. Both clues lead to a choice that matters.',
      choices: [
        { id: 'stream', label: 'Take the stream path', consequence: 'A patient search reveals a second clue.', nextSceneId: branchTarget, effects: { cluesAdd: ['A ripple-shaped mark'], flags: { noticedWater: true } } },
        { id: 'observatory', label: 'Visit the open observatory', consequence: 'A glass star shows the way forward.', nextSceneId: branchTarget, effects: { inventoryAdd: ['Glass star'], relationships: { Mira: 1 } } },
      ],
    };
    branchScenes['lantern-trail'] = {
      id: 'lantern-trail',
      chapter: 'Chapter two',
      title: 'A trail of small lights',
      setting: `${setting} — the lantern trail`,
      body: 'Pip spots two paths shimmering through the dusk: one sprinkled with paper stars, one lined with warm window-lights. Both lead toward the heart of the mystery.',
      choices: [
        { id: 'paper-stars', label: 'Follow the paper stars together', consequence: 'Pip remembers the trail and walks beside you.', nextSceneId: branchTarget, effects: { inventoryAdd: ['Paper star'], relationships: { Pip: 1 }, flags: { choseTogether: true } } },
        { id: 'window-lights', label: 'Look for who left the window-lights', consequence: 'You uncover the maker’s gentle message.', nextSceneId: branchTarget, effects: { cluesAdd: ['A maker’s note'], flags: { foundNote: true } } },
      ],
    };
  }
  if (storyLength === 'Long') {
    branchScenes['secret-chamber'] = {
      id: 'secret-chamber',
      chapter: 'Chapter three',
      title: 'The room behind the stars',
      setting: `${setting} — a hidden chamber`,
      body: `${protagonist} finds two final clues in the hidden room: a letter left by someone who needs help, and a seed waiting for a place to grow. The map pauses, ready for your answer.`,
      choices: [
        { id: 'read-letter', label: 'Read the letter together', consequence: 'The message reveals who the journey can help.', nextSceneId: 'final-choice', effects: { cluesAdd: ['A letter from a neighbor'], relationships: { Mira: 1 } } },
        { id: 'plant-seed', label: 'Plant the waiting seed', consequence: 'A new path opens wherever the seed takes root.', nextSceneId: 'final-choice', effects: { inventoryAdd: ['A waiting seed'], flags: { plantedSeed: true } } },
      ],
    };
  }

  const finalChoice: StoryScene = {
    id: 'final-choice',
    chapter: storyLength === 'Long' ? 'Chapter four' : storyLength === 'Medium' ? 'Chapter three' : 'The final choice',
    title: 'Choose what the map becomes',
    setting,
    body: `${protagonist} can see the map’s last blank space. The clues you found and the friends you helped now shape what happens next. What should its final mark mean?`,
    choices: [
      { id: 'share-map', label: 'Share the map so everyone can find their way', consequence: 'You turn discovery into a gift for the whole community.', nextSceneId: 'ending-share', effects: { relationships: { Mira: 1, Pip: 1 }, flags: { endingChoice: 'share' } } },
      { id: 'preserve-secret', label: 'Keep one safe secret for a future journey', consequence: 'A private promise leaves the next adventure open.', nextSceneId: 'ending-secret', effects: { flags: { endingChoice: 'secret' } } },
      { id: 'make-garden', label: 'Plant a garden where the paths meet', consequence: 'The map becomes a home for new ideas.', nextSceneId: 'ending-garden', effects: { inventoryAdd: ['A new seed'], flags: { endingChoice: 'garden' } } },
    ],
  };

  const metadata: CustomAdventureMetadata = {
    title: input.title.trim() ? title : undefined,
    characterType,
    setting,
    tone,
    ageRange,
    storyLength,
    narration: input.narration,
  };

  return {
    id: adventureId,
    title,
    subtitle: `A ${tone.toLowerCase()} ${genre.toLowerCase()} adventure for ${ageRange.toLowerCase()}, shaped by your choices.`,
    genre,
    ageRange,
    duration: durationByLength[storyLength],
    image: visual.image,
    accent: visual.accent,
    protagonist,
    cast: ['Mira, the mapmaker', 'Pip, a curious companion'],
    startSceneId: opening.id,
    scenes: {
      [opening.id]: opening,
      ...branchScenes,
      [finalChoice.id]: finalChoice,
      'ending-share': ending('ending-share', 'The Map We Share', 'Together, you draw a bright path across the map. Neighbors add discoveries of their own, and no one has to find the way alone.', 'A gift for everyone', setting),
      'ending-secret': ending('ending-secret', 'The Folded Promise', 'You tuck one final mark into the map and fold it carefully away. Mira and Pip smile: the next journey will begin whenever you are ready.', 'A promise for tomorrow', setting),
      'ending-garden': ending('ending-garden', 'The Garden of Paths', 'Seeds settle where the paths meet. From them grow small lantern flowers, each holding a story someone has shared with you.', 'A story set in bloom', setting),
    },
    customAdventure: metadata,
  };
}
