# Sprite Pipeline: How Agent Images Are Created

## Key Insight (from GPT-5.4-pro research)

**NEVER generate a full 3x4 grid in one shot.** Current AI image models (Gemini, DALL-E, etc.)
cannot reliably produce structured sprite grids — characters come out at different scales, with
no consistent gaps, causing "detached head" artifacts when the grid is split.

## Recommended Approach: Per-Frame Generation

Generate 4 individual sprites (with image-in fallback to text-only) and derive the rest programmatically. Steps 2 & 3 run in parallel.

### Pipeline Overview

```
1. Generate front idle (text-only, 128x128, magenta bg)
2. Generate back idle (image-in with front idle as reference)
3. Generate right idle (image-in with front idle as reference)
4. Generate right step (image-in with right idle as reference)
5. Derive left = mirror of right
6. Derive walk frames programmatically (pixel shift legs/arms)
7. Post-process each frame -> 32x32
8. Assemble into 96x128 spritesheet
```

### Why Per-Frame Works Better

| Approach | Consistency | API Calls | Robustness | Post-Processing |
|----------|-------------|-----------|------------|-----------------|
| Full 3x4 grid | Low | 1 | Poor | Nightmarish |
| 12 per-frame (no ref) | Medium | 12 | OK | Minor |
| 6 per-frame (image-in) | High | 6 | Best | Minor |
| 4 keyframes + procedural | Good | 4 | Good | Coding needed |

### Generation Details

**Background**: Use solid magenta `#FF00FF` (not green). Models handle magenta better
and it's easier to key out without accidentally removing green character pixels.

**Resolution**: Generate at 128x128 (or 256x256) and downsample to 32x32.
Models produce better output at larger sizes. Use nearest-neighbor or block-mode downsampling.

**Prompt template (base frame)**:
```
Create exactly one pixel-art JRPG overworld sprite.
Full body, centered, standing neutral, orthographic [DIRECTION] view.
Chibi proportions (head ~30% of height).
Crisp hard-edged pixel art, 16-20 color palette, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF background. No shadows, no text, no borders, no extra objects.
NOT a sprite sheet — single character only.
Character: [DESCRIPTION]
```

**Variation prompt (with image-in reference)**:
```
Using the reference image, draw the same exact character with same
costume, colors, proportions, head size, and scale.
[DIRECTION]-facing [POSE] view.
Keep same size, baseline, framing, palette, and character identity.
Crisp hard-edged pixel art, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF magenta background only. No shadow, no text.
Do not crop feet or hair. NOT a sprite sheet — single character only.
```

**Step pose prompt**:
```
Using the reference image, draw the same character in a single walking
contact pose for a 3-frame JRPG walk cycle, [DIRECTION]-facing.
One foot forward, other back, opposite arm swing.
Head and torso nearly unchanged. Same scale, baseline, framing, palette.
Crisp hard-edged pixel art, dark 1-pixel outline.
Canvas 128x128, character ~80x96 pixels, 12-pixel margin on all sides.
Flat solid #FF00FF magenta background. No shadow, no text. Do not crop.
NOT a sprite sheet — single character only.
```

**Text-only fallback** (if image-in not supported by model):
Same as base frame prompt but with specific direction/pose instead of front idle.

### Post-Processing Pipeline (per frame) — as implemented

1. **Decode** PNG to RGBA pixel buffer (handles JPEG and PNG, any resolution)
2. **Dual flood-fill background removal**:
   - Pass 1: Flood-fill from edges with **pure magenta** `#FF00FF` (threshold=80)
   - Pass 2: Flood-fill from edges with **detected corner color** (threshold=60)
   - Corner detection samples 5% patches from all 4 corners (avoids character contamination)
3. **Color cleanup**: Remove remaining magenta-ish (R>150,G<100,B>150), near-white (>220), bright green pixels
4. **Crop** to content bounding box
5. **Normalize height**: Scale so character is ~96px tall (never upscale) using nearest-neighbor
6. **Place on canvas**: Paste into 128x128 with feet baseline at y=116, centered at x=64
7. **Threshold alpha**: alpha > 96 -> 255, else -> 0 (crisp edges)
8. **Downsample** to 32x32 using block averaging (alpha threshold > 128 -> opaque)

### Reference image encoding

When sending processed frames as image-in references, transparent pixels (alpha=0)
are filled with **magenta #FF00FF** before PNG encoding. This prevents the model from
seeing the character on a black background and generating with the wrong bg color.

### Known model behaviors

- **Model ignores canvas size**: Prompt asks for 128x128 but output is often 1408x768 or 1024x1024. Pipeline handles any resolution.
- **Model ignores bg color sometimes**: Despite asking for magenta, output may use grey, green, or purple backgrounds. Dual flood-fill handles this.
- **Image-in may not be supported**: `generateWithFallback()` tries image-in first, falls back to text-only with character description.

### Not yet implemented (from GPT-5.4-pro recommendations)

- Connected-component labeling (keep largest blob, remove artifacts)
- Palette quantization (snap all frames to master palette from front idle)
- Quality checks (reject multi-component, edge-touching, off-center frames)

### Programmatic Walk Animation — as implemented

**Front/back walk** (`deriveWalkFrame`): Shift entire lower body (below 62% of content height) by ±1px horizontally. Frame B is the unchanged idle.

```
legY = contentTop + floor(contentH * 0.62)
Frame A: shift all pixels below legY by -1px (left leg forward)
Frame B: idle (unchanged)
Frame C: shift all pixels below legY by +1px (right leg forward)
```

**Side walk** (`deriveSideWalkFrame`): AI generates the step pose (one foot forward). Walk-3 is the step frame bobbed up by 1px.

**Left from right**: Mirror all right frames horizontally.

### GPT-5.4-pro recommended (more detailed, not yet implemented)

Separate arm and leg regions for independent shifting:
```
headY  = bbox.y + floor(h * 0.28)
armY0  = bbox.y + floor(h * 0.36)
armY1  = bbox.y + floor(h * 0.68)
legY   = bbox.y + floor(h * 0.62)
```
Shift left/right leg regions independently, add opposite arm swing.

### Quality Checks (not yet implemented — GPT-5.4-pro recommendation)

Reject a generated frame if:
- More than 1 large connected component (multiple characters)
- Bounding box touches image edge (cropped)
- Centroid x is outside center 40% of canvas
- More than 32 unique colors before quantization

## Spritesheet Format

The spritesheet is a 96x128 PNG containing a 3x4 grid of 32x32 frames:

```
         Col 0     Col 1     Col 2
Row 0:  down-1    down-2    down-3     (facing toward viewer)
Row 1:  left-1    left-2    left-3     (facing left)
Row 2:  right-1   right-2   right-3    (facing right)
Row 3:  up-1      up-2      up-3       (facing away from viewer)
```

## Frame Layout Within 32x32

Character is placed on a 128x128 canvas at baseline y=116, centered at x=64,
then downsampled to 32x32. This results in approximately:

```
+--------------------------------+
|        ~5px head room          |
|   +------------------------+  |
|   |    character content   |  |
|   |    (bottom-aligned)    |  |
|   +------------------------+  |
|        ~3px ground pad         |
+--------------------------------+
    ~2px side            ~2px side
```

Exact padding depends on character height after normalization (target ~96px at 128x128 stage, max baseline at y=116).

## Current Implementation

The code in `generateAgentAction.ts` uses the per-frame approach described above.
It makes 4 API calls (front idle, back+right idle in parallel, right step), derives
left by mirroring, and generates walk frames programmatically.

## Regenerating Sprites

```bash
npx convex run testing:stop
npx convex run testing:clearSavedAgents
npx convex run testing:wipeAllTables
npx convex run init
npx convex run testing:resume
```
