import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = new Set();
let stopping = false;

function start(label, args, extraEnv = {}) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    shell: false,
  });
  children.add(child);
  child.once('error', (error) => {
    console.error(`StoryScreen ${label} could not start: ${error.message}`);
    stop(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(`StoryScreen ${label} stopped${signal ? ` (${signal})` : ` with code ${code ?? 1}`}.`);
      stop(code && code > 0 ? code : 1);
    }
  });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
  setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
  }, 4_000).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

const api = start('API', ['--import', 'tsx', 'server/index.ts'], { API_PORT: process.env.API_PORT ?? '3001', NODE_ENV: 'development' });
const deadline = Date.now() + 12_000;
let ready = false;
while (Date.now() < deadline && api.exitCode === null) {
  try {
    const response = await fetch(`http://127.0.0.1:${process.env.API_PORT ?? '3001'}/api/health`, { signal: AbortSignal.timeout(800) });
    if (response.ok) { ready = true; break; }
  } catch { /* Keep waiting for the local API to bind. */ }
  await new Promise((resolve) => setTimeout(resolve, 150));
}
if (!ready) {
  console.error('StoryScreen API did not become ready. The Vite site was not started.');
  stop(1);
  await new Promise((resolve) => setTimeout(resolve, 50));
  process.exit(1);
}

start('Vite', ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', process.env.STORYSCREEN_PREVIEW_PORT ?? '3000', '--strictPort']);
console.info('StoryScreen development API is ready; Vite is starting on the configured Preview port.');
