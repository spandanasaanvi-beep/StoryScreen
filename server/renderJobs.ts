import { randomUUID } from 'node:crypto';
import { cleanupRenderedVideo, renderStoryVideo } from './videoRenderer.js';
import type { RenderedVideo } from './videoRenderer.js';
import type { GeneratedStoryDraft, RenderProgress, RenderStage } from '../src/videoStudio/types.js';

const MAX_ACTIVE_JOBS = 1;
const JOB_TTL_MS = 15 * 60 * 1000;
const jobs = new Map<string, InternalJob>();
let activeJobs = 0;

interface InternalJob {
  progress: RenderProgress;
  video?: RenderedVideo;
  expiresAt?: number;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

export class RenderCapacityError extends Error {
  constructor() {
    super('A video is already rendering. Wait for it to finish, then retry this script.');
    this.name = 'RenderCapacityError';
  }
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [jobId, job] of jobs) {
    if (job.expiresAt && job.expiresAt <= now) {
      if (job.cleanupTimer) clearTimeout(job.cleanupTimer);
      if (job.video) void cleanupRenderedVideo(job.video);
      jobs.delete(jobId);
    }
  }
}

function update(jobId: string, stage: RenderStage, progress: number, message: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.progress = { ...job.progress, stage, status: stage === 'queued' ? 'queued' : stage === 'complete' || stage === 'error' ? stage : 'running', progress, message };
}

async function execute(jobId: string, story: GeneratedStoryDraft): Promise<void> {
  update(jobId, 'validating', 4, 'Starting the verified video-render job.');
  let video: RenderedVideo | undefined;
  try {
    video = await renderStoryVideo(story, ({ stage, progress, message }) => update(jobId, stage, progress, message));
    const job = jobs.get(jobId);
    if (!job) {
      await cleanupRenderedVideo(video);
      return;
    }
    job.video = video;
    job.expiresAt = Date.now() + JOB_TTL_MS;
    job.progress = {
      jobId,
      status: 'complete',
      stage: 'complete',
      progress: 100,
      message: video.audioAvailable ? 'The playable MP4 is verified and ready.' : 'The captioned MP4 is verified; synthesized voice was unavailable.',
      downloadPath: `/api/rendered-video/${jobId}`,
      audioAvailable: video.audioAvailable,
      width: video.width,
      height: video.height,
      durationSeconds: video.durationSeconds,
      fileName: video.fileName,
    };
    job.cleanupTimer = setTimeout(() => {
      const current = jobs.get(jobId);
      if (current?.video) void cleanupRenderedVideo(current.video);
      jobs.delete(jobId);
    }, JOB_TTL_MS);
    job.cleanupTimer.unref?.();
  } catch (error) {
    if (video) await cleanupRenderedVideo(video);
    const job = jobs.get(jobId);
    if (job) {
      job.expiresAt = Date.now() + 60_000;
      job.progress = {
        jobId,
        status: 'error',
        stage: 'error',
        progress: 100,
        message: 'The MP4 could not be verified. Your reviewed script is still available to retry.',
        error: error instanceof Error ? error.message.slice(0, 500) : 'Video rendering failed. Please retry the same script.',
      };
    }
  } finally {
    activeJobs = Math.max(0, activeJobs - 1);
  }
}

export function startRenderJob(story: GeneratedStoryDraft): string {
  pruneExpired();
  if (activeJobs >= MAX_ACTIVE_JOBS) throw new RenderCapacityError();
  activeJobs += 1;
  const jobId = randomUUID();
  jobs.set(jobId, {
    progress: { jobId, status: 'queued', stage: 'queued', progress: 0, message: 'The video job is queued.' },
  });
  setImmediate(() => { void execute(jobId, story); });
  return jobId;
}

export function getRenderJob(jobId: string): RenderProgress | undefined {
  pruneExpired();
  const job = jobs.get(jobId);
  return job ? { ...job.progress } : undefined;
}

export function getRenderedVideo(jobId: string): RenderedVideo | undefined {
  pruneExpired();
  return jobs.get(jobId)?.video;
}
