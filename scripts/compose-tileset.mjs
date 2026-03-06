#!/usr/bin/env node
/**
 * Compose all tiles (original + new) into one tileset PNG.
 * Also splits 2x2 tiles into quadrants.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'scripts', 'generated', 'tiles');
const COLS = 16;
const tileSize = 32;

// Define tile order - this determines tile indices
const singleTiles = [
  // Original ground tiles
  'grass_dark_1', 'grass_dark_2', 'grass_dark_3',
  'dirt_path', 'stone_floor', 'dance_floor', 'cyan_glow',
  // New ground tiles
  'purple_glow', 'red_glow', 'yellow_glow', 'dance_floor_alt', 'water',
  // Original objects
  'barrier', 'hay_bale', 'trash_can', 'speaker',
  'mushroom_neon', 'disco_ball',
  // New objects
  'bonfire', 'laser', 'neon_sign', 'porta_potty',
  'strobe', 'balloon_arch', 'tent_small',
];

const bigTiles = [
  // Original 2x2
  '2x_circus_tent', '2x_food_truck', '2x_stage',
  '2x_tree_neon', '2x_tree_dark', '2x_tree_pink',
  // New 2x2
  '2x_carousel', '2x_dj_booth', '2x_ferris_wheel',
  '2x_bar', '2x_big_top', '2x_bouncy_castle',
];

async function main() {
  const composites = [];
  let idx = 0;
  const mapping = {};

  // Add single tiles
  for (const name of singleTiles) {
    const pngPath = path.join(OUT, `${name}.png`);
    if (!fs.existsSync(pngPath)) {
      console.warn(`Missing: ${name}, using placeholder`);
      // Create a dark placeholder
      const placeholder = await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 20, g: 10, b: 30, alpha: 255 } },
      }).png().toBuffer();
      fs.writeFileSync(pngPath, placeholder);
    }
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    composites.push({ input: pngPath, left: col * tileSize, top: row * tileSize });
    mapping[name] = idx;
    console.log(`[${idx}] (${col},${row}) = ${name}`);
    idx++;
  }

  // Add 2x2 tiles split into quadrants
  for (const name of bigTiles) {
    const pngPath = path.join(OUT, `${name}.png`);
    if (!fs.existsSync(pngPath)) {
      console.warn(`Missing 2x: ${name}, skipping`);
      continue;
    }

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
      mapping[`${name}_${quadrants[q]}`] = idx;
      console.log(`[${idx}] (${col},${row}) = ${name}_${quadrants[q]}`);
      idx++;
    }
  }

  // Create tileset
  const totalRows = Math.ceil(idx / COLS);
  const width = COLS * tileSize;
  const height = totalRows * tileSize;

  const tileset = sharp({
    create: { width, height, channels: 4, background: { r: 10, g: 10, b: 20, alpha: 255 } },
  }).composite(composites).png();

  const outPath = path.join(process.cwd(), 'public', 'assets', 'festival-tileset.png');
  await tileset.toFile(outPath);
  console.log(`\nTileset: ${outPath} (${width}x${height}, ${idx} tiles, ${totalRows} rows)`);

  // Save mapping
  const mapPath = path.join(OUT, 'tile_mapping.json');
  fs.writeFileSync(mapPath, JSON.stringify(mapping, null, 2));
  console.log(`Mapping: ${mapPath}`);
  console.log(`\nTileset dimensions for map script: tilesetpxw=${width}, tilesetpxh=${height}`);
}

main().catch(console.error);
