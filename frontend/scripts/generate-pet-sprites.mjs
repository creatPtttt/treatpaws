// One-off/maintenance script: crops the "idle" row (row 0, 8 frames) out of
// each full petdex spritesheet (which also contains 8 other unused
// animation-state rows) and re-encodes it as a small, heavily-compressed
// WebP strip. Full sheets are ~1.5-2.4MB each; TreatPaws only ever plays the
// idle loop, so shipping the whole sheet to every visitor would be wasteful.
//
// Requires `sharp`, which is NOT a project dependency (kept out of
// package.json on purpose — it's a native, heavy build-time tool only
// needed when regenerating these assets). Run:
//   npm install --no-save sharp
//   node scripts/generate-pet-sprites.mjs
//   npm uninstall sharp
//
// Source spritesheets must already exist locally (via `npx petdex install
// <slug>`, which writes to ~/.petdex/pets/<slug>/spritesheet.webp).
// For Island Playground roamers, also copy that full multi-row sheet into
// `public/pets/<slug>/spritesheet.webp` (rows 0/1/2/4/6 = idle/runR/runL/jump/sleep).

import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
const IDLE_ROW_INDEX = 0;
const IDLE_FRAME_COUNT = 8;
const IDLE_STRIP_WIDTH = FRAME_WIDTH * IDLE_FRAME_COUNT; // 1536 — always the full sheet width

// pet id -> petdex catalog slug (see src/data/creatures.ts for the same map
// with display names/attribution — keep both in sync if this list changes).
const SLUGS = [
  'mallow',
  'boba',
  'shiba-4',
  'kuro',
  'kero',
  'capy',
  'duck-lord',
  'otterumells',
  'bun',
  'penguin-chick',
];

const petdexHome = path.join(homedir(), '.petdex', 'pets');
const outDir = path.join(process.cwd(), 'public', 'pets');

async function run() {
  mkdirSync(outDir, { recursive: true });

  for (const slug of SLUGS) {
    const source = path.join(petdexHome, slug, 'spritesheet.webp');
    if (!existsSync(source)) {
      console.warn(`Skipping ${slug}: ${source} not found (run "npx petdex install ${slug}" first).`);
      continue;
    }

    const destDir = path.join(outDir, slug);
    mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, 'idle.webp');

    await sharp(source)
      .extract({ left: 0, top: IDLE_ROW_INDEX * FRAME_HEIGHT, width: IDLE_STRIP_WIDTH, height: FRAME_HEIGHT })
      .webp({ quality: 82 })
      .toFile(dest);

    console.log(`Wrote ${dest}`);
  }
}

run();
