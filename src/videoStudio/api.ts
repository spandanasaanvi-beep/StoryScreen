import type { GeneratedStoryDraft, RenderProgress, StoryGenerationRequest } from './types';
import { validateGeneratedStory } from './validation';

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('The StoryScreen server returned an unreadable response.');
  return payload as Record<string, unknown>;
}

function serverMessage(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.message === 'string' ? payload.message : typeof payload.error === 'string' ? payload.error : fallback;
}

export async function draftStory(request: StoryGenerationRequest, signal?: AbortSignal): Promise<GeneratedStoryDraft> {
  const response = await fetch('/api/generate-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  const payload = await responseJson(response);
  if (!response.ok) throw new Error(serverMessage(payload, 'Story drafting did not finish. Review the answers and try again.'));
  const story = payload.story;
  if (!validateGeneratedStory(story)) throw new Error('The generated story did not pass validation. Please retry with the same answers.');
  return story;
}

export async function beginVideoRender(story: GeneratedStoryDraft, signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ story }),
    signal,
  });
  const payload = await responseJson(response);
  if (!response.ok || typeof payload.jobId !== 'string') throw new Error(serverMessage(payload, 'The video renderer could not start. You can retry this script.'));
  return payload.jobId;
}

export async function getRenderProgress(jobId: string, signal?: AbortSignal): Promise<RenderProgress> {
  const response = await fetch(`/api/render-jobs/${encodeURIComponent(jobId)}`, { headers: { Accept: 'application/json' }, signal, cache: 'no-store' });
  const payload = await responseJson(response);
  if (!response.ok) throw new Error(serverMessage(payload, 'The rendering status is temporarily unavailable.'));
  if (payload.jobId !== jobId || typeof payload.status !== 'string' || typeof payload.stage !== 'string' || typeof payload.progress !== 'number' || typeof payload.message !== 'string') {
    throw new Error('The rendering status did not pass validation.');
  }
  return payload as unknown as RenderProgress;
}

export async function downloadRenderedVideo(path: string, signal?: AbortSignal): Promise<Blob> {
  if (!path.startsWith('/api/rendered-video/')) throw new Error('The render service returned an invalid download path.');
  const response = await fetch(path, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('The finished video could not be downloaded. Retry rendering from the saved script.');
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('video/mp4')) throw new Error('The renderer did not return a playable MP4 file.');
  const blob = await response.blob();
  if (blob.size < 1024) throw new Error('The rendered video file is empty or incomplete.');
  return blob;
}
