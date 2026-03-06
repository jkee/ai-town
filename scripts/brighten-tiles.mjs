#!/usr/bin/env node
/**
 * Brighten dark ground tiles so the map is actually readable.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'scripts', 'generated', 'tiles');

async function brighten(name, factor) {
  const p = path.join(OUT, `${name}.png`);
  if (!fs.existsSync(p)) { console.log(`Skip ${name}`); return; }

  const { data, info } = await sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const buf = Buffer.from(data);

  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i+3] === 0) continue; // skip transparent
    buf[i]   = Math.min(255, Math.round(buf[i] * factor));
    buf[i+1] = Math.min(255, Math.round(buf[i+1] * factor));
    buf[i+2] = Math.min(255, Math.round(buf[i+2] * factor));
  }

  const out = await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png().toBuffer();
  fs.writeFileSync(p, out);
  console.log(`Brightened ${name} x${factor}`);
}

async function tint(name, rMul, gMul, bMul) {
  const p = path.join(OUT, `${name}.png`);
  if (!fs.existsSync(p)) return;

  const { data, info } = await sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const buf = Buffer.from(data);

  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i+3] === 0) continue;
    buf[i]   = Math.min(255, Math.round(buf[i] * rMul));
    buf[i+1] = Math.min(255, Math.round(buf[i+1] * gMul));
    buf[i+2] = Math.min(255, Math.round(buf[i+2] * bMul));
  }

  const out = await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png().toBuffer();
  fs.writeFileSync(p, out);
  console.log(`Tinted ${name}`);
}

async function main() {
  // Brighten grass (make it visible dark green, not black)
  await brighten('grass_dark_1', 2.0);
  await brighten('grass_dark_2', 2.0);
  await brighten('grass_dark_3', 2.0);

  // Brighten paths
  await brighten('dirt_path', 2.2);
  await brighten('stone_floor', 1.8);

  // Make glow tiles more vivid
  await brighten('cyan_glow', 1.5);
  await brighten('purple_glow', 1.5);
  await brighten('red_glow', 1.5);
  await brighten('yellow_glow', 1.5);

  // Dance floors should pop
  await brighten('dance_floor', 1.3);
  await brighten('dance_floor_alt', 1.3);

  // Water should be visible
  await brighten('water', 1.4);

  // Brighten objects slightly so they stand out
  await brighten('bonfire', 1.3);
  await brighten('laser', 1.3);
  await brighten('strobe', 1.3);
  await brighten('neon_sign', 1.3);
  await brighten('disco_ball', 1.3);
  await brighten('mushroom_neon', 1.3);
  await brighten('balloon_arch', 1.2);

  // Brighten structures
  for (const name of ['2x_carousel', '2x_dj_booth', '2x_ferris_wheel', '2x_bar', '2x_big_top', '2x_bouncy_castle', '2x_circus_tent', '2x_stage']) {
    await brighten(name, 1.3);
  }

  console.log('\nDone! Now run compose-tileset.mjs or fix-green.mjs to rebuild tileset.');
}

main().catch(console.error);
