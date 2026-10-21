import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getGenreArtwork } from './imageAssets.js';
import { isValidGeneratedStory } from './storyGenerator.js';
import type { AspectRatio, GeneratedStoryDraft, NarratorVoice, RenderStage, VisualStyle } from '../src/videoStudio/types.js';

const FPS = 24;
const COMMAND_TIMEOUT_MS = 150_000;
const FONT_FILE = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_DIR = '/usr/share/fonts/truetype/dejavu';
const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 960, height: 960 },
};
const BACKDROPS: Record<GeneratedStoryDraft['genre'], string> = {
  fantasy: '0b1723', mystery: '0a1423', 'science-fiction': '07191c', comedy: '201426',
  adventure: '101a28', 'folktales-mythology': '151528', bedtime: '11152a', inspirational: '141821',
};

export interface RenderUpdate {
  stage: RenderStage;
  progress: number;
  message: string;
}

export interface RenderedVideo {
  tempDir: string;
  outputPath: string;
  fileName: string;
  width: number;
  height: number;
  durationSeconds: number;
  audioAvailable: boolean;
  sizeBytes: number;
}

interface RunResult {
  stdout: Buffer;
  stderr: string;
}

function run(command: string, args: string[], options: { input?: string; timeoutMs?: number } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false });
    } catch {
      reject(new Error(`${command} could not be started.`));
      return;
    }
    const stdout: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = '';
    let settled = false;
    const finishError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finishError(new Error(`${command} timed out.`));
    }, options.timeoutMs ?? COMMAND_TIMEOUT_MS);
    timer.unref?.();
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= 2 * 1024 * 1024) stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 24_000) stderr += chunk.toString('utf8').slice(0, 24_000 - stderr.length);
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      finishError(error.code === 'ENOENT' ? new Error(`${command} is not installed.`) : new Error(`${command} could not be started.`));
    });
    child.on('close', (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        const reason = stderr.trim().split('\n').slice(-2).join(' ').slice(-500);
        reject(new Error(reason || `${command} exited with code ${String(code)}.`));
        return;
      }
      resolve({ stdout: Buffer.concat(stdout), stderr });
    });
    child.stdin.end(options.input ?? '');
  });
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function cleanOverlayText(value: string): string {
  return value
    .replace(/[{}<>\\\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 680);
}

function safeFileName(title: string): string {
  const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 46);
  return `${slug || 'storyscreen-story'}-${Date.now()}.mp4`;
}

function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/,/g, '\\,').replace(/'/g, "\\'");
}

function wrapCaption(text: string, width: number): string {
  const words = cleanOverlayText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5).join('\\N');
}

function toAssTime(seconds: number): string {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(centiseconds / 360_000);
  const minutes = Math.floor((centiseconds % 360_000) / 6_000);
  const wholeSeconds = Math.floor((centiseconds % 6_000) / 100);
  const fraction = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(fraction).padStart(2, '0')}`;
}

function makeAss(scene: GeneratedStoryDraft['scenes'][number], width: number, height: number, seconds: number): string {
  const vertical = height > width;
  const fontSize = vertical ? 30 : 33;
  const margin = vertical ? 54 : 72;
  const wrapLength = vertical ? 25 : 46;
  const safeTitle = cleanOverlayText(scene.title).replace(/,/g, '');
  const caption = wrapCaption(scene.narration, wrapLength).replace(/,/g, '\\,');
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nScaledBorderAndShadow: yes\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,DejaVu Sans,${fontSize},&H00F5F0E7,&H000000FF,&HAA080B13,&HAA080B13,0,0,1,2,0,2,${margin},${margin},${vertical ? 112 : 58},1\nStyle: Header,DejaVu Sans,${vertical ? 31 : 40},&H00FFE2AC,&H000000FF,&HAA080B13,&HAA080B13,1,0,1,2,0,8,${margin},${margin},${vertical ? 60 : 34},1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const headerEnd = Math.min(seconds - 0.4, 2.7);
  const subtitleStart = Math.min(0.38, seconds * 0.12);
  const subtitleEnd = Math.max(subtitleStart + 0.2, seconds - 0.32);
  return `${header}Dialogue: 1,${toAssTime(0.12)},${toAssTime(headerEnd)},Header,,0,0,0,,${safeTitle}\nDialogue: 0,${toAssTime(subtitleStart)},${toAssTime(subtitleEnd)},Default,,0,0,0,,${caption}\n`;
}

function colorTreatment(style: VisualStyle): string {
  if (style === 'Cinematic Glow') return 'eq=contrast=1.08:saturation=1.12:brightness=0.01,vignette=PI/5';
  if (style === 'Graphic Novel') return 'eq=contrast=1.19:saturation=1.13,unsharp=5:5:0.55:5:5:0.0';
  return 'eq=contrast=1.02:saturation=0.94:brightness=0.015';
}

function cameraForScene(index: number): string {
  const movements = [
    "zoompan=z='min(zoom+0.00048,1.075)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
    "zoompan=z='min(zoom+0.0004,1.06)':x='iw-iw/zoom':y='ih/2-(ih/zoom/2)'",
    "zoompan=z='min(zoom+0.00042,1.065)':x='0':y='ih/2-(ih/zoom/2)'",
    "zoompan=z='min(zoom+0.00038,1.055)':x='iw/2-(iw/zoom/2)':y='ih-ih/zoom'",
    "zoompan=z='min(zoom+0.00044,1.07)':x='iw-iw/zoom':y='ih-ih/zoom'",
    "zoompan=z='min(zoom+0.0004,1.06)':x='0':y='0'",
  ];
  return movements[index % movements.length] ?? movements[0]!;
}

function ttsSettings(voice: NarratorVoice): { pitch: number; volume: number; pace: number } {
  if (voice === 'Bright Storyteller') return { pitch: 62, volume: 165, pace: 1.07 };
  if (voice === 'Gentle Bedtime') return { pitch: 42, volume: 145, pace: 0.91 };
  return { pitch: 50, volume: 155, pace: 1 };
}

function ttsLocale(language: GeneratedStoryDraft['language']): string {
  const voices = { English: 'en-us', Spanish: 'es', French: 'fr-fr', German: 'de', Italian: 'it' } as const;
  return voices[language];
}

async function makeFallbackPng(pathName: string, genre: GeneratedStoryDraft['genre'], width: number, height: number): Promise<void> {
  const color = BACKDROPS[genre];
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=0x${color}:s=${width}x${height}:d=1`,
    '-vf', `drawbox=x=0:y=${Math.round(height * 0.66)}:w=${width}:h=${Math.round(height * 0.34)}:color=0x070B13@0.55:t=fill,drawbox=x=${Math.round(width * 0.68)}:y=${Math.round(height * 0.16)}:w=${Math.round(width * 0.12)}:h=${Math.round(height * 0.12)}:color=0xE8BC70@0.14:t=fill`,
    '-frames:v', '1', pathName,
  ];
  await run('ffmpeg', args, { timeoutMs: 20_000 });
}

function imageExtension(contentType: string): string {
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'img';
}

async function renderSpeech(text: string, voice: NarratorVoice, language: GeneratedStoryDraft['language'], seconds: number, outputPath: string): Promise<boolean> {
  const settings = ttsSettings(voice);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const targetPace = Math.round((words * 60 / Math.max(1, seconds * 0.8)) * settings.pace);
  const speed = clamp(targetPace, 125, 245);
  try {
    await run('espeak-ng', ['-v', ttsLocale(language), '-s', String(speed), '-p', String(settings.pitch), '-a', String(settings.volume), '-w', outputPath, '--stdin'], { input: text, timeoutMs: 35_000 });
    const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outputPath], { timeoutMs: 12_000 });
    return Number.parseFloat(probe.stdout.toString('utf8')) > 0;
  } catch {
    return false;
  }
}

async function audioDuration(audioPath: string): Promise<number> {
  const result = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath], { timeoutMs: 12_000 });
  return Number.parseFloat(result.stdout.toString('utf8')) || 0;
}

function clipFilter(width: number, height: number, sceneIndex: number, style: VisualStyle, titlePath: string, assPath: string, clipSeconds: number): string {
  const frameCount = Math.max(1, Math.round(clipSeconds * FPS));
  const camera = cameraForScene(sceneIndex);
  const vertical = height > width;
  const subtitleFile = escapeFilterPath(assPath);
  const fonts = escapeFilterPath(FONT_DIR);
  const font = escapeFilterPath(FONT_FILE);
  return [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    `${camera}:d=1:s=${width}x${height}:fps=${FPS}`,
    'setsar=1',
    colorTreatment(style),
    `drawtext=fontfile=${font}:textfile=${escapeFilterPath(titlePath)}:expansion=none:fontsize=${vertical ? 42 : 48}:fontcolor=white:borderw=2:bordercolor=black@0.35:box=1:boxcolor=black@0.28:boxborderw=18:x=(w-text_w)/2:y=${Math.round(height * (vertical ? 0.13 : 0.1))}`,
    `subtitles=${subtitleFile}:fontsdir=${fonts}`,
    `fade=t=in:st=0:d=0.3`,
    `fade=t=out:st=${Math.max(0, clipSeconds - 0.3).toFixed(3)}:d=0.3`,
    `trim=end_frame=${frameCount}`,
    'setpts=PTS-STARTPTS',
  ].join(',');
}

async function renderClip(input: { imagePath: string; audioPath?: string; titlePath: string; assPath: string; outputPath: string; width: number; height: number; sceneIndex: number; style: VisualStyle; seconds: number; audioSeconds?: number }): Promise<void> {
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', String(FPS), '-i', input.imagePath];
  if (input.audioPath) args.push('-i', input.audioPath);
  const filter = clipFilter(input.width, input.height, input.sceneIndex, input.style, input.titlePath, input.assPath, input.seconds);
  args.push('-map', '0:v:0', '-vf', filter, '-t', input.seconds.toFixed(3), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-threads', '2', '-movflags', '+faststart');
  if (input.audioPath) {
    const ratio = input.audioSeconds && input.audioSeconds > input.seconds * 0.96 ? clamp(input.audioSeconds / (input.seconds * 0.91), 1, 2) : 1;
    const fadeStart = Math.max(0, input.seconds - 0.25);
    args.push('-map', '1:a:0', '-af', `atempo=${ratio.toFixed(3)},apad=pad_dur=${input.seconds.toFixed(3)},atrim=duration=${input.seconds.toFixed(3)},afade=t=in:st=0:d=0.12,afade=t=out:st=${fadeStart.toFixed(3)}:d=0.25,asetpts=PTS-STARTPTS`, '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2');
  } else {
    args.push('-an');
  }
  args.push(input.outputPath);
  await run('ffmpeg', args);
}

async function probeOutput(outputPath: string): Promise<{ duration: number; width: number; height: number; hasAudio: boolean; videoCodec: string }> {
  const result = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height', '-of', 'json', outputPath], { timeoutMs: 20_000 });
  const raw: unknown = JSON.parse(result.stdout.toString('utf8'));
  if (!raw || typeof raw !== 'object') throw new Error('The rendered video could not be verified.');
  const data = raw as { format?: { duration?: string }; streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }> };
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  if (!video || !video.width || !video.height || !video.codec_name) throw new Error('The renderer did not produce a video stream.');
  return {
    duration: Number.parseFloat(data.format?.duration ?? '0'),
    width: video.width,
    height: video.height,
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
    videoCodec: video.codec_name,
  };
}

export async function renderStoryVideo(story: GeneratedStoryDraft, onUpdate: (update: RenderUpdate) => void): Promise<RenderedVideo> {
  if (!isValidGeneratedStory(story)) throw new Error('The script is incomplete or no longer valid. Please review it and try again.');
  const dimensions = DIMENSIONS[story.aspectRatio];
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'storyscreen-render-'));
  const outputPath = path.join(tempDir, 'storyscreen.mp4');
  try {
    onUpdate({ stage: 'validating', progress: 5, message: 'Checking the script and requested video format.' });
    const art = await getGenreArtwork(story.genre);
    let artPath: string;
    if (art.fallback) {
      artPath = path.join(tempDir, 'fallback.png');
      await makeFallbackPng(artPath, story.genre, dimensions.width, dimensions.height);
    } else {
      artPath = path.join(tempDir, `genre-art.${imageExtension(art.contentType)}`);
      await writeFile(artPath, art.bytes, { flag: 'wx' });
    }
    onUpdate({ stage: 'artwork', progress: 16, message: art.fallback ? 'Using an original gradient fallback because the genre artwork is unavailable.' : 'Prepared the matching genre illustration for each scene.' });

    const count = story.scenes.length;
    const clipSeconds = story.durationSeconds / count;
    const voiceFiles: string[] = [];
    let audioAvailable = true;
    onUpdate({ stage: 'narration', progress: 21, message: `Preparing ${story.language} narration and captions.` });
    for (let index = 0; index < count; index += 1) {
      const text = story.scenes[index]?.narration ?? '';
      const voicePath = path.join(tempDir, `voice-${String(index + 1).padStart(2, '0')}.wav`);
      if (!(await renderSpeech(text, story.narratorVoice, story.language, clipSeconds, voicePath))) {
        audioAvailable = false;
        break;
      }
      voiceFiles.push(voicePath);
    }
    if (!audioAvailable) {
      await Promise.all(voiceFiles.map((file) => rm(file, { force: true }).catch(() => undefined)));
      voiceFiles.length = 0;
    }
    const qualityNote = audioAvailable ? 'Narration and subtitles are ready.' : 'Voice synthesis is unavailable; the video will retain its subtitles without an audio track.';
    onUpdate({ stage: 'narration', progress: 30, message: qualityNote });

    const clipPaths: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const scene = story.scenes[index];
      if (!scene) throw new Error('A story scene is missing.');
      const titlePath = path.join(tempDir, `title-${String(index + 1).padStart(2, '0')}.txt`);
      const assPath = path.join(tempDir, `captions-${String(index + 1).padStart(2, '0')}.ass`);
      const clipPath = path.join(tempDir, `scene-${String(index + 1).padStart(2, '0')}.mp4`);
      await writeFile(titlePath, cleanOverlayText(scene.title), { flag: 'wx' });
      await writeFile(assPath, makeAss(scene, dimensions.width, dimensions.height, clipSeconds), { flag: 'wx' });
      const voicePath = voiceFiles[index];
      const voiceSeconds = voicePath ? await audioDuration(voicePath) : undefined;
      onUpdate({ stage: 'rendering', progress: 33 + Math.round((index / count) * 48), message: `Rendering scene ${index + 1} of ${count}: ${cleanOverlayText(scene.title).slice(0, 52)}.` });
      await renderClip({ imagePath: artPath, ...(voicePath ? { audioPath: voicePath, audioSeconds: voiceSeconds } : {}), titlePath, assPath, outputPath: clipPath, width: dimensions.width, height: dimensions.height, sceneIndex: index, style: story.visualStyle, seconds: clipSeconds });
      clipPaths.push(clipPath);
    }

    const concatFile = path.join(tempDir, 'segments.txt');
    const manifest = clipPaths.map((file) => `file '${path.basename(file)}'`).join('\n') + '\n';
    await writeFile(concatFile, manifest, { flag: 'wx' });
    onUpdate({ stage: 'rendering', progress: 84, message: 'Joining the scenes into an MP4.' });
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', '-movflags', '+faststart', '-metadata', `title=${cleanOverlayText(story.title)}`, outputPath]);

    onUpdate({ stage: 'verifying', progress: 94, message: 'Checking that the MP4 is complete and playable.' });
    const outputStat = await stat(outputPath);
    const probe = await probeOutput(outputPath);
    const tolerance = Math.max(1.5, story.durationSeconds * 0.16);
    if (outputStat.size < 12_000 || probe.duration < story.durationSeconds - tolerance || probe.duration > story.durationSeconds + tolerance
      || probe.width !== dimensions.width || probe.height !== dimensions.height || probe.videoCodec !== 'h264') {
      throw new Error('The render did not pass its MP4 integrity check. Please retry the same script.');
    }
    if (audioAvailable && !probe.hasAudio) throw new Error('Narration was prepared but no audio stream was present in the rendered MP4. Please retry.');
    onUpdate({ stage: 'complete', progress: 100, message: audioAvailable ? 'Verified MP4 ready with narration and burned-in subtitles.' : 'Verified captioned MP4 ready; voice audio was unavailable in this environment.' });
    return {
      tempDir,
      outputPath,
      fileName: safeFileName(story.title),
      width: probe.width,
      height: probe.height,
      durationSeconds: Number(probe.duration.toFixed(2)),
      audioAvailable,
      sizeBytes: outputStat.size,
    };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    const raw = error instanceof Error ? error.message : 'An unknown media error occurred.';
    if (/ffmpeg is not installed|ffprobe is not installed|eSpeak/i.test(raw)) throw new Error('The video tools are not installed. Install FFmpeg and eSpeak-NG, or run the packaged StoryScreen server.');
    throw new Error(raw.slice(0, 600));
  }
}

export async function cleanupRenderedVideo(video: RenderedVideo): Promise<void> {
  await rm(video.tempDir, { recursive: true, force: true }).catch(() => undefined);
}

export async function readVerifiedVideo(video: RenderedVideo): Promise<Buffer> {
  const current = await stat(video.outputPath);
  if (current.size !== video.sizeBytes) throw new Error('The temporary MP4 changed before download.');
  const bytes = await readFile(video.outputPath);
  if (bytes.byteLength !== video.sizeBytes || bytes.byteLength < 12_000) throw new Error('The temporary MP4 is incomplete.');
  return bytes;
}
