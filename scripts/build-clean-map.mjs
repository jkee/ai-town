#!/usr/bin/env node
/**
 * Build the ULTIMATE rave/circus festival map.
 * Tileset: 512x160, 16 cols x 5 rows, 32px tiles, 73 tiles
 */
import fs from 'fs';

// Tile indices from tile_mapping.json
const T = {
  // Ground
  GRASS1: 0, GRASS2: 1, GRASS3: 2,
  DIRT: 3, STONE: 4, DANCE: 5, CYAN: 6,
  PURPLE: 7, RED: 8, YELLOW: 9, DANCE2: 10, WATER: 11,

  // Objects (1x1)
  BARRIER: 12, HAY: 13, TRASH: 14, SPEAKER: 15,
  MUSHROOM: 16, DISCO: 17,
  BONFIRE: 18, LASER: 19, NEON_SIGN: 20, POTTY: 21,
  STROBE: 22, BALLOON: 23, TENT_S: 24,

  // 2x2 structures
  TENT_TL: 25, TENT_TR: 26, TENT_BL: 27, TENT_BR: 28,
  TRUCK_TL: 29, TRUCK_TR: 30, TRUCK_BL: 31, TRUCK_BR: 32,
  STAGE_TL: 33, STAGE_TR: 34, STAGE_BL: 35, STAGE_BR: 36,
  TREE_N_TL: 37, TREE_N_TR: 38, TREE_N_BL: 39, TREE_N_BR: 40,
  TREE_D_TL: 41, TREE_D_TR: 42, TREE_D_BL: 43, TREE_D_BR: 44,
  TREE_P_TL: 45, TREE_P_TR: 46, TREE_P_BL: 47, TREE_P_BR: 48,
  CAROUSEL_TL: 49, CAROUSEL_TR: 50, CAROUSEL_BL: 51, CAROUSEL_BR: 52,
  DJ_TL: 53, DJ_TR: 54, DJ_BL: 55, DJ_BR: 56,
  FERRIS_TL: 57, FERRIS_TR: 58, FERRIS_BL: 59, FERRIS_BR: 60,
  BAR_TL: 61, BAR_TR: 62, BAR_BL: 63, BAR_BR: 64,
  BIGTOP_TL: 65, BIGTOP_TR: 66, BIGTOP_BL: 67, BIGTOP_BR: 68,
  BOUNCY_TL: 69, BOUNCY_TR: 70, BOUNCY_BL: 71, BOUNCY_BR: 72,
};

const W = 48, H = 32;

const make = (d) => Array.from({ length: W }, () => Array(H).fill(d));
const set = (l, x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) l[x][y] = v; };
const fill = (l, x1, y1, x2, y2, v) => {
  for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) set(l, x, y, v);
};
const fillR = (l, x1, y1, x2, y2, vs) => {
  for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++)
    set(l, x, y, vs[Math.floor(Math.random() * vs.length)]);
};
const place2x2 = (l, x, y, tl, tr, bl, br) => {
  set(l, x, y, tl); set(l, x+1, y, tr);
  set(l, x, y+1, bl); set(l, x+1, y+1, br);
};
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ============================================================
// === BACKGROUND LAYER ===
// ============================================================
const bg = make(T.GRASS1);

// Base: dark grass with random variation
fillR(bg, 0, 0, W-1, H-1, [T.GRASS1, T.GRASS2, T.GRASS3, T.GRASS1, T.GRASS1, T.GRASS2]);

// ---- MAIN PATHS (dirt cross network) ----
// Main boulevard (horizontal, wider)
fill(bg, 0, 14, W-1, 16, T.DIRT);
// Vertical arteries
fill(bg, 10, 0, 11, H-1, T.DIRT);
fill(bg, 23, 0, 24, H-1, T.DIRT);
fill(bg, 36, 0, 37, H-1, T.DIRT);

// ---- MEGA DANCE FLOOR (center of the universe) ----
// Main dance floor - big and proud
fill(bg, 14, 18, 22, 25, T.DANCE);
// Alternate dance tiles for variety
for (let x = 14; x <= 22; x++) for (let y = 18; y <= 25; y++) {
  if ((x + y) % 3 === 0) set(bg, x, y, T.DANCE2);
}
// Purple neon border around dance floor
fill(bg, 13, 17, 23, 17, T.PURPLE);
fill(bg, 13, 26, 23, 26, T.PURPLE);
fill(bg, 13, 17, 13, 26, T.PURPLE);
fill(bg, 23, 17, 23, 26, T.PURPLE);
// Red hot corners
set(bg, 13, 17, T.RED); set(bg, 23, 17, T.RED);
set(bg, 13, 26, T.RED); set(bg, 23, 26, T.RED);

// ---- DJ ZONE (right of dance floor) ----
fill(bg, 26, 19, 31, 24, T.CYAN);
// Inner purple accent
fill(bg, 27, 20, 30, 23, T.PURPLE);

// ---- MAIN STAGE (top right) ----
fill(bg, 38, 2, 46, 10, T.STONE);
// Yellow stage lighting on floor
fill(bg, 39, 3, 45, 4, T.YELLOW);
fill(bg, 39, 9, 45, 9, T.YELLOW);

// ---- VIP ZONE (bottom left, exclusive!) ----
fill(bg, 1, 25, 9, 30, T.PURPLE);
fill(bg, 2, 26, 8, 29, T.RED);
fill(bg, 3, 27, 7, 28, T.PURPLE);

// ---- CIRCUS ZONE (top left) ----
fill(bg, 1, 1, 8, 12, T.STONE);

// ---- CHILL POND (bottom right) ----
fill(bg, 39, 25, 45, 29, T.WATER);
fill(bg, 40, 26, 44, 28, T.CYAN);

// ---- FOOD COURT (center top) ----
fill(bg, 14, 2, 21, 6, T.STONE);

// ---- NEON PATHS connecting areas ----
// Glow path to dance floor
fill(bg, 12, 18, 12, 25, T.CYAN);
// Glow path from DJ to stage
fill(bg, 32, 21, 35, 22, T.PURPLE);

// ============================================================
// === OBJECT LAYER ===
// ============================================================
const obj = make(-1);

// ---- BORDER TREES (thick forest border) ----
// Top border - dense tree line
for (let x = 0; x < W - 1; x += 2) {
  if ((x >= 10 && x <= 11) || (x >= 23 && x <= 24) || (x >= 36 && x <= 37)) continue;
  const trees = [
    [T.TREE_D_TL, T.TREE_D_TR, T.TREE_D_BL, T.TREE_D_BR],
    [T.TREE_N_TL, T.TREE_N_TR, T.TREE_N_BL, T.TREE_N_BR],
    [T.TREE_P_TL, T.TREE_P_TR, T.TREE_P_BL, T.TREE_P_BR],
  ];
  const t = rand(trees);
  place2x2(obj, x, 0, t[0], t[1], t[2], t[3]);
}

// Bottom border
for (let x = 0; x < W - 1; x += 2) {
  if ((x >= 10 && x <= 11) || (x >= 23 && x <= 24) || (x >= 36 && x <= 37)) continue;
  const t = rand([
    [T.TREE_D_TL, T.TREE_D_TR, T.TREE_D_BL, T.TREE_D_BR],
    [T.TREE_N_TL, T.TREE_N_TR, T.TREE_N_BL, T.TREE_N_BR],
    [T.TREE_P_TL, T.TREE_P_TR, T.TREE_P_BL, T.TREE_P_BR],
  ]);
  place2x2(obj, x, H - 2, t[0], t[1], t[2], t[3]);
}

// Left border
for (let y = 2; y < H - 2; y += 3) {
  if (y >= 14 && y <= 16) continue;
  place2x2(obj, 0, y, T.TREE_D_TL, T.TREE_D_TR, T.TREE_D_BL, T.TREE_D_BR);
}

// Right border
for (let y = 2; y < H - 2; y += 3) {
  if (y >= 14 && y <= 16) continue;
  if (y >= 2 && y <= 10) continue; // stage area
  place2x2(obj, W - 2, y, T.TREE_N_TL, T.TREE_N_TR, T.TREE_N_BL, T.TREE_N_BR);
}

// ---- CIRCUS ZONE (top left) ----
// Big top circus tent
place2x2(obj, 3, 3, T.BIGTOP_TL, T.BIGTOP_TR, T.BIGTOP_BL, T.BIGTOP_BR);
// Carousel!
place2x2(obj, 6, 3, T.CAROUSEL_TL, T.CAROUSEL_TR, T.CAROUSEL_BL, T.CAROUSEL_BR);
// Bouncy castle
place2x2(obj, 3, 6, T.BOUNCY_TL, T.BOUNCY_TR, T.BOUNCY_BL, T.BOUNCY_BR);
// Ferris wheel
place2x2(obj, 6, 6, T.FERRIS_TL, T.FERRIS_TR, T.FERRIS_BL, T.FERRIS_BR);
// Balloon arches at circus entrance
set(obj, 4, 9, T.BALLOON);
set(obj, 7, 9, T.BALLOON);
// Neon sign
set(obj, 5, 2, T.NEON_SIGN);
set(obj, 6, 2, T.NEON_SIGN);

// ---- FOOD COURT (center top) ----
place2x2(obj, 14, 3, T.TRUCK_TL, T.TRUCK_TR, T.TRUCK_BL, T.TRUCK_BR);
place2x2(obj, 17, 3, T.TRUCK_TL, T.TRUCK_TR, T.TRUCK_BL, T.TRUCK_BR);
place2x2(obj, 20, 3, T.TRUCK_TL, T.TRUCK_TR, T.TRUCK_BL, T.TRUCK_BR);
// Trash cans near food
set(obj, 16, 5, T.TRASH);
set(obj, 19, 5, T.TRASH);
// Hay bale seating
set(obj, 15, 6, T.HAY); set(obj, 16, 6, T.HAY); set(obj, 17, 6, T.HAY);
set(obj, 18, 6, T.HAY); set(obj, 19, 6, T.HAY); set(obj, 20, 6, T.HAY);

// ---- MAIN STAGE (top right) ----
place2x2(obj, 41, 4, T.STAGE_TL, T.STAGE_TR, T.STAGE_BL, T.STAGE_BR);
place2x2(obj, 43, 4, T.STAGE_TL, T.STAGE_TR, T.STAGE_BL, T.STAGE_BR);
// Massive speaker walls
set(obj, 38, 3, T.SPEAKER); set(obj, 38, 5, T.SPEAKER);
set(obj, 38, 7, T.SPEAKER); set(obj, 38, 9, T.SPEAKER);
set(obj, 46, 3, T.SPEAKER); set(obj, 46, 5, T.SPEAKER);
set(obj, 46, 7, T.SPEAKER); set(obj, 46, 9, T.SPEAKER);
// Front row speakers
set(obj, 39, 10, T.SPEAKER); set(obj, 42, 10, T.SPEAKER); set(obj, 45, 10, T.SPEAKER);
// Laser projectors on stage
set(obj, 40, 3, T.LASER); set(obj, 44, 3, T.LASER);
// Strobe lights
set(obj, 41, 3, T.STROBE); set(obj, 43, 3, T.STROBE);
// Stage barriers
for (let x = 38; x <= 46; x++) set(obj, x, 11, T.BARRIER);

// ---- MEGA DANCE FLOOR (center) ----
// Disco balls scattered on dance floor
set(obj, 16, 20, T.DISCO); set(obj, 20, 20, T.DISCO);
set(obj, 18, 23, T.DISCO);
// Strobe lights at edges
set(obj, 14, 18, T.STROBE); set(obj, 22, 18, T.STROBE);
set(obj, 14, 25, T.STROBE); set(obj, 22, 25, T.STROBE);
// Speaker wall along top of dance floor
for (let x = 15; x <= 21; x += 2) set(obj, x, 17, T.SPEAKER);
// Barriers at dance floor entrance
set(obj, 14, 17, T.BARRIER); set(obj, 22, 17, T.BARRIER);
set(obj, 14, 26, T.BARRIER); set(obj, 22, 26, T.BARRIER);
// Laser projectors
set(obj, 15, 19, T.LASER); set(obj, 21, 19, T.LASER);

// ---- DJ BOOTH (right of dance floor) ----
place2x2(obj, 28, 20, T.DJ_TL, T.DJ_TR, T.DJ_BL, T.DJ_BR);
// Speakers flanking DJ
set(obj, 27, 20, T.SPEAKER); set(obj, 30, 20, T.SPEAKER);
set(obj, 27, 22, T.SPEAKER); set(obj, 30, 22, T.SPEAKER);
// Disco ball above DJ
set(obj, 29, 19, T.DISCO);
// Laser show from DJ booth
set(obj, 28, 24, T.LASER); set(obj, 29, 24, T.LASER);

// ---- VIP ZONE (bottom left) ----
// VIP bar
place2x2(obj, 3, 26, T.BAR_TL, T.BAR_TR, T.BAR_BL, T.BAR_BR);
// VIP tent
place2x2(obj, 6, 26, T.TENT_TL, T.TENT_TR, T.TENT_BL, T.TENT_BR);
// VIP barriers (velvet rope style)
for (let y = 25; y <= 30; y++) set(obj, 1, y, T.BARRIER);
for (let y = 25; y <= 30; y++) set(obj, 9, y, T.BARRIER);
for (let x = 1; x <= 9; x++) set(obj, x, 25, T.BARRIER);
// Neon sign at VIP entrance
set(obj, 5, 25, T.NEON_SIGN);
// Bonfire in VIP
set(obj, 5, 29, T.BONFIRE);
// Mushrooms (VIP gets the good stuff)
set(obj, 8, 28, T.MUSHROOM); set(obj, 8, 29, T.MUSHROOM);

// ---- CHILL ZONE (bottom right) ----
// Neon mushroom garden
set(obj, 39, 26, T.MUSHROOM); set(obj, 41, 25, T.MUSHROOM);
set(obj, 43, 27, T.MUSHROOM); set(obj, 45, 26, T.MUSHROOM);
set(obj, 40, 28, T.MUSHROOM); set(obj, 44, 29, T.MUSHROOM);
// Bonfires by the pond
set(obj, 38, 25, T.BONFIRE); set(obj, 46, 25, T.BONFIRE);
// Pink trees around pond
place2x2(obj, 38, 28, T.TREE_P_TL, T.TREE_P_TR, T.TREE_P_BL, T.TREE_P_BR);
place2x2(obj, 44, 28, T.TREE_P_TL, T.TREE_P_TR, T.TREE_P_BL, T.TREE_P_BR);

// ---- SECONDARY ATTRACTIONS (scattered) ----
// Small vendor tents along main path
set(obj, 13, 13, T.TENT_S); set(obj, 16, 13, T.TENT_S);
set(obj, 19, 13, T.TENT_S); set(obj, 22, 13, T.TENT_S);

// Another small circus tent
place2x2(obj, 26, 8, T.TENT_TL, T.TENT_TR, T.TENT_BL, T.TENT_BR);

// Second bar area (near path intersection)
place2x2(obj, 26, 11, T.BAR_TL, T.BAR_TR, T.BAR_BL, T.BAR_BR);

// Hay bale seating areas
set(obj, 33, 8, T.HAY); set(obj, 34, 8, T.HAY);
set(obj, 33, 10, T.HAY); set(obj, 34, 10, T.HAY);

// Porta potties (gotta have 'em)
set(obj, 33, 3, T.POTTY); set(obj, 34, 3, T.POTTY);
set(obj, 33, 4, T.POTTY); set(obj, 34, 4, T.POTTY);

// Trash cans scattered
set(obj, 9, 13, T.TRASH); set(obj, 32, 16, T.TRASH);
set(obj, 12, 27, T.TRASH); set(obj, 35, 27, T.TRASH);

// Bonfires along paths
set(obj, 12, 10, T.BONFIRE); set(obj, 25, 8, T.BONFIRE);
set(obj, 36, 12, T.BONFIRE); set(obj, 12, 20, T.BONFIRE);

// Balloon arches at entrances
set(obj, 10, 14, T.BALLOON); set(obj, 11, 14, T.BALLOON);
set(obj, 23, 14, T.BALLOON); set(obj, 24, 14, T.BALLOON);
set(obj, 36, 14, T.BALLOON); set(obj, 37, 14, T.BALLOON);

// Neon trees scattered in open areas
place2x2(obj, 14, 8, T.TREE_N_TL, T.TREE_N_TR, T.TREE_N_BL, T.TREE_N_BR);
place2x2(obj, 30, 26, T.TREE_N_TL, T.TREE_N_TR, T.TREE_N_BL, T.TREE_N_BR);
place2x2(obj, 34, 18, T.TREE_P_TL, T.TREE_P_TR, T.TREE_P_BL, T.TREE_P_BR);

// Extra neon signs
set(obj, 15, 17, T.NEON_SIGN);
set(obj, 29, 19, T.NEON_SIGN);

// ============================================================
// === OUTPUT ===
// ============================================================
let out = `// ULTIMATE Festival/Rave/Circus map
export const tilesetpath = "/ai-town/assets/festival-tileset.png"
export const tiledim = 32
export const screenxtiles = ${W}
export const screenytiles = ${H}
export const tilesetpxw = 512
export const tilesetpxh = 160

export const bgtiles = [
   [
`;
for (let x = 0; x < W; x++) out += '[ ' + bg[x].join(' , ') + ' , ],\n';
out += '],];\n\nexport const objmap = [\n   [\n';
for (let x = 0; x < W; x++) out += '[ ' + obj[x].join(' , ') + ' , ],\n';
out += `],];

export const animatedsprites = [];
export const mapwidth = bgtiles[0].length;
export const mapheight = bgtiles[0][0].length;
`;

fs.writeFileSync('data/festival.js', out);
console.log('Map written to data/festival.js');
console.log(`Size: ${W}x${H}, Tileset: 512x160`);
