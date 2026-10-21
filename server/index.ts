import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { generateStoryDraft, isValidGeneratedStory } from './storyGenerator.js';
import { getRenderJob, getRenderedVideo, RenderCapacityError, startRenderJob } from './renderJobs.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(root, 'dist');
const MAX_JSON_BYTES = 700 * 1024;
const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

function sendJson(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  if (response.headersSent || response.destroyed) return;
  const encoded = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': String(encoded.byteLength),
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(encoded);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send this request as application/json.');
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (declaredLength > MAX_JSON_BYTES) throw new HttpError(413, 'The request is too large. Review the script and try again.');
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    request.on('data', (chunk: Buffer | string) => {
      if (failed) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_JSON_BYTES) {
        failed = true;
        reject(new HttpError(413, 'The request is too large. Review the script and try again.'));
        request.resume();
        return;
      }
      chunks.push(buffer);
    });
    request.on('end', () => {
      if (failed) return;
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(text));
      } catch {
        reject(new HttpError(400, 'The request body is not valid JSON.'));
      }
    });
    request.on('error', () => reject(new HttpError(400, 'The request was interrupted.')));
  });
}

function mimeType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

async function serveStatic(request: IncomingMessage, response: ServerResponse, pathname: string): Promise<void> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'This page is read-only.' });
    return;
  }
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch {
    sendJson(response, 400, { error: 'The requested path is invalid.' });
    return;
  }
  if (decoded.includes('\u0000') || decoded.includes('\\')) {
    sendJson(response, 400, { error: 'The requested path is invalid.' });
    return;
  }
  const candidate = path.resolve(distRoot, `.${decoded}`);
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${path.sep}`)) {
    sendJson(response, 403, { error: 'The requested path is outside the website.' });
    return;
  }
  let chosen = candidate;
  let fileStat;
  try {
    fileStat = await stat(chosen);
    if (fileStat.isDirectory()) {
      chosen = path.join(chosen, 'index.html');
      fileStat = await stat(chosen);
    }
  } catch {
    const hasFileExtension = path.extname(decoded) !== '';
    if (hasFileExtension || !(request.headers.accept ?? '').includes('text/html')) {
      sendJson(response, 404, { error: 'That file was not found.' });
      return;
    }
    chosen = path.join(distRoot, 'index.html');
    try { fileStat = await stat(chosen); } catch {
      sendJson(response, 503, { error: 'The StoryScreen frontend has not been built yet.' });
      return;
    }
  }
  if (!fileStat?.isFile()) {
    sendJson(response, 404, { error: 'That file was not found.' });
    return;
  }
  response.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Content-Length': String(fileStat.size),
    'Content-Type': mimeType(chosen),
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') { response.end(); return; }
  await pipeline(createReadStream(chosen), response);
}

async function handleApi(request: IncomingMessage, response: ServerResponse, pathname: string): Promise<boolean> {
  if (pathname === '/api/health') {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'This health endpoint accepts GET.' });
      return true;
    }
    sendJson(response, 200, { status: 'ok', service: 'storyscreen' });
    return true;
  }

  if (pathname === '/api/generate-story' && request.method === 'POST') {
    const body = await readJson(request);
    const story = await generateStoryDraft(body);
    sendJson(response, 200, { story });
    return true;
  }

  if (pathname === '/api/render-video' && request.method === 'POST') {
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body) || !('story' in body)) {
      throw new HttpError(400, 'A reviewed story script is required before rendering.');
    }
    const story = (body as Record<string, unknown>).story;
    if (!isValidGeneratedStory(story)) throw new HttpError(400, 'The reviewed script is invalid or incomplete. Return to review and try again.');
    try {
      const jobId = startRenderJob(story);
      sendJson(response, 202, { jobId, message: 'The video render has started.' });
    } catch (error) {
      if (error instanceof RenderCapacityError) throw new HttpError(429, error.message);
      throw error;
    }
    return true;
  }

  const jobMatch = pathname.match(/^\/api\/render-jobs\/([0-9a-f-]{36})$/i);
  if (jobMatch && request.method === 'GET') {
    const job = getRenderJob(jobMatch[1] ?? '');
    if (!job) throw new HttpError(404, 'That render job has expired or does not exist. You can retry from the saved script.');
    sendJson(response, 200, job as unknown as Record<string, unknown>);
    return true;
  }

  const videoMatch = pathname.match(/^\/api\/rendered-video\/([0-9a-f-]{36})$/i);
  if (videoMatch && request.method === 'GET') {
    const video = getRenderedVideo(videoMatch[1] ?? '');
    if (!video) throw new HttpError(404, 'That temporary video is no longer available. Retry rendering from your saved script.');
    response.writeHead(200, {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(video.fileName)}`,
      'Content-Length': String(video.sizeBytes),
      'Content-Type': 'video/mp4',
      'X-Content-Type-Options': 'nosniff',
    });
    try { await pipeline(createReadStream(video.outputPath), response); } catch {
      if (!response.destroyed) response.destroy();
    }
    return true;
  }

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    sendJson(response, 404, { error: 'That StoryScreen API route was not found.' });
    return true;
  }
  return false;
}

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
const production = process.env.NODE_ENV === 'production';
const server = createServer((request, response) => {
  void (async () => {
    let pathname = '/';
    try {
      const url = new URL(request.url ?? '/', 'http://storyscreen.local');
      pathname = url.pathname;
      if (await handleApi(request, response, pathname)) return;
      if (!production) {
        sendJson(response, 404, { error: 'This development listener only serves /api endpoints.' });
        return;
      }
      await serveStatic(request, response, pathname);
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
      if (response.headersSent) { response.destroy(); return; }
      const message = error instanceof Error ? error.message : 'The request failed unexpectedly.';
      console.error(`StoryScreen request failed at ${pathname}: ${message.slice(0, 220)}`);
      sendJson(response, 500, { error: 'StoryScreen could not complete that request. Try again; your draft is unchanged.' });
    }
  })();
});

server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.listen(port, '0.0.0.0', () => {
  console.info(`StoryScreen API listening on 0.0.0.0:${port}${production ? ' with static output' : ''}.`);
});
