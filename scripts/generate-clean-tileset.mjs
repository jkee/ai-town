#!/usr/bin/env node
/**
 * Generate individual tiles for a festival/rave tileset using Gemini,
 * then compose them into a clean 32px-grid-aligned tileset.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) { console.error('Set OPENROUTER_API_KEY env var'); process.exit(1); }
const MODEL = 'google/gemini-3-pro-image-preview';
const OUT = path.join(process.cwd(), 'scripts', 'generated', 'tiles');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function generateTile(prompt, name) {
  console.log(`Generating: ${name}...`);
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    }),
  });

  const data = await resp.json();
  const images = data.choices?.[0]?.message?.images || [];

  if (images.length === 0) {
    console.error(`  No image for ${name}`);
    return null;
  }

  const url = images[0]?.image_url?.url;
  const match = url?.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    console.error(`  Bad image format for ${name}`);
    return null;
  }

  const buf = Buffer.from(match[2], 'base64');
  const outPath = path.join(OUT, `${name}.${match[1]}`);
  fs.writeFileSync(outPath, buf);

  // Resize to exact 32x32 (or 64x64 for 2x2 tiles)
  const size = name.includes('2x') ? 64 : 32;
  const resized = await sharp(buf)
    .resize(size, size, { kernel: 'nearest' })
    .png()
    .toBuffer();

  const pngPath = path.join(OUT, `${name}.png`);
  fs.writeFileSync(pngPath, resized);
  console.log(`  Saved ${pngPath} (${size}x${size})`);
  return pngPath;
}

const STYLE = 'pixel art, 16-bit style, top-down RPG perspective, dark night-time palette';

const tiles = [
  // Ground tiles
  { name: 'grass_dark_1', prompt: `Single 32x32 pixel tile: dark teal-green grass at night with tiny star sparkles. ${STYLE}. Fill entire tile.` },
  { name: 'grass_dark_2', prompt: `Single 32x32 pixel tile: dark green grass at night, slightly different from variant 1, subtle texture. ${STYLE}. Fill entire tile.` },
  { name: 'grass_dark_3', prompt: `Single 32x32 pixel tile: very dark grass with tiny cyan sparkle dots scattered. ${STYLE}. Fill entire tile.` },
  { name: 'dirt_path', prompt: `Single 32x32 pixel tile: dark brown/gray dirt path at night. Worn ground texture. ${STYLE}. Fill entire tile, seamless.` },
  { name: 'stone_floor', prompt: `Single 32x32 pixel tile: gray cobblestone floor, festival ground. ${STYLE}. Fill entire tile, seamless.` },
  { name: 'dance_floor', prompt: `Single 32x32 pixel tile: neon checkered dance floor, alternating hot pink and black squares in a 4x4 pattern. ${STYLE}. Fill entire tile.` },
  { name: 'purple_glow', prompt: `Single 32x32 pixel tile: dark ground with bright purple/magenta neon glow effect. ${STYLE}. Fill entire tile.` },
  { name: 'cyan_glow', prompt: `Single 32x32 pixel tile: dark ground with bright cyan/turquoise neon glow. ${STYLE}. Fill entire tile.` },

  // Objects (will be placed on object layer with transparent bg)
  { name: 'barrier', prompt: `Single 32x32 pixel sprite: metal crowd control barrier/barricade seen from top-down. Silver metal. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'hay_bale', prompt: `Single 32x32 pixel sprite: golden hay bale seen from above. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'trash_can', prompt: `Single 32x32 pixel sprite: gray metal trash can seen from above. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'speaker', prompt: `Single 32x32 pixel sprite: large black speaker/amplifier stack seen from above. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'keg', prompt: `Single 32x32 pixel sprite: metal beer keg seen from above, round barrel. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'barrel', prompt: `Single 32x32 pixel sprite: wooden barrel with drinks seen from above. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'mushroom_neon', prompt: `Single 32x32 pixel sprite: glowing neon mushroom (pink/cyan) fantasy style. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'disco_ball', prompt: `Single 32x32 pixel sprite: small disco ball seen from above, mirrored facets reflecting rainbow colors. Transparent background (pure green #00FF00). ${STYLE}.` },

  // 2x2 structures (64x64, will be split into 4 tiles)
  { name: '2x_circus_tent', prompt: `Single 64x64 pixel sprite: circus tent top seen from above, red and white striped, with pointed top center. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_food_truck', prompt: `Single 64x64 pixel sprite: food truck seen from above, white body with red/white striped awning. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_stage', prompt: `Single 64x64 pixel sprite: small festival stage platform seen from above, dark wood with lights along the edge. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_tree_neon', prompt: `Single 64x64 pixel sprite: tree from above at night, leaves glowing neon green/cyan from uplighting below. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_tree_dark', prompt: `Single 64x64 pixel sprite: dark tree from above at night, deep green/teal leaves barely visible. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_tree_pink', prompt: `Single 64x64 pixel sprite: tree from above at night, leaves glowing hot pink from uplighting. Transparent background (pure green #00FF00). ${STYLE}.` },
];

async function main() {
  const results = {};

  for (const tile of tiles) {
    try {
      const p = await generateTile(tile.prompt, tile.name);
      results[tile.name] = p;
      // Rate limit - don't hammer the API
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`Failed ${tile.name}:`, e.message);
    }
  }

  console.log('\n=== Composing tileset ===');

  // Compose all tiles into a single tileset image
  // Layout: 16 cols x 16 rows = 512x512
  const COLS = 16;
  const tileSize = 32;
  const composites = [];
  let idx = 0;

  // First add all single tiles
  const singleTiles = tiles.filter(t => !t.name.startsWith('2x_'));
  for (const tile of singleTiles) {
    const pngPath = path.join(OUT, `${tile.name}.png`);
    if (fs.existsSync(pngPath)) {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      composites.push({
        input: pngPath,
        left: col * tileSize,
        top: row * tileSize,
      });
      console.log(`  [${idx}] (${col},${row}) = ${tile.name}`);
      idx++;
    }
  }

  // Then add 2x2 tiles (split into 4 quadrants each)
  const bigTiles = tiles.filter(t => t.name.startsWith('2x_'));
  for (const tile of bigTiles) {
    const pngPath = path.join(OUT, `${tile.name}.png`);
    if (!fs.existsSync(pngPath)) continue;

    const img = sharp(pngPath);
    // Split 64x64 into 4x 32x32
    const quadrants = ['TL', 'TR', 'BL', 'BR'];
    const offsets = [[0,0], [32,0], [0,32], [32,32]];

    for (let q = 0; q < 4; q++) {
      const qBuf = await sharp(pngPath)
        .extract({ left: offsets[q][0], top: offsets[q][1], width: 32, height: 32 })
        .png()
        .toBuffer();

      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const qPath = path.join(OUT, `${tile.name}_${quadrants[q]}.png`);
      fs.writeFileSync(qPath, qBuf);
      composites.push({
        input: qPath,
        left: col * tileSize,
        top: row * tileSize,
      });
      console.log(`  [${idx}] (${col},${row}) = ${tile.name}_${quadrants[q]}`);
      idx++;
    }
  }

  // Create the tileset
  const totalRows = Math.ceil(idx / COLS);
  const width = COLS * tileSize;
  const height = totalRows * tileSize;

  const tileset = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 10, g: 15, b: 10, alpha: 255 },
    },
  }).composite(composites).png();

  const outPath = path.join(process.cwd(), 'public', 'assets', 'festival-tileset.png');
  await tileset.toFile(outPath);
  console.log(`\nTileset saved: ${outPath} (${width}x${height}, ${idx} tiles)`);

  // Save tile index mapping
  const mapping = {};
  idx = 0;
  for (const tile of singleTiles) {
    if (fs.existsSync(path.join(OUT, `${tile.name}.png`))) {
      mapping[tile.name] = idx++;
    }
  }
  for (const tile of bigTiles) {
    if (fs.existsSync(path.join(OUT, `${tile.name}.png`))) {
      mapping[`${tile.name}_TL`] = idx++;
      mapping[`${tile.name}_TR`] = idx++;
      mapping[`${tile.name}_BL`] = idx++;
      mapping[`${tile.name}_BR`] = idx++;
    }
  }

  const mapPath = path.join(OUT, 'tile_mapping.json');
  fs.writeFileSync(mapPath, JSON.stringify(mapping, null, 2));
  console.log(`Mapping saved: ${mapPath}`);
}

main().catch(console.error);
