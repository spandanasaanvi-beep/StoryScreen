import { Buffer } from 'node:buffer';
import { findGenre } from '../src/videoStudio/genres.js';
import type { GenreId } from '../src/videoStudio/types.js';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const cache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 8;

function fallbackSvg(genre: GenreId): Buffer {
  const palette: Record<GenreId, [string, string, string]> = {
    fantasy: ['#0b1723', '#684a31', '#e8bc70'],
    mystery: ['#0a1423', '#243b5a', '#a8b8d9'],
    'science-fiction': ['#07191c', '#235853', '#9ad4c2'],
    comedy: ['#201426', '#60402c', '#f2c984'],
    adventure: ['#101a28', '#514638', '#e3b46d'],
    'folktales-mythology': ['#151528', '#5b3d4d', '#d6b37c'],
    bedtime: ['#11152a', '#30395c', '#c5c8ed'],
    inspirational: ['#141821', '#5b493c', '#e6bd7a'],
  };
  const [base, middle, accent] = palette[genre];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${base}"/><stop offset=".62" stop-color="${middle}"/><stop offset="1" stop-color="${accent}" stop-opacity=".8"/></linearGradient><radialGradient id="r"><stop stop-color="${accent}" stop-opacity=".35"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="1280" height="720" fill="url(#g)"/><ellipse cx="850" cy="290" rx="500" ry="370" fill="url(#r)"/><path d="M0 575 Q200 500 380 590 T760 565 T1280 570 V720 H0Z" fill="#071019" fill-opacity=".65"/><circle cx="985" cy="270" r="56" fill="${accent}" fill-opacity=".2"/><circle cx="985" cy="270" r="16" fill="${accent}" fill-opacity=".8"/></svg>`;
  return Buffer.from(svg);
}

async function readLimited(response: Response): Promise<Buffer> {
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > MAX_IMAGE_BYTES) throw new Error('Artwork exceeded the configured size limit.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Artwork was empty or too large.');
  return bytes;
}

export async function getGenreArtwork(genreId: GenreId, fetcher: typeof fetch = fetch): Promise<{ bytes: Buffer; contentType: string; fallback: boolean }> {
  const genre = findGenre(genreId);
  if (!genre) throw new Error('No artwork is registered for this genre.');
  const cached = cache.get(genre.artObjectKey);
  if (cached) return { bytes: cached, contentType: 'image/webp', fallback: false };
  const apiUrl = process.env.MANUS_API_URL;
  const apiKey = process.env.MANUS_API_KEY;
  if (apiUrl && apiKey) {
    try {
      const presignUrl = new URL('/v1/storage/presign/get', apiUrl);
      presignUrl.searchParams.set('path', genre.artObjectKey);
      const signed = await fetcher(presignUrl, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(12000) });
      if (signed.ok) {
        const payload: unknown = await signed.json();
        const url = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).url : null;
        if (typeof url === 'string') {
          const image = await fetcher(url, { signal: AbortSignal.timeout(16000) });
          const contentType = image.headers.get('content-type') ?? '';
          if (image.ok && contentType.startsWith('image/')) {
            const bytes = await readLimited(image);
            if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
            cache.set(genre.artObjectKey, bytes);
            return { bytes, contentType, fallback: false };
          }
        }
      }
    } catch {
      // Managed images can still be generating or storage can be temporarily unavailable.
    }
  }
  return { bytes: fallbackSvg(genreId), contentType: 'image/svg+xml', fallback: true };
}
