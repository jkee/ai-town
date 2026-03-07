import { v } from 'convex/values';
import { internalAction, internalMutation } from '../_generated/server';
import { chatCompletion, getLLMConfig, retryWithBackoff } from '../util/llm';
import { internal } from '../_generated/api';
import { decode as decodePng, encode as encodePng } from 'fast-png';
import jpeg from 'jpeg-js';

const IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

export const generateAgent = internalAction({
  args: {
    worldId: v.id('worlds'),
    prompt: v.string(),
    jobId: v.id('agentCreationJobs'),
  },
  handler: async (ctx, args) => {
    try {
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
        generateSpriteSheetPerFrame(ctx, portraitDesc),
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

      // Mark job as complete
      await ctx.runMutation(internal.aiTown.generateAgentAction.updateCreationJob, {
        jobId: args.jobId,
        status: 'complete',
        agentName: name,
      });

      return { name, character: 'generated' };
    } catch (e: any) {
      // Mark job as error
      await ctx.runMutation(internal.aiTown.generateAgentAction.updateCreationJob, {
        jobId: args.jobId,
        status: 'error',
        error: e.message || 'Unknown error',
      });
      throw e;
    }
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
      generateSpriteSheetPerFrame(ctx, args.portraitPrompt),
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

// Regenerate sprite for an existing saved agent
export const regenerateSprite = internalAction({
  args: {
    savedAgentId: v.id('savedAgents'),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const [portraitResult, spriteResult] = await Promise.allSettled([
      generatePortrait(ctx, args.description),
      generateSpriteSheetPerFrame(ctx, args.description),
    ]);

    const portraitStorageId = portraitResult.status === 'fulfilled' ? portraitResult.value : undefined;
    if (spriteResult.status === 'rejected') {
      throw new Error(`Spritesheet failed: ${spriteResult.reason}`);
    }

    await ctx.runMutation(internal.aiTown.generateAgentAction.updateSavedAgentSprite, {
      savedAgentId: args.savedAgentId,
      spriteSheetStorageId: spriteResult.value,
      portraitStorageId,
    });
  },
});

export const updateCreationJob = internalMutation({
  args: {
    jobId: v.id('agentCreationJobs'),
    status: v.union(v.literal('complete'), v.literal('error')),
    agentName: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      agentName: args.agentName,
      error: args.error,
    });
  },
});

export const updateSavedAgentSprite = internalMutation({
  args: {
    savedAgentId: v.id('savedAgents'),
    spriteSheetStorageId: v.string(),
    portraitStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const spriteSheetUrl = (await ctx.storage.getUrl(args.spriteSheetStorageId as any)) ?? undefined;
    const patch: Record<string, string | undefined> = {};
    if (spriteSheetUrl) patch.spriteSheetUrl = spriteSheetUrl;
    if (args.portraitStorageId) {
      const portraitUrl = (await ctx.storage.getUrl(args.portraitStorageId as any)) ?? undefined;
      if (portraitUrl) patch.portraitUrl = portraitUrl;
    }
    await ctx.db.patch(args.savedAgentId, patch);
  },
});

// ─── Image generation helpers ───

interface ImageData {
  base64: string;
  mimeType: string;
}

/** Generate an image from text-only prompt */
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

/** Generate an image using a reference image + text prompt */
async function generateImageWithReference(
  apiKey: string,
  prompt: string,
  referenceBase64: string,
  referenceMimeType: string,
): Promise<ImageData> {
  const { result } = await retryWithBackoff(async () => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${referenceMimeType};base64,${referenceBase64}`,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw {
        retry: response.status === 429 || response.status >= 500,
        error: new Error(`Image gen with ref failed (${response.status}): ${error}`),
      };
    }
    return await response.json();
  });

  const extracted = extractBase64ImageWithType(result);
  if (!extracted.base64) {
    throw new Error('No image in reference-based response');
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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

// ─── Per-frame spritesheet generation ───

/** Base prompt for generating the first (front idle) frame from text only */
function frontIdlePrompt(description: string): string {
  return `Create exactly one pixel-art JRPG overworld sprite.
Full body, centered, standing neutral, orthographic front view (facing toward viewer).
Chibi proportions (head ~30% of height).
Crisp hard-edged pixel art, 16-20 color palette, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF magenta background. No shadows, no text, no borders, no extra objects.
NOT a sprite sheet — single character only.
Character: ${description}`;
}

/** Prompt for generating a variant from a reference image */
function variantPrompt(direction: string, pose: string): string {
  return `Using the reference image, draw the same exact character with same costume, colors, proportions, head size, and scale.
${direction}-facing ${pose} view.
Keep same size, baseline, framing, palette, and character identity.
Crisp hard-edged pixel art, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF magenta background only. No shadow, no text. Do not crop feet or hair.
NOT a sprite sheet — single character only.`;
}

/** Text-only fallback prompt for when image-in is not supported */
function textOnlyVariantPrompt(description: string, direction: string, pose: string): string {
  return `Create exactly one pixel-art JRPG overworld sprite.
Full body, centered, ${pose}, orthographic ${direction} view.
Chibi proportions (head ~30% of height).
Crisp hard-edged pixel art, 16-20 color palette, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF magenta background. No shadows, no text, no borders, no extra objects.
NOT a sprite sheet — single character only.
Character: ${description}`;
}

/** Prompt for generating a walking step pose */
function stepPosePrompt(direction: string): string {
  return `Using the reference image, draw the same character in a single walking contact pose for a 3-frame JRPG walk cycle, ${direction}-facing.
One foot forward, other back, opposite arm swing.
Head and torso nearly unchanged. Same scale, baseline, framing, palette.
Crisp hard-edged pixel art, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF magenta background. No shadow, no text. Do not crop.
NOT a sprite sheet — single character only.`;
}

/** Text-only fallback for step pose */
function textOnlyStepPrompt(description: string, direction: string): string {
  return `Create exactly one pixel-art JRPG overworld sprite in a walking pose.
Full body, centered, one foot forward other back with opposite arm swing.
Orthographic ${direction} view. Walking contact pose for a JRPG walk cycle.
Chibi proportions (head ~30% of height).
Crisp hard-edged pixel art, 16-20 color palette, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF magenta background. No shadows, no text, no borders, no extra objects.
NOT a sprite sheet — single character only.
Character: ${description}`;
}

/** Try image-in generation, fall back to text-only if it fails */
async function generateWithFallback(
  apiKey: string,
  refPrompt: string,
  fallbackPrompt: string,
  refBase64: string,
  refMimeType: string,
): Promise<ImageData> {
  try {
    return await generateImageWithReference(apiKey, refPrompt, refBase64, refMimeType);
  } catch (e: any) {
    console.warn(`Image-in generation failed, falling back to text-only: ${e.message}`);
    return await generateImageWithMeta(apiKey, fallbackPrompt);
  }
}

/**
 * Per-frame sprite generation pipeline.
 *
 * Generates 4 key frames via API, derives the rest programmatically:
 * 1. Front idle (text-only)
 * 2. Back idle (image-in with front as reference)
 * 3. Right idle (image-in with front as reference)
 * 4. Right step (image-in with right idle as reference)
 * 5. Left = mirror of right
 * 6. Walk frames = programmatic shifts from idle
 *
 * Assembles into 96x128 spritesheet (3 cols x 4 rows of 32x32).
 */
async function generateSpriteSheetPerFrame(ctx: any, description: string): Promise<string> {
  const config = getLLMConfig();
  const apiKey = config.apiKey!;

  // Step 1: Generate front idle (text-only, no reference)
  console.log('Sprite: generating front idle...');
  const frontResult = await generateImageWithMeta(apiKey, frontIdlePrompt(description));
  const frontBytes = base64ToUint8Array(frontResult.base64);
  const frontRaw = decodeImage(frontBytes, frontResult.mimeType);
  const frontProcessed = processFrame(frontRaw);

  // Encode front idle as PNG for use as reference in subsequent calls.
  // Fill transparent pixels with magenta so the model sees character on magenta
  // (otherwise transparent = black, confusing the model about background color).
  const frontRefBase64 = encodeRefPng(frontProcessed);

  // Step 2 & 3: Generate back idle and right idle in parallel
  // Try image-in with front as reference, fall back to text-only if unsupported
  console.log('Sprite: generating back + right idle...');
  const [backResult, rightResult] = await Promise.all([
    generateWithFallback(
      apiKey,
      variantPrompt('back (facing away from viewer)', 'standing neutral'),
      textOnlyVariantPrompt(description, 'back (facing away from viewer)', 'standing neutral'),
      frontRefBase64, 'image/png',
    ),
    generateWithFallback(
      apiKey,
      variantPrompt('right', 'standing neutral'),
      textOnlyVariantPrompt(description, 'right', 'standing neutral'),
      frontRefBase64, 'image/png',
    ),
  ]);

  const backRaw = decodeImage(base64ToUint8Array(backResult.base64), backResult.mimeType);
  const backProcessed = processFrame(backRaw);

  const rightRaw = decodeImage(base64ToUint8Array(rightResult.base64), rightResult.mimeType);
  const rightProcessed = processFrame(rightRaw);

  // Step 4: Generate right step (references right idle)
  console.log('Sprite: generating right step...');
  const rightRefBase64 = encodeRefPng(rightProcessed);
  const rightStepResult = await generateWithFallback(
    apiKey,
    stepPosePrompt('right'),
    textOnlyStepPrompt(description, 'right'),
    rightRefBase64, 'image/png',
  );
  const rightStepRaw = decodeImage(base64ToUint8Array(rightStepResult.base64), rightStepResult.mimeType);
  const rightStepProcessed = processFrame(rightStepRaw);

  // Step 5: Derive left by mirroring right
  const leftProcessed = mirrorFrame(rightProcessed);
  const leftStepProcessed = mirrorFrame(rightStepProcessed);

  // Step 6: Derive walk frames programmatically
  // For front/back: derive walk-1 and walk-3 from idle via pixel shifting
  const frontWalk1 = deriveWalkFrame(frontProcessed, -1);
  const frontWalk3 = deriveWalkFrame(frontProcessed, 1);
  const backWalk1 = deriveWalkFrame(backProcessed, -1);
  const backWalk3 = deriveWalkFrame(backProcessed, 1);

  // For side views: we have idle + step. Walk-3 is step with slight bob.
  const rightWalk3 = deriveSideWalkFrame(rightStepProcessed);
  const leftWalk3 = mirrorFrame(rightWalk3);

  // Step 7: Downsample all 12 frames to 32x32 and assemble
  // Spritesheet layout (96x128):
  //   Row 0 (down/front): walk-1, idle, walk-3
  //   Row 1 (left):       step,   idle, walk-3
  //   Row 2 (right):      step,   idle, walk-3
  //   Row 3 (up/back):    walk-1, idle, walk-3
  const frames: RawImage[] = [
    frontWalk1, frontProcessed, frontWalk3,     // Row 0: down (facing viewer)
    leftStepProcessed, leftProcessed, leftWalk3, // Row 1: left
    rightStepProcessed, rightProcessed, rightWalk3, // Row 2: right
    backWalk1, backProcessed, backWalk3,         // Row 3: up (facing away)
  ];

  const sheetData = new Uint8Array(96 * 128 * 4);
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const enhanced = applyOutlineAndShadow(frames[i]);
    const frame32 = downsampleTo32(enhanced);
    blitFrame(sheetData, 96, frame32, col * 32, row * 32, 32, 32);
  }

  console.log('Sprite: assembling 96x128 spritesheet');
  const pngBytes = encodePng({ width: 96, height: 128, data: sheetData, channels: 4, depth: 8 });
  const blob = new Blob([pngBytes], { type: 'image/png' });
  return await ctx.storage.store(blob);
}

/** Encode a processed frame as PNG with magenta filling transparent pixels (for model reference) */
function encodeRefPng(frame: RawImage): string {
  const { width, height, data } = frame;
  const filled = new Uint8Array(data);
  for (let i = 0; i < width * height * 4; i += 4) {
    if (filled[i + 3] === 0) {
      filled[i] = 255;     // R
      filled[i + 1] = 0;   // G
      filled[i + 2] = 255; // B
      filled[i + 3] = 255; // A
    }
  }
  const png = encodePng({ width, height, data: filled, channels: 4, depth: 8 });
  return uint8ArrayToBase64(new Uint8Array(png));
}

// ─── Per-frame post-processing ───

/**
 * Process a single generated frame:
 * 1. Remove background via flood-fill from edges + magenta pixel cleanup
 * 2. Crop to content bounding box
 * 3. Normalize height to ~96px (never upscale)
 * 4. Place on 128x128 canvas with feet baseline at y=116, centered at x=64
 * 5. Threshold alpha for crisp edges
 */
function processFrame(raw: RawImage): RawImage {
  const { width, height, data } = raw;
  const result = new Uint8Array(data);

  // Background removal strategy:
  // 1. Flood-fill with pure magenta (what we asked for in the prompt)
  // 2. Flood-fill with detected corner color (what the model actually used)
  // 3. Cleanup pass for common bg colors that slip through

  const cornerBg = detectCornerColor(raw);
  console.log(`  processFrame: corner bg=(${cornerBg.r},${cornerBg.g},${cornerBg.b}) on ${width}x${height}`);

  // Pass 1: flood-fill with pure magenta (threshold=60 to catch impure magenta)
  floodFillFromEdges(result, width, height, { r: 255, g: 0, b: 255 }, 80);
  // Pass 2: flood-fill with detected corner color (handles non-magenta bg)
  floodFillFromEdges(result, width, height, cornerBg, 60);

  // Pass 3: cleanup any remaining background-ish pixels
  for (let i = 0; i < width * height * 4; i += 4) {
    if (result[i + 3] === 0) continue;
    const r = result[i], g = result[i + 1], b = result[i + 2];
    // Magenta-ish: R and B both high, G low
    if (r > 150 && g < 100 && b > 150) { result[i + 3] = 0; continue; }
    // Near-white / light grey
    if (r > 220 && g > 220 && b > 220) { result[i + 3] = 0; continue; }
    // Bright green
    if (g > 180 && r < 100 && b < 100) { result[i + 3] = 0; continue; }
  }

  // Find content bounding box
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (result[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    // No content — return empty 128x128
    return { width: 128, height: 128, data: new Uint8Array(128 * 128 * 4) };
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Normalize: scale so character height is ~96px (at 128x128 stage)
  const targetCharH = 96;
  const scale = Math.min(targetCharH / cropH, 1.0); // never upscale
  const scaledW = Math.max(1, Math.round(cropW * scale));
  const scaledH = Math.max(1, Math.round(cropH * scale));

  // Place on 128x128 canvas with feet at baseline y=116, centered x=64
  const canvasW = 128;
  const canvasH = 128;
  const canvas = new Uint8Array(canvasW * canvasH * 4);

  const baselineY = 116;
  const offsetX = Math.floor(64 - scaledW / 2);
  const offsetY = baselineY - scaledH;

  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const srcX = minX + Math.floor((x / scaledW) * cropW);
      const srcY = minY + Math.floor((y / scaledH) * cropH);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstX = offsetX + x;
      const dstY = offsetY + y;
      if (dstX < 0 || dstX >= canvasW || dstY < 0 || dstY >= canvasH) continue;
      const dstIdx = (dstY * canvasW + dstX) * 4;
      canvas[dstIdx] = result[srcIdx];
      canvas[dstIdx + 1] = result[srcIdx + 1];
      canvas[dstIdx + 2] = result[srcIdx + 2];
      // Threshold alpha: > 96 -> 255, else -> 0
      canvas[dstIdx + 3] = result[srcIdx + 3] > 96 ? 255 : 0;
    }
  }

  return { width: canvasW, height: canvasH, data: canvas };
}

// ─── Frame derivation helpers ───

/** Mirror a frame horizontally (right -> left) */
function mirrorFrame(frame: RawImage): RawImage {
  const { width, height, data } = frame;
  const mirrored = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = (y * width + (width - 1 - x)) * 4;
      mirrored[dstIdx] = data[srcIdx];
      mirrored[dstIdx + 1] = data[srcIdx + 1];
      mirrored[dstIdx + 2] = data[srcIdx + 2];
      mirrored[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { width, height, data: mirrored };
}

/**
 * Derive a walk frame from an idle frame by shifting the lower body.
 * direction: -1 for left-leg-forward, +1 for right-leg-forward
 */
function deriveWalkFrame(idle: RawImage, direction: number): RawImage {
  const { width, height, data } = idle;
  const result = new Uint8Array(data);

  // Find content bounds
  let minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxY <= minY) return { width, height, data: result };

  const contentH = maxY - minY + 1;
  const legY = minY + Math.floor(contentH * 0.62);

  // Shift lower body pixels by direction * 1px horizontally
  for (let y = legY; y <= maxY; y++) {
    const row = new Uint8Array(width * 4);
    for (let x = 0; x < width; x++) {
      const srcX = x - direction;
      if (srcX >= 0 && srcX < width) {
        const srcIdx = (y * width + srcX) * 4;
        const dstIdx = x * 4;
        row[dstIdx] = data[srcIdx];
        row[dstIdx + 1] = data[srcIdx + 1];
        row[dstIdx + 2] = data[srcIdx + 2];
        row[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    // Write row back
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      result[dstIdx] = row[x * 4];
      result[dstIdx + 1] = row[x * 4 + 1];
      result[dstIdx + 2] = row[x * 4 + 2];
      result[dstIdx + 3] = row[x * 4 + 3];
    }
  }

  return { width, height, data: result };
}

/** Derive a side walk frame from a step frame by bobbing 1px */
function deriveSideWalkFrame(step: RawImage): RawImage {
  const { width, height, data } = step;
  const result = new Uint8Array(width * height * 4);

  // Bob whole sprite up by 1px
  for (let y = 1; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = ((y - 1) * width + x) * 4;
      result[dstIdx] = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return { width, height, data: result };
}

/** Add a dark outline around opaque pixels */
function addOutline(frame: RawImage, thickness: number): RawImage {
  const { width, height, data } = frame;
  const result = new Uint8Array(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) continue; // skip opaque pixels

      // Check if any opaque pixel exists within thickness (circular)
      let nearOpaque = false;
      for (let dy = -thickness; dy <= thickness && !nearOpaque; dy++) {
        for (let dx = -thickness; dx <= thickness && !nearOpaque; dx++) {
          if (dx * dx + dy * dy > thickness * thickness) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (data[(ny * width + nx) * 4 + 3] > 0) nearOpaque = true;
        }
      }

      if (nearOpaque) {
        result[idx] = 15;
        result[idx + 1] = 10;
        result[idx + 2] = 25;
        result[idx + 3] = 255;
      }
    }
  }
  return { width, height, data: result };
}

/** Add a dark drop shadow behind the character */
function addDropShadow(frame: RawImage, offsetX: number, offsetY: number): RawImage {
  const { width, height, data } = frame;
  const result = new Uint8Array(width * height * 4);

  // First pass: draw shadow (offset opaque pixels as dark semi-transparent)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      const sx = x + offsetX, sy = y + offsetY;
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
      const dstIdx = (sy * width + sx) * 4;
      result[dstIdx] = 0;
      result[dstIdx + 1] = 0;
      result[dstIdx + 2] = 0;
      result[dstIdx + 3] = 140;
    }
  }

  // Second pass: draw character + outline on top (overwrite shadow where character exists)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) {
        result[idx] = data[idx];
        result[idx + 1] = data[idx + 1];
        result[idx + 2] = data[idx + 2];
        result[idx + 3] = data[idx + 3];
      }
    }
  }

  return { width, height, data: result };
}

/** Apply outline + shadow to a frame for better contrast against backgrounds */
function applyOutlineAndShadow(frame: RawImage): RawImage {
  // Outline first (3px at 128x128 ≈ ~1px after 4x downsample to 32x32)
  const outlined = addOutline(frame, 3);
  // Shadow: 4px down, 2px right at 128x128
  return addDropShadow(outlined, 2, 4);
}

/** Downsample a 128x128 frame to 32x32 using 4x4 block averaging */
function downsampleTo32(frame: RawImage): Uint8Array {
  const { width, height, data } = frame;
  const result = new Uint8Array(32 * 32 * 4);
  const scaleX = width / 32;
  const scaleY = height / 32;

  for (let dy = 0; dy < 32; dy++) {
    for (let dx = 0; dx < 32; dx++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const sy0 = Math.floor(dy * scaleY);
      const sy1 = Math.floor((dy + 1) * scaleY);
      const sx0 = Math.floor(dx * scaleX);
      const sx1 = Math.floor((dx + 1) * scaleX);

      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          if (sx < width && sy < height) {
            const idx = (sy * width + sx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }
      }

      const dstIdx = (dy * 32 + dx) * 4;
      if (count > 0) {
        result[dstIdx] = Math.round(r / count);
        result[dstIdx + 1] = Math.round(g / count);
        result[dstIdx + 2] = Math.round(b / count);
        // Threshold alpha: if average alpha > 128, fully opaque
        result[dstIdx + 3] = (a / count) > 128 ? 255 : 0;
      }
    }
  }

  return result;
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

/** Detect bg color from the 4 corner regions (less likely to contain character than edges) */
function detectCornerColor(source: RawImage): BgColor {
  const { width, height, data } = source;
  // Sample a 5% patch from each corner
  const patchW = Math.max(2, Math.floor(width * 0.05));
  const patchH = Math.max(2, Math.floor(height * 0.05));
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  const corners = [
    [0, 0],                              // top-left
    [width - patchW, 0],                  // top-right
    [0, height - patchH],                 // bottom-left
    [width - patchW, height - patchH],    // bottom-right
  ];

  for (const [cx, cy] of corners) {
    for (let dy = 0; dy < patchH; dy++) {
      for (let dx = 0; dx < patchW; dx++) {
        const idx = ((cy + dy) * width + (cx + dx)) * 4;
        totalR += data[idx]; totalG += data[idx + 1]; totalB += data[idx + 2];
        count++;
      }
    }
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/** Flood-fill from all edge pixels, making bg-matching pixels transparent */
function floodFillFromEdges(
  data: Uint8Array, width: number, height: number, bg: BgColor, threshold: number,
): void {
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed from all edge pixels
  for (let x = 0; x < width; x++) {
    queue.push(x);
    queue.push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width);
    queue.push(y * width + width - 1);
  }

  while (queue.length > 0) {
    const pos = queue.pop()!;
    if (pos < 0 || pos >= width * height) continue;
    if (visited[pos]) continue;
    const idx = pos * 4;
    if (data[idx + 3] === 0) { visited[pos] = 1; continue; } // already transparent
    const dist = colorDistance(data[idx], data[idx + 1], data[idx + 2], bg.r, bg.g, bg.b);
    if (dist >= threshold) continue;
    visited[pos] = 1;
    data[idx + 3] = 0;

    const x = pos % width;
    const y = Math.floor(pos / width);
    if (x > 0) queue.push(pos - 1);
    if (x < width - 1) queue.push(pos + 1);
    if (y > 0) queue.push(pos - width);
    if (y < height - 1) queue.push(pos + width);
  }
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
