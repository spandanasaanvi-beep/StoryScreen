import type { GenreId } from './types';

export interface GenreQuestion {
  id: string;
  label: string;
  placeholder: string;
  hint?: string;
  maxLength: number;
}

export interface GenreDefinition {
  id: GenreId;
  name: string;
  shortLabel: string;
  descriptor: string;
  accent: string;
  artUrl: string;
  artObjectKey: string;
  questions: GenreQuestion[];
}

const oldArtKey = 'async-images/jpfqkMcSDT2IkLG1yedOGo';
const newArtKey = 'async-images/Y5nbqfxGdTGl6pXQ56bXoQ';

export const GENRES: GenreDefinition[] = [
  {
    id: 'fantasy', name: 'Fantasy', shortLabel: 'FANTASY', descriptor: 'Magic, myth, and impossible doors.', accent: '#D99C59',
    artUrl: `/manus-storage/${oldArtKey}/image-1.webp`, artObjectKey: `${oldArtKey}/image-1.webp`,
    questions: [
      { id: 'magicalWorld', label: 'Magical world', placeholder: 'A floating library among storm clouds', maxLength: 140 },
      { id: 'hero', label: 'Hero', placeholder: 'A curious mapmaker named Sol', maxLength: 90 },
      { id: 'magicalPowers', label: 'Magical powers', placeholder: 'Can hear the memories of old objects', maxLength: 140 },
      { id: 'creatures', label: 'Creatures', placeholder: 'Moon-foxes, tiny cloud dragons…', maxLength: 140 },
      { id: 'quest', label: 'Quest', placeholder: 'Find the lost bell before sunrise', maxLength: 160 },
    ],
  },
  {
    id: 'mystery', name: 'Mystery', shortLabel: 'MYSTERY', descriptor: 'Follow the clues. Find the quiet truth.', accent: '#7D99C9',
    artUrl: `/manus-storage/${oldArtKey}/image-2.webp`, artObjectKey: `${oldArtKey}/image-2.webp`,
    questions: [
      { id: 'mysteryType', label: 'Mystery type', placeholder: 'A missing moonstone, a puzzling message…', maxLength: 120 },
      { id: 'detective', label: 'Detective', placeholder: 'A careful young detective named Bea', maxLength: 100 },
      { id: 'setting', label: 'Setting', placeholder: 'A sleepy town beside the observatory', maxLength: 140 },
      { id: 'clues', label: 'Clues', placeholder: 'Silver dust, a stopped clock, three pawprints', maxLength: 160 },
      { id: 'desiredReveal', label: 'Desired reveal', placeholder: 'A kind-hearted explanation no one expected', maxLength: 160 },
    ],
  },
  {
    id: 'science-fiction', name: 'Science Fiction', shortLabel: 'SCI-FI', descriptor: 'New worlds. Human-sized wonders.', accent: '#6DAEA6',
    artUrl: `/manus-storage/${oldArtKey}/image-3.webp`, artObjectKey: `${oldArtKey}/image-3.webp`,
    questions: [
      { id: 'planet', label: 'Planet', placeholder: 'A red planet with gardens under glass', maxLength: 140 },
      { id: 'technology', label: 'Futuristic technology', placeholder: 'A seed-shaped rover that can translate starlight', maxLength: 160 },
      { id: 'protagonist', label: 'Protagonist', placeholder: 'A young botanist named Nia', maxLength: 100 },
      { id: 'mission', label: 'Mission', placeholder: 'Bring the first greenhouse back to life', maxLength: 160 },
    ],
  },
  {
    id: 'comedy', name: 'Comedy', shortLabel: 'COMEDY', descriptor: 'A little chaos, a lot of heart.', accent: '#DDA66C',
    artUrl: `/manus-storage/${newArtKey}/image-1.webp`, artObjectKey: `${newArtKey}/image-1.webp`,
    questions: [
      { id: 'characters', label: 'Characters', placeholder: 'A nervous baker and one very confident owl', maxLength: 160 },
      { id: 'situation', label: 'Situation', placeholder: 'The town’s cakes have started floating away', maxLength: 160 },
      { id: 'humorStyle', label: 'Humor style', placeholder: 'Warm wordplay and gentle slapstick', maxLength: 120 },
      { id: 'setting', label: 'Setting', placeholder: 'A moonlit bakery on festival night', maxLength: 140 },
    ],
  },
  {
    id: 'adventure', name: 'Adventure', shortLabel: 'ADVENTURE', descriptor: 'A far horizon and the courage to go.', accent: '#BF8D56',
    artUrl: `/manus-storage/${newArtKey}/image-2.webp`, artObjectKey: `${newArtKey}/image-2.webp`,
    questions: [
      { id: 'protagonist', label: 'Protagonist', placeholder: 'An explorer and a fox companion', maxLength: 130 },
      { id: 'destination', label: 'Destination', placeholder: 'A hidden valley beyond the cloud bridge', maxLength: 150 },
      { id: 'obstacles', label: 'Obstacles', placeholder: 'A broken bridge and a map that changes', maxLength: 160 },
      { id: 'goal', label: 'Goal', placeholder: 'Carry a lantern seed to the far valley', maxLength: 150 },
    ],
  },
  {
    id: 'folktales-mythology', name: 'Folktales & Mythology', shortLabel: 'FOLKTALES', descriptor: 'Ancient wonder, retold in a new light.', accent: '#B89364',
    artUrl: `/manus-storage/${newArtKey}/image-3.webp`, artObjectKey: `${newArtKey}/image-3.webp`,
    questions: [
      { id: 'tradition', label: 'Tradition or mythology', placeholder: 'A fictional island tradition of sky storytellers', maxLength: 150 },
      { id: 'characters', label: 'Characters', placeholder: 'A phoenix, a patient weaver, a young traveler', maxLength: 160 },
      { id: 'moral', label: 'Moral', placeholder: 'Wisdom grows when it is shared', maxLength: 120 },
      { id: 'setting', label: 'Setting', placeholder: 'A moonlit temple beside a silver waterfall', maxLength: 140 },
    ],
  },
  {
    id: 'bedtime', name: 'Bedtime Stories', shortLabel: 'BEDTIME', descriptor: 'Soft skies. Safe landings. Sweet dreams.', accent: '#9296C5',
    artUrl: `/manus-storage/${newArtKey}/image-4.webp`, artObjectKey: `${newArtKey}/image-4.webp`,
    questions: [
      { id: 'mainCharacter', label: 'Main character', placeholder: 'A sleepy badger called Pip', maxLength: 100 },
      { id: 'dreamWorld', label: 'Dream world', placeholder: 'A cloud-boat sailing above a sea of stars', maxLength: 150 },
      { id: 'mood', label: 'Mood', placeholder: 'Calm, cozy, gently curious', maxLength: 100 },
      { id: 'lesson', label: 'Lesson', placeholder: 'It’s all right to ask a friend for help', maxLength: 120 },
    ],
  },
  {
    id: 'inspirational', name: 'Inspirational Stories', shortLabel: 'INSPIRATIONAL', descriptor: 'Small steps. A reason to keep going.', accent: '#DBA96E',
    artUrl: `/manus-storage/${newArtKey}/image-5.webp`, artObjectKey: `${newArtKey}/image-5.webp`,
    questions: [
      { id: 'mainCharacter', label: 'Main character', placeholder: 'A determined gardener named Amari', maxLength: 110 },
      { id: 'challenge', label: 'Challenge', placeholder: 'A long dry season has changed the neighborhood', maxLength: 150 },
      { id: 'goal', label: 'Goal', placeholder: 'Bring a shared garden back to life', maxLength: 140 },
      { id: 'message', label: 'Message', placeholder: 'One small beginning can invite others to help', maxLength: 140 },
    ],
  },
];

export function findGenre(id: GenreId): GenreDefinition | undefined {
  return GENRES.find((genre) => genre.id === id);
}

export function isGenreId(value: unknown): value is GenreId {
  return typeof value === 'string' && GENRES.some((genre) => genre.id === value);
}
