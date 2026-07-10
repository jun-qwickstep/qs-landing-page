#!/usr/bin/env node
// Converts site images to WebP, resized to ~2x their real display size.
// Originals are left untouched on disk. Re-run after adding proof screenshots.
//
//   node scripts/optimize-images.mjs          # convert
//   node scripts/optimize-images.mjs --dry    # report only

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

// og:image is excluded on purpose: Facebook, LinkedIn and X do not reliably
// render WebP link previews, so it must stay a PNG.
const SKIP = new Set(['images/og-viralapplaunch.png']);

// maxEdge = longest side after resize. Sized to ~2x the largest box the image
// is ever painted into, so it stays crisp on retina without shipping waste.
const RULES = [
  { file: 'images/china candid upscaled.png', maxEdge: 768,  quality: 82 },
  { file: 'images/london_skool_event.png',    maxEdge: 1200, quality: 82 },
  { file: 'images/ryan-montoya.png',          maxEdge: 144,  quality: 90 },
  { file: 'images/ahmad-jabbir.jpeg',         maxEdge: 144,  quality: 90 },
  { file: 'brand_assets/qwickstep.ai iconic mark (white).png', maxEdge: 96, quality: 90 },
];

// Everything in the proof gallery: analytics screenshots full of small text.
// Higher quality + effort 6 keeps numerals legible after downscale.
const PROOF_DIR = 'proof_assets/deployed';
for (const f of fs.readdirSync(path.join(ROOT, PROOF_DIR))) {
  if (/\.(png|jpe?g)$/i.test(f)) {
    RULES.push({ file: `${PROOF_DIR}/${f}`, maxEdge: 1600, quality: 85, effort: 6 });
  }
}

const kb = (n) => (n / 1024).toFixed(0).padStart(6);
let before = 0, after = 0, count = 0;

for (const rule of RULES) {
  if (SKIP.has(rule.file)) continue;

  const src = path.join(ROOT, rule.file);
  const dst = src.replace(/\.(png|jpe?g)$/i, '.webp');
  if (!fs.existsSync(src)) { console.warn(`missing: ${rule.file}`); continue; }

  const meta = await sharp(src).metadata();
  const srcBytes = fs.statSync(src).size;

  const pipeline = sharp(src).resize({
    width: meta.width >= meta.height ? rule.maxEdge : null,
    height: meta.height > meta.width ? rule.maxEdge : null,
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (!DRY) {
    await pipeline
      .webp({ quality: rule.quality, effort: rule.effort ?? 5, alphaQuality: 100 })
      .toFile(dst);
  }

  const dstBytes = DRY ? 0 : fs.statSync(dst).size;
  const out = await sharp(DRY ? src : dst).metadata();

  before += srcBytes; after += dstBytes; count++;
  const pct = DRY ? '' : `${String(Math.round((1 - dstBytes / srcBytes) * 100)).padStart(3)}% smaller`;
  console.log(
    `${kb(srcBytes)}KB -> ${kb(dstBytes)}KB  ${pct}  ` +
    `${meta.width}x${meta.height} -> ${out.width}x${out.height}  ${path.basename(rule.file)}`
  );
}

console.log(
  `\n${count} images  ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(2)}MB  ` +
  `(${Math.round((1 - after / before) * 100)}% smaller)`
);
