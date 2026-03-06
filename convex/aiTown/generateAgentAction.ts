import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { chatCompletion, getLLMConfig, retryWithBackoff } from '../util/llm';
import { internal } from '../_generated/api';
import { decode as decodePng, encode as encodePng } from 'fast-png';
import jpeg from 'jpeg-js';

const IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

export const generateAgent = internalAction({
  args: {
    worldId: v.id('worlds'),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const systemPrompt = `Ты — генератор персонажей для БЛЯДСКОГО ЦИРКА. Это виртуальный цирк с безумными, развратными, пьяными и абсурдными персонажами.

Пользователь даст тебе краткое описание персонажа. Ты должен сгенерировать полную карточку персонажа в формате JSON.

Ответь ТОЛЬКО валидным JSON объектом без markdown, без комментариев:
{
  "name": "Кличка персонажа (2-3 слова, ярко и смешно)",
  "identity": "Подробное описание личности, привычек, манеры речи. 2-4 предложения. Должно быть смешно, абсурдно и в духе цирка.",
  "plan": "Что этот персонаж хочет делать в цирке. Начни с 'Ты хочешь...'. 1 предложение.",
  "portraitPrompt": "Short English description of the character's appearance for image generation. Circus style, colorful, expressive. 1-2 sentences."
}`;

    const { content } = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: args.prompt },
      ],
      temperature: 0.9,
      max_tokens: 500,
    });

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error(`Failed to parse LLM response: ${content}`);
    }

    const { name, identity, plan, portraitPrompt } = parsed;
    if (!name || !identity || !plan) {
      throw new Error(`Incomplete agent data: ${JSON.stringify(parsed)}`);
    }

    const portraitDesc = portraitPrompt || `A circus character named ${name}`;

    // Generate portrait and spritesheet in parallel
    const [portraitResult, spriteResult] = await Promise.allSettled([
      generatePortrait(ctx, portraitDesc),
      generateSpriteSheetFromPixelArt(ctx, portraitDesc),
    ]);

    const portraitStorageId = portraitResult.status === 'fulfilled' ? portraitResult.value : undefined;
    if (portraitResult.status === 'rejected') {
      console.error('Portrait generation failed:', portraitResult.reason);
    }

    // Spritesheet is required — no fallback to hardcoded sprites
    if (spriteResult.status === 'rejected') {
      console.error('Spritesheet generation failed:', spriteResult.reason);
      throw new Error(`Spritesheet generation failed: ${spriteResult.reason}`);
    }
    const spriteSheetStorageId = spriteResult.value;

    await ctx.runMutation(internal.aiTown.generateAgent.createGeneratedAgent, {
      worldId: args.worldId,
      name,
      character: 'generated',
      identity,
      plan,
      portraitStorageId,
      spriteSheetStorageId,
    });

    return { name, character: 'generated' };
  },
});

// Generate sprites for a pre-defined character (used by init for default agents)
export const generateDefaultAgent = internalAction({
  args: {
    worldId: v.id('worlds'),
    name: v.string(),
    identity: v.string(),
    plan: v.string(),
    portraitPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Generating sprites for default agent: ${args.name}`);

    const [portraitResult, spriteResult] = await Promise.allSettled([
      generatePortrait(ctx, args.portraitPrompt),
      generateSpriteSheetFromPixelArt(ctx, args.portraitPrompt),
    ]);

    const portraitStorageId = portraitResult.status === 'fulfilled' ? portraitResult.value : undefined;
    if (portraitResult.status === 'rejected') {
      console.error(`Portrait failed for ${args.name}:`, portraitResult.reason);
    }

    if (spriteResult.status === 'rejected') {
      console.error(`Spritesheet failed for ${args.name}:`, spriteResult.reason);
      throw new Error(`Spritesheet generation failed for ${args.name}: ${spriteResult.reason}`);
    }

    await ctx.runMutation(internal.aiTown.generateAgent.createGeneratedAgent, {
      worldId: args.worldId,
      name: args.name,
      character: 'generated',
      identity: args.identity,
      plan: args.plan,
      portraitStorageId,
      spriteSheetStorageId: spriteResult.value,
    });

    console.log(`Default agent ${args.name} created with generated sprites`);
    return { name: args.name };
  },
});

// ─── Image generation helpers ───

interface ImageData {
  base64: string;
  mimeType: string;
}

async function generateImageWithMeta(apiKey: string, prompt: string): Promise<ImageData> {
  const { result } = await retryWithBackoff(async () => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw {
        retry: response.status === 429 || response.status >= 500,
        error: new Error(`Image gen failed (${response.status}): ${error}`),
      };
    }
    return await response.json();
  });

  const extracted = extractBase64ImageWithType(result);
  if (!extracted.base64) {
    throw new Error('No image in response');
  }
  return extracted as ImageData;
}

function extractBase64ImageWithType(result: any): { base64?: string; mimeType: string } {
  const message = result.choices?.[0]?.message;
  if (message?.images?.length > 0) {
    for (const img of message.images) {
      const url = img.image_url?.url || img.url;
      if (url?.startsWith('data:')) {
        const [header, data] = url.split(',');
        const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/png';
        return { base64: data, mimeType };
      }
    }
  }
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part.type === 'image_url') {
        const url = part.image_url?.url;
        if (url?.startsWith('data:')) {
          const [header, data] = url.split(',');
          const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/png';
          return { base64: data, mimeType };
        }
      }
    }
  }
  return { base64: undefined, mimeType: 'image/png' };
}

interface RawImage {
  width: number;
  height: number;
  data: Uint8Array;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Decode image bytes (JPEG or PNG) into RGBA pixel buffer */
function decodeImage(bytes: Uint8Array, mimeType: string): RawImage {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    const decoded = jpeg.decode(bytes, { useTArray: true });
    return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) };
  }
  const png = decodePng(bytes);
  if (png.channels === 4) {
    return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  }
  // Convert RGB to RGBA
  const rgba = new Uint8Array(png.width * png.height * 4);
  for (let i = 0; i < png.width * png.height; i++) {
    rgba[i * 4] = png.data[i * 3];
    rgba[i * 4 + 1] = png.data[i * 3 + 1];
    rgba[i * 4 + 2] = png.data[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  return { width: png.width, height: png.height, data: rgba };
}

// ─── Portrait generation ───

async function generatePortrait(ctx: any, description: string): Promise<string> {
  const config = getLLMConfig();
  const prompt = `A portrait of a circus character: ${description}. Style: colorful digital art, expressive face, circus/carnival atmosphere, dramatic lighting. Square format, bust shot.`;
  const { base64 } = await generateImageWithMeta(config.apiKey!, prompt);
  const binaryData = base64ToUint8Array(base64);
  const blob = new Blob([binaryData], { type: 'image/png' });
  return await ctx.storage.store(blob);
}

// ─── Spritesheet generation ───

async function generateSpriteSheetFromPixelArt(ctx: any, description: string): Promise<string> {
  const config = getLLMConfig();

  // Ask the model to generate a complete RPG sprite sheet
  const prompt = `Create a pixel art RPG character sprite sheet.

CRITICAL LAYOUT: The image must contain EXACTLY 3 columns and 4 rows of sprites = 12 frames total. NOT more, NOT less.

Background: solid bright green #00FF00 everywhere.

Grid layout (3 wide × 4 tall):
  Col1        Col2        Col3
Row1: walk-left   stand      walk-right   (facing DOWN/toward viewer)
Row2: walk-left   stand      walk-right   (facing LEFT)
Row3: walk-left   stand      walk-right   (facing RIGHT)
Row4: walk-left   stand      walk-right   (facing UP/away from viewer)

Rules:
- ONLY 3 columns, ONLY 4 rows. Do NOT add extra frames.
- 16-bit pixel art, retro SNES RPG style (Final Fantasy, Chrono Trigger)
- Chibi proportions (big head, small body), ~32px per frame
- Each frame SAME size, evenly spaced in a clean grid with green gaps between them
- Bright saturated colors, solid green (#00FF00) background, NO gradients
- Same character in all 12 frames (consistent outfit, colors, proportions)
- NO text, NO labels, NO borders, NO extra decoration

Character: ${description}

Output: ONE image with the 3×4 sprite grid on solid green.`;

  const { base64, mimeType } = await generateImageWithMeta(config.apiKey!, prompt);
  const binaryData = base64ToUint8Array(base64);
  const source = decodeImage(binaryData, mimeType);

  // Detect background color from edges, but prefer green since we ask for #00FF00
  let bg = detectBackgroundColor(source);
  // If detected color is even remotely greenish, use pure green
  if (bg.g > bg.r && bg.g > bg.b) {
    bg = { r: 0, g: 255, b: 0 };
  }

  // Extract the 12 frames from the generated grid
  const frames = extractGridFrames(source, 3, 4, bg);

  // Build the final 96×128 spritesheet (3 cols × 4 rows of 32×32)
  const sheetData = new Uint8Array(96 * 128 * 4);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      // Fix frames that contain duplicate sprites side-by-side
      const frame = fixDuplicateFrame(frames[row * 3 + col], bg);
      // Resize each frame to 32×32
      const resized = resizeNearestNeighbor(frame, 32, 32);
      // Remove background
      const clean = removeBackground(resized, 32, 32, bg);
      blitFrame(sheetData, 96, clean, col * 32, row * 32, 32, 32);
    }
  }

  const pngBytes = encodePng({ width: 96, height: 128, data: sheetData, channels: 4, depth: 8 });
  const blob = new Blob([pngBytes], { type: 'image/png' });
  return await ctx.storage.store(blob);
}

/** Find runs of "gap" (mostly background) in a 1D density array */
function findGaps(density: Float64Array, length: number, minGap: number): number[] {
  // A column/row is a "gap" if density is below 5% of the max density
  const maxDensity = Math.max(...density);
  if (maxDensity === 0) return [];
  const gapThreshold = maxDensity * 0.05;

  const gaps: { start: number; end: number }[] = [];
  let inGap = false;
  let gapStart = 0;
  for (let i = 0; i < length; i++) {
    if (density[i] <= gapThreshold) {
      if (!inGap) { inGap = true; gapStart = i; }
    } else {
      if (inGap) {
        if (i - gapStart >= minGap) gaps.push({ start: gapStart, end: i });
        inGap = false;
      }
    }
  }
  if (inGap && length - gapStart >= minGap) gaps.push({ start: gapStart, end: length });

  // Return midpoints of each gap as cell boundaries
  return gaps.map((g) => Math.floor((g.start + g.end) / 2));
}

/** Extract frames from a generated grid image by detecting actual grid gaps */
function extractGridFrames(source: RawImage, cols: number, rows: number, bg: BgColor): RawImage[] {
  const { width, height, data } = source;
  const threshold = 80;

  // Step 1: Find bounding box of all non-bg content (excludes green borders)
  let bMinX = width, bMinY = height, bMaxX = 0, bMaxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dist = colorDistance(data[idx], data[idx + 1], data[idx + 2], bg.r, bg.g, bg.b);
      if (dist >= threshold) {
        if (x < bMinX) bMinX = x;
        if (x > bMaxX) bMaxX = x;
        if (y < bMinY) bMinY = y;
        if (y > bMaxY) bMaxY = y;
      }
    }
  }

  if (bMaxX <= bMinX || bMaxY <= bMinY) {
    console.log('No content found, falling back to even division');
    return evenlyDivideGrid(source, cols, rows);
  }

  const contentW = bMaxX - bMinX + 1;
  const contentH = bMaxY - bMinY + 1;

  // Step 2: Count non-bg pixels per column/row WITHIN the content bounding box
  const colDensity = new Float64Array(contentW);
  const rowDensity = new Float64Array(contentH);
  for (let y = 0; y < contentH; y++) {
    for (let x = 0; x < contentW; x++) {
      const idx = ((bMinY + y) * width + (bMinX + x)) * 4;
      const dist = colorDistance(data[idx], data[idx + 1], data[idx + 2], bg.r, bg.g, bg.b);
      if (dist >= threshold) {
        colDensity[x]++;
        rowDensity[y]++;
      }
    }
  }

  // Step 3: Find vertical and horizontal gaps within content area
  const minGap = Math.max(2, Math.floor(Math.min(contentW, contentH) / 50));
  const vGaps = findGaps(colDensity, contentW, minGap);
  const hGaps = findGaps(rowDensity, contentH, minGap);

  // Boundaries in content-relative coords, then offset to image coords
  const colBounds = [bMinX, ...vGaps.map((g) => bMinX + g), bMaxX + 1];
  const rowBounds = [bMinY, ...hGaps.map((g) => bMinY + g), bMaxY + 1];

  const detectedCols = colBounds.length - 1;
  const detectedRows = rowBounds.length - 1;
  console.log(`Grid detection: ${detectedCols}×${detectedRows} (expected ${cols}×${rows}) in ${width}×${height} image, content box: ${contentW}×${contentH}`);

  // Step 4: Extract detected cells
  const extractCells = (cBounds: number[], rBounds: number[], nCols: number) => {
    const cells: RawImage[] = [];
    for (let r = 0; r < rBounds.length - 1; r++) {
      for (let c = 0; c < cBounds.length - 1; c++) {
        const x0 = cBounds[c], x1 = cBounds[c + 1];
        const y0 = rBounds[r], y1 = rBounds[r + 1];
        const cellW = x1 - x0, cellH = y1 - y0;
        if (cellW < 4 || cellH < 4) continue;
        const frameData = new Uint8Array(cellW * cellH * 4);
        for (let y = 0; y < cellH; y++) {
          for (let x = 0; x < cellW; x++) {
            const srcIdx = ((y0 + y) * width + (x0 + x)) * 4;
            const dstIdx = (y * cellW + x) * 4;
            frameData[dstIdx] = data[srcIdx];
            frameData[dstIdx + 1] = data[srcIdx + 1];
            frameData[dstIdx + 2] = data[srcIdx + 2];
            frameData[dstIdx + 3] = data[srcIdx + 3];
          }
        }
        cells.push({ width: cellW, height: cellH, data: frameData });
      }
    }
    return cells;
  };

  const allCells = extractCells(colBounds, rowBounds, detectedCols);
  const needed = cols * rows; // 12

  if (allCells.length === needed) {
    return allCells;
  }

  if (allCells.length > needed) {
    // Pick first `rows` rows × first `cols` cols from the detected grid
    const frames: RawImage[] = [];
    for (let r = 0; r < Math.min(rows, detectedRows); r++) {
      for (let c = 0; c < Math.min(cols, detectedCols); c++) {
        frames.push(allCells[r * detectedCols + c]);
      }
    }
    while (frames.length < needed) {
      frames.push(frames[frames.length - 1]);
    }
    return frames.slice(0, needed);
  }

  // Fewer cells than needed — evenly divide the content bounding box
  console.log(`Only ${allCells.length} cells detected, falling back to even division of content box`);
  const cellW = Math.floor(contentW / cols);
  const cellH = Math.floor(contentH / rows);
  const frames: RawImage[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frameData = new Uint8Array(cellW * cellH * 4);
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const srcIdx = ((bMinY + row * cellH + y) * width + (bMinX + col * cellW + x)) * 4;
          const dstIdx = (y * cellW + x) * 4;
          frameData[dstIdx] = data[srcIdx];
          frameData[dstIdx + 1] = data[srcIdx + 1];
          frameData[dstIdx + 2] = data[srcIdx + 2];
          frameData[dstIdx + 3] = data[srcIdx + 3];
        }
      }
      frames.push({ width: cellW, height: cellH, data: frameData });
    }
  }
  return frames;
}

function evenlyDivideGrid(source: RawImage, cols: number, rows: number): RawImage[] {
  const cellW = Math.floor(source.width / cols);
  const cellH = Math.floor(source.height / rows);
  const frames: RawImage[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frameData = new Uint8Array(cellW * cellH * 4);
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const srcIdx = ((row * cellH + y) * source.width + (col * cellW + x)) * 4;
          const dstIdx = (y * cellW + x) * 4;
          frameData[dstIdx] = source.data[srcIdx];
          frameData[dstIdx + 1] = source.data[srcIdx + 1];
          frameData[dstIdx + 2] = source.data[srcIdx + 2];
          frameData[dstIdx + 3] = source.data[srcIdx + 3];
        }
      }
      frames.push({ width: cellW, height: cellH, data: frameData });
    }
  }
  return frames;
}

// ─── Image processing helpers ───

interface BgColor {
  r: number;
  g: number;
  b: number;
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

function detectBackgroundColor(source: RawImage): BgColor {
  const { width, height, data } = source;
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  const step = Math.max(1, Math.floor(Math.min(width, height) / 20));
  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      const idx = (y * width + x) * 4;
      totalR += data[idx]; totalG += data[idx + 1]; totalB += data[idx + 2];
      count++;
    }
  }
  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      const idx = (y * width + x) * 4;
      totalR += data[idx]; totalG += data[idx + 1]; totalB += data[idx + 2];
      count++;
    }
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/**
 * Fix frames that contain duplicate sprites or are too wide.
 * Crops wide frames to a square region centered on the content.
 */
function fixDuplicateFrame(frame: RawImage, bg: BgColor): RawImage {
  const { width, height, data } = frame;

  // If frame is roughly square already, no fix needed
  if (width <= height * 1.2) return frame;

  const threshold = 80;

  // Find content bounding box
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (colorDistance(data[idx], data[idx + 1], data[idx + 2], bg.r, bg.g, bg.b) >= threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return frame;

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;

  // If content is wider than 1.4x its height, it likely has duplicates
  // Crop to a square region (height x height) centered on the densest column
  if (contentW > contentH * 1.4) {
    // Find the column with the most content pixels
    const colDensity = new Float64Array(width);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (colorDistance(data[idx], data[idx + 1], data[idx + 2], bg.r, bg.g, bg.b) >= threshold) {
          colDensity[x]++;
        }
      }
    }

    // Find densest region of width=height (square crop)
    const cropW = Math.min(height, width);
    let bestStart = 0, bestSum = 0;
    let runSum = 0;
    for (let x = 0; x < cropW && x < width; x++) runSum += colDensity[x];
    bestSum = runSum;
    for (let x = 1; x <= width - cropW; x++) {
      runSum -= colDensity[x - 1];
      runSum += colDensity[x + cropW - 1];
      if (runSum > bestSum) {
        bestSum = runSum;
        bestStart = x;
      }
    }

    const cropData = new Uint8Array(cropW * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < cropW; x++) {
        const srcIdx = (y * width + (bestStart + x)) * 4;
        const dstIdx = (y * cropW + x) * 4;
        cropData[dstIdx] = data[srcIdx];
        cropData[dstIdx + 1] = data[srcIdx + 1];
        cropData[dstIdx + 2] = data[srcIdx + 2];
        cropData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    console.log(`Fixed wide frame: ${width}x${height} -> ${cropW}x${height} (content was ${contentW}x${contentH})`);
    return { width: cropW, height, data: cropData };
  }

  return frame;
}

function resizeNearestNeighbor(source: RawImage, targetW: number, targetH: number): Uint8Array {
  const result = new Uint8Array(targetW * targetH * 4);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.floor((x / targetW) * source.width);
      const srcY = Math.floor((y / targetH) * source.height);
      const srcIdx = (srcY * source.width + srcX) * 4;
      const dstIdx = (y * targetW + x) * 4;
      result[dstIdx] = source.data[srcIdx];
      result[dstIdx + 1] = source.data[srcIdx + 1];
      result[dstIdx + 2] = source.data[srcIdx + 2];
      result[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }
  return result;
}

function removeBackground(pixels: Uint8Array, w: number, h: number, bg: BgColor): Uint8Array {
  const result = new Uint8Array(pixels);
  const threshold = 80;
  for (let i = 0; i < w * h * 4; i += 4) {
    if (result[i + 3] < 128) { result[i + 3] = 0; continue; }
    const r = result[i], g = result[i + 1], b = result[i + 2];
    // Standard background distance check
    const dist = colorDistance(r, g, b, bg.r, bg.g, bg.b);
    if (dist < threshold) { result[i + 3] = 0; continue; }
    // Aggressive green removal: any pixel where green dominates
    if (g > 120 && g > r * 1.3 && g > b * 1.3) { result[i + 3] = 0; continue; }
    // Bright green catch-all
    if (g > 180 && r < 120 && b < 120) { result[i + 3] = 0; continue; }
  }
  return result;
}

function blitFrame(dest: Uint8Array, destWidth: number, srcPixels: Uint8Array, destX: number, destY: number, w: number, h: number) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = ((destY + y) * destWidth + (destX + x)) * 4;
      dest[dstIdx] = srcPixels[srcIdx];
      dest[dstIdx + 1] = srcPixels[srcIdx + 1];
      dest[dstIdx + 2] = srcPixels[srcIdx + 2];
      dest[dstIdx + 3] = srcPixels[srcIdx + 3];
    }
  }
}

