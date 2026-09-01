#!/usr/bin/env node
// Records demo/index.html to demo/out/product-demo.mp4 (+ .webm).
//
// Playwright's recordVideo captures the page at real time, so the demo's own
// CSS transitions and synthetic cursor are what you see — no frame stitching.
// It captures no audio at all, so the music bed is muxed in at encode time.
//
// Usage: node demo/record.mjs [--gif] [--music <path>] [--no-music] [--music-db <n>]
//
//   --music <path>   use this track instead of the sibling music.* file
//   --no-music       force a silent mp4 even if a sibling music.* exists
//   --music-db <n>   shift the loudness target, e.g. -3 for a quieter bed
//
// With no flags: uses ./music.* if it's there, silent if it isn't.

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const RAW = join(OUT, 'raw');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`${name} needs a value`);
  return v;
};

// Audio settings. -18 LUFS sits right for music that is the only sound in the
// clip; loudnorm rather than a fixed dB offset because tracks arrive at wildly
// different levels and one offset can't serve them all.
const TARGET_LUFS = -18;
const FADE_IN = 1.5;
const FADE_OUT = 2.5;
const MUSIC_EXT = ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'];

// The recorder is copied into each demo/vN/ folder, so it has no idea where the
// skill's assets/music/ lives. Tracks are copied in next to it at scaffold time;
// all it has to resolve is a sibling file or an explicit path.
function resolveMusic() {
  if (flag('--no-music')) return null;
  const explicit = option('--music');
  if (explicit !== undefined) {
    const p = resolve(explicit);
    if (!existsSync(p)) throw new Error(`music file not found: ${p}`);
    return p;
  }
  for (const ext of MUSIC_EXT) {
    const p = join(HERE, `music.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

function durationOf(file) {
  for (const entries of ['format=duration', 'stream=duration']) {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', entries, '-of', 'default=nw=1:nk=1', file],
      { encoding: 'utf8' },
    );
    const d = parseFloat(out.trim().split('\n').find((l) => parseFloat(l) > 0) ?? '');
    if (Number.isFinite(d) && d > 0) return d;
  }
  throw new Error(`ffprobe read no duration from ${file}`);
}

// Playwright isn't a repo dependency — reuse whichever copy is already on this
// machine before making anyone install one. Node's resolver walks up from each
// candidate, so between them these cover the demo folder, the repo being demoed,
// a skill or plugin install under ~/.claude, and a global `npm i -g playwright`.
// Lazy, because `npm root -g` costs a subprocess and is only worth it last.
function globalNodeModules() {
  try {
    return execFileSync('npm', ['root', '-g'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function loadPlaywright() {
  const candidates = [
    () => HERE,
    () => process.cwd(),
    () => join(homedir(), '.claude/skills'),
    () => join(homedir(), '.claude/plugins'),
    () => homedir(),
    globalNodeModules,
  ];
  for (const candidate of candidates) {
    const from = candidate();
    if (!from) continue;
    try {
      return createRequire(join(from, 'x.js'))('playwright');
    } catch {}
  }
  throw new Error(
    'playwright not found. Install it in the repo you are demoing, or globally:\n' +
      '  pnpm add -D playwright && pnpm exec playwright install chromium\n' +
      '  npm  i  -D playwright && npx  playwright install chromium\n' +
      '  yarn add -D playwright && yarn playwright install chromium',
  );
}

const music = resolveMusic();
const musicDb = parseFloat(option('--music-db') ?? '0');
if (!Number.isFinite(musicDb) || musicDb > 10 || musicDb < -30) {
  throw new Error('--music-db must be a number between -30 and 10');
}

const { chromium } = loadPlaywright();

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

console.log('recording…');
await page.goto(pathToFileURL(join(HERE, 'index.html')).href + '?record=1');
await page.waitForFunction(() => window.__demoDone === true, null, { timeout: 180_000 });
await page.waitForTimeout(600); // let the last frame settle

await context.close();
await browser.close();

const webm = join(OUT, 'product-demo.webm');
const mp4 = join(OUT, 'product-demo.mp4');
const raw = readdirSync(RAW).find((f) => f.endsWith('.webm'));
if (!raw) throw new Error('playwright produced no video file');
renameSync(join(RAW, raw), webm);
rmSync(RAW, { recursive: true, force: true });

// Playwright's webm has a variable frame rate; re-encode to a constant 30fps
// mp4 so it plays everywhere (Slack, Keynote, Safari, Twitter).
const videoDur = durationOf(webm);
const args = ['-y', '-loglevel', 'error', '-i', webm];

if (music) {
  const musicDur = durationOf(music);
  // Looping mid-phrase is audible. Only loop when we have to, and say so —
  // the real fix is a longer track, not a filter.
  if (musicDur < videoDur) {
    console.log(
      `note   music is ${musicDur.toFixed(1)}s for a ${videoDur.toFixed(1)}s video — ` +
        'looping, the seam will be audible. Use a longer track.',
    );
    args.push('-stream_loop', '-1');
  }
  args.push('-i', music);
}

args.push('-vf', 'fps=30,scale=1280:800:flags=lanczos');

if (music) {
  const fadeOutStart = Math.max(0, videoDur - FADE_OUT).toFixed(3);
  args.push(
    '-filter:a',
    [
      `loudnorm=I=${TARGET_LUFS + musicDb}:TP=-1.5:LRA=11`,
      `afade=t=in:st=0:d=${FADE_IN}`,
      `afade=t=out:st=${fadeOutStart}:d=${FADE_OUT}`,
    ].join(','),
    '-map', '0:v:0',
    '-map', '1:a:0',
  );
}

args.push(
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
);

if (music) {
  args.push('-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '48000');
  args.push('-shortest', '-t', videoDur.toFixed(3));
} else {
  args.push('-an');
}

args.push(mp4);
execFileSync('ffmpeg', args, { stdio: 'inherit' });

// A dropped audio stream is invisible in the frames, so assert it rather than
// trust it — this is the one failure mode the frame check cannot catch.
if (music) {
  const codec = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name',
     '-of', 'default=nw=1:nk=1', mp4],
    { encoding: 'utf8' },
  ).trim();
  if (!codec) throw new Error(`mp4 has no audio stream — the ${music} mux silently failed`);
  console.log('music ', `${music} → ${codec} @ ${TARGET_LUFS + musicDb} LUFS`);
} else {
  console.log('music ', 'none — silent mp4');
}

if (process.argv.includes('--gif')) {
  const gif = join(OUT, 'product-demo.gif');
  const palette = join(OUT, 'palette.png');
  const fl = 'fps=15,scale=900:-1:flags=lanczos';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', `${fl},palettegen=stats_mode=diff`, palette], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-an', '-i', palette, '-lavfi', `${fl} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3`, gif], { stdio: 'inherit' });
  rmSync(palette, { force: true });
  console.log('gif   ', gif, '(gif carries no audio)');
}

console.log('webm  ', webm, '(raw capture, silent)');
console.log('mp4   ', mp4);
if (!existsSync(mp4)) process.exitCode = 1;
