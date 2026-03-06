#!/usr/bin/env node
/**
 * Aggressive green background removal from all object/structure tiles,
 * then recompose the tileset.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'scripts', 'generated', 'tiles');

// Ground tiles that should NOT have green removed (they fill the whole tile)
const groundTiles = new Set([
  'grass_dark_1', 'grass_dark_2', 'grass_dark_3',
  'dirt_path', 'stone_floor', 'dance_floor', 'cyan_glow',
  'purple_glow', 'red_glow', 'yellow_glow', 'dance_floor_alt', 'water',
]);

// All object/structure tiles that need green removal
const objectTiles = [
  'barrier', 'hay_bale', 'trash_can', 'speaker',
  'mushroom_neon', 'disco_ball',
  'bonfire', 'laser', 'neon_sign', 'porta_potty',
  'strobe', 'balloon_arch', 'tent_small',
  '2x_circus_tent', '2x_food_truck', '2x_stage',
  '2x_tree_neon', '2x_tree_dark', '2x_tree_pink',
  '2x_carousel', '2x_dj_booth', '2x_ferris_wheel',
  '2x_bar', '2x_big_top', '2x_bouncy_castle',
];

async function removeGreen(filePath) {
  if (!fs.existsSync(filePath)) return;

  const img = sharp(filePath);
  const { data: pixels, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(pixels);
  let removed = 0;

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2];

    // Aggressive green detection:
    // 1. Pure green background (#00FF00 and close variants)
    if (g > 120 && r < 140 && b < 140 && g > r * 1.2 && g > b * 1.2) {
      out[i] = 0; out[i+1] = 0; out[i+2] = 0; out[i+3] = 0;
      removed++;
      continue;
    }

    // 2. Bright green (wider range)
    if (g > 180 && r < 100 && b < 100) {
      out[i] = 0; out[i+1] = 0; out[i+2] = 0; out[i+3] = 0;
      removed++;
      continue;
    }

    // 3. Green-ish halo pixels (semi-green edges)
    if (g > 100 && g > r + 30 && g > b + 30 && r < 120 && b < 120) {
      out[i+3] = 0;
      removed++;
      continue;
    }
  }

  const cleaned = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toBuffer();

  fs.writeFileSync(filePath, cleaned);
  const pct = ((removed / (out.length / 4)) * 100).toFixed(1);
  if (removed > 0) console.log(`  ${path.basename(filePath)}: removed ${removed} green pixels (${pct}%)`);
}

async function main() {
  console.log('=== Aggressive green removal ===\n');

  for (const name of objectTiles) {
    const pngPath = path.join(OUT, `${name}.png`);
    await removeGreen(pngPath);
  }

  console.log('\n=== Recomposing tileset ===\n');

  // Now recompose using compose-tileset logic
  const COLS = 16;
  const tileSize = 32;

  const singleTiles = [
    'grass_dark_1', 'grass_dark_2', 'grass_dark_3',
    'dirt_path', 'stone_floor', 'dance_floor', 'cyan_glow',
    'purple_glow', 'red_glow', 'yellow_glow', 'dance_floor_alt', 'water',
    'barrier', 'hay_bale', 'trash_can', 'speaker',
    'mushroom_neon', 'disco_ball',
    'bonfire', 'laser', 'neon_sign', 'porta_potty',
    'strobe', 'balloon_arch', 'tent_small',
  ];

  const bigTiles = [
    '2x_circus_tent', '2x_food_truck', '2x_stage',
    '2x_tree_neon', '2x_tree_dark', '2x_tree_pink',
    '2x_carousel', '2x_dj_booth', '2x_ferris_wheel',
    '2x_bar', '2x_big_top', '2x_bouncy_castle',
  ];

  const composites = [];
  let idx = 0;

  for (const name of singleTiles) {
    const pngPath = path.join(OUT, `${name}.png`);
    if (!fs.existsSync(pngPath)) continue;
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    composites.push({ input: pngPath, left: col * tileSize, top: row * tileSize });
    idx++;
  }

  for (const name of bigTiles) {
    const pngPath = path.join(OUT, `${name}.png`);
    if (!fs.existsSync(pngPath)) continue;

    const quadrants = ['TL', 'TR', 'BL', 'BR'];
    const offsets = [[0,0], [32,0], [0,32], [32,32]];

    for (let q = 0; q < 4; q++) {
      const qBuf = await sharp(pngPath)
        .extract({ left: offsets[q][0], top: offsets[q][1], width: 32, height: 32 })
        .png()
        .toBuffer();

      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const qPath = path.join(OUT, `${name}_${quadrants[q]}.png`);
      fs.writeFileSync(qPath, qBuf);
      composites.push({ input: qPath, left: col * tileSize, top: row * tileSize });
      idx++;
    }
  }

  const totalRows = Math.ceil(idx / COLS);
  const width = COLS * tileSize;
  const height = totalRows * tileSize;

  // Use dark background instead of green for empty tileset space
  const tileset = sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites).png();

  const outPath = path.join(process.cwd(), 'public', 'assets', 'festival-tileset.png');
  await tileset.toFile(outPath);
  console.log(`Tileset: ${outPath} (${width}x${height}, ${idx} tiles)`);
}

main().catch(console.error);
