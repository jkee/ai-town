#!/usr/bin/env node
/**
 * Generate extra tiles for the ultimate rave/circus festival map.
 * Adds to existing tileset.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const API_KEY = process.env.OPENROUTER_API_KEY || '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';
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
    console.error(`  No image for ${name}`, JSON.stringify(data.choices?.[0]?.message).substring(0, 200));
    return null;
  }

  const url = images[0]?.image_url?.url;
  const match = url?.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    console.error(`  Bad image format for ${name}`);
    return null;
  }

  const buf = Buffer.from(match[2], 'base64');
  const size = name.includes('2x') ? 64 : 32;
  const resized = await sharp(buf)
    .resize(size, size, { kernel: 'nearest' })
    .png()
    .toBuffer();

  const pngPath = path.join(OUT, `${name}.png`);
  fs.writeFileSync(pngPath, resized);
  console.log(`  Saved ${pngPath} (${size}x${size})`);

  // For object tiles, remove green background
  if (!['purple_glow', 'red_glow', 'yellow_glow', 'dance_floor_alt', 'water'].includes(name)) {
    const { data: pixels, info } = await sharp(resized).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const out = Buffer.from(pixels);
    for (let i = 0; i < out.length; i += 4) {
      const r = out[i], g = out[i+1], b = out[i+2];
      if (g > 150 && r < 120 && b < 120) {
        out[i+3] = 0; // transparent
      }
    }
    const cleaned = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png().toBuffer();
    fs.writeFileSync(pngPath, cleaned);
    console.log(`  Green removed for ${name}`);
  }

  return pngPath;
}

const STYLE = 'pixel art, 16-bit retro style, top-down RPG perspective, vibrant neon colors on dark background, high contrast';

const newTiles = [
  // Ground tiles we're missing
  { name: 'purple_glow', prompt: `Single 32x32 pixel tile: dark ground with bright purple/magenta neon glow effect, pulsing energy. ${STYLE}. Fill entire tile, seamless edges.` },
  { name: 'red_glow', prompt: `Single 32x32 pixel tile: dark ground with bright red/crimson neon glow, hot lava-like energy. ${STYLE}. Fill entire tile, seamless edges.` },
  { name: 'yellow_glow', prompt: `Single 32x32 pixel tile: dark ground with bright golden/yellow warm glow, like stage lighting on floor. ${STYLE}. Fill entire tile, seamless.` },
  { name: 'dance_floor_alt', prompt: `Single 32x32 pixel tile: neon dance floor with rainbow LED squares in 4x4 grid pattern, glowing cyan/pink/yellow/green. ${STYLE}. Fill entire tile.` },
  { name: 'water', prompt: `Single 32x32 pixel tile: dark water at night reflecting neon lights, pink and cyan reflections on black water surface. ${STYLE}. Fill entire tile, seamless.` },

  // New objects
  { name: 'bonfire', prompt: `Single 32x32 pixel sprite: burning bonfire/campfire seen from above, bright orange and yellow flames with sparks. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'laser', prompt: `Single 32x32 pixel sprite: laser light projector machine seen from above, shooting colorful beams (pink, cyan, green). Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'neon_sign', prompt: `Single 32x32 pixel sprite: small neon sign glowing hot pink, reads "RAVE" in pixel letters. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'porta_potty', prompt: `Single 32x32 pixel sprite: portable toilet/porta-potty seen from above, blue plastic box. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'strobe', prompt: `Single 32x32 pixel sprite: strobe light on a stand seen from above, bright white flash with rainbow ring. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'balloon_arch', prompt: `Single 32x32 pixel sprite: colorful balloon arch entrance piece seen from above, neon balloons (pink, cyan, yellow). Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: 'tent_small', prompt: `Single 32x32 pixel sprite: small vendor tent/booth seen from above, colorful striped canopy. Transparent background (pure green #00FF00). ${STYLE}.` },

  // New 2x2 structures
  { name: '2x_carousel', prompt: `Single 64x64 pixel sprite: merry-go-round carousel seen from above, circular with colorful horses, spinning platform with lights around edge, center pole. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_dj_booth', prompt: `Single 64x64 pixel sprite: DJ booth/turntable setup seen from above, mixing desk with two turntables, laptop, neon LED strips along edges, glowing cyan and pink. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_ferris_wheel', prompt: `Single 64x64 pixel sprite: small ferris wheel seen from above/slight angle, circular wheel with colorful gondolas/seats, neon lights along spokes. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_bar', prompt: `Single 64x64 pixel sprite: neon bar counter seen from above, L-shaped wooden counter with neon strip lights, bottles on shelves, bar stools. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_big_top', prompt: `Single 64x64 pixel sprite: big circus big-top tent seen from above, large red and yellow striped circular tent with center pole and flag. Transparent background (pure green #00FF00). ${STYLE}.` },
  { name: '2x_bouncy_castle', prompt: `Single 64x64 pixel sprite: inflatable bouncy castle seen from above, colorful (pink, blue, yellow), puffy walls and turrets. Transparent background (pure green #00FF00). ${STYLE}.` },
];

async function main() {
  for (const tile of newTiles) {
    const existing = path.join(OUT, `${tile.name}.png`);
    if (fs.existsSync(existing)) {
      console.log(`Skipping ${tile.name} (already exists)`);
      continue;
    }
    try {
      await generateTile(tile.prompt, tile.name);
      await new Promise(r => setTimeout(r, 2500));
    } catch (e) {
      console.error(`Failed ${tile.name}:`, e.message);
    }
  }
  console.log('\nDone generating extra tiles!');
}

main().catch(console.error);
