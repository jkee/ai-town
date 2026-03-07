# CLAUDE.md — Project Guide for AI Assistants

## What is this

Fork of [ai-town](https://github.com/a16z-infra/ai-town) turned into **БЛЯДСКИЙ ЦИРК** — a circus-themed virtual world where AI agents live, talk, and cause chaos. All UI is in Russian.

**Vibe**: crazy festival circus sexy rave. Think burning man meets cyberpunk circus — neon, smoke, strobes, chaos.

## CRITICAL SECURITY RULES

- **NEVER hardcode API keys, secrets, or credentials in source files.** Always use environment variables.
- API keys go in `.env` (gitignored). Scripts read from `process.env.OPENROUTER_API_KEY`.
- If a key is needed, fail with a clear error message, never fall back to a hardcoded key.
- Before committing, always check for leaked secrets: `grep -r 'sk-or-v1\|sk-ant\|Bearer.*sk-' --include='*.ts' --include='*.mjs' --include='*.js'`

## Quick Start

```bash
npm run dev          # Starts both Vite frontend + Convex local backend
npx convex dev       # Convex watcher only (if running frontend separately)
```

- Local backend: http://127.0.0.1:3210
- Dashboard: http://127.0.0.1:6790
- Frontend: http://localhost:5173

## Architecture

### Stack
- **Frontend**: React + PixiJS (pixi-viewport), Vite
- **Backend**: Convex (serverless functions with local dev backend)
- **AI**: OpenRouter API (Gemini 2.5 Flash Lite for chat, Gemini Pro for image generation, OpenAI text-embedding-3-small for embeddings)
- **Map**: Tile-based 48x32 grid, 32px tiles

### Convex Runtime Constraints
- Two runtimes: **V8** (default) and **Node.js** (`"use node"` directive)
- `"use node"` files can ONLY export actions, NOT mutations or queries
- Local backend requires Node 18/20/22/24 for `"use node"` — Node 25 breaks it
- **Prefer pure-JS libraries** to avoid needing `"use node"` at all:
  - `fast-png` instead of `pngjs` (uses fflate for zlib, no Node built-ins)
  - `jpeg-js` with `{ useTArray: true }` for Uint8Array output (no Buffer)
- All image processing uses `Uint8Array`, never `Buffer`

### Key Env Variables
- `OPENROUTER_API_KEY` — required for all AI features
- `OPENROUTER_CHAT_MODEL` — chat model (default: `google/gemini-2.5-flash-lite`)
- `OPENROUTER_EMBEDDING_MODEL` — embedding model (default: `openai/text-embedding-3-small`)

## File Structure

### Core Game Loop
- `convex/aiTown/main.ts` — Engine step loop, runs all game ticks
- `convex/aiTown/game.ts` — Game state, player/agent/conversation management
- `convex/aiTown/player.ts` — Player class: movement, pathfinding, join/leave
- `convex/aiTown/agent.ts` — Agent class: AI-controlled player wrapper
- `convex/aiTown/conversation.ts` — Conversation state machine
- `convex/aiTown/inputHandler.ts` — Input system for game mutations
- `convex/aiTown/agentInputs.ts` — Input handlers: createAgent, removeAgent, etc.
- `convex/aiTown/agentOperations.ts` — Agent AI actions: doSomething, generateMessage, remember

### Agent Generation (AI-created characters)
- `convex/world.ts` — `generateAndCreateAgent` mutation (entry point, schedules action)
- `convex/aiTown/generateAgentAction.ts` — internalAction: LLM generates character card, Gemini generates portrait + spritesheet, processes images, stores in Convex
- `convex/aiTown/generateAgent.ts` — internalMutation: `createGeneratedAgent` resolves storage URLs and inserts agent into world
- `src/components/buttons/AddAgentButton.tsx` — UI button + modal for creating AI agents

### Spritesheet System
- **Format**: 96x128 PNG, 3 columns x 4 rows of 32x32 frames
- **Rows**: down / left / right / up (facing directions)
- **Columns**: 3 walking animation frames per direction
- **Full pipeline docs**: `docs/sprite-pipeline.md`
- **Generation**: Per-frame approach (4 API calls, not single grid):
  1. Front idle (text-only, magenta #FF00FF bg, 128x128)
  2. Back idle + right idle (image-in with front as reference, parallel)
  3. Right step (image-in with right idle as reference)
  4. Left = mirror right, walk frames = programmatic pixel shifts
  5. Post-process: dual flood-fill bg removal (magenta + corner-detected color), crop, normalize to 96px height, baseline at y=116
  6. Downsample 128x128 → 32x32 via block averaging, assemble 96x128 sheet
- `src/components/Player.tsx` — `generatedSpritesheetData` defines the PixiJS spritesheet layout; uses `playerDesc.spriteSheetUrl`
- `convex/aiTown/playerDescription.ts` — Has `spriteSheetUrl` and `portraitUrl` optional fields

### World & Persistence
- `convex/init.ts` — World creation, seeds agents from `savedAgents` table or hardcoded `data/characters.ts`
- `convex/world.ts` — World queries/mutations: heartbeat, join, leave, state
- `convex/schema.ts` — Database schema (worlds, players, agents, conversations, maps, savedAgents, etc.)
- `data/characters.ts` — Default circus characters (identity, plan, portraitPrompt). All use `character: 'generated'`
- `data/festival.js` — Map data (tile arrays, dimensions, tileset path)

### LLM Integration
- `convex/util/llm.ts` — `chatCompletion()`, `getLLMConfig()`, `retryWithBackoff()`
- `convex/agent/conversation.ts` — Conversation message generation, stop words
- **Gemini stopSequences limit**: Sliced to 4 in `chatCompletion()`. Originally 16 but caused 400 errors with Gemini; 4 is safe.

### Drug System
- `convex/constants.ts` — `DrugType`, `DRUG_DURATION`, `DRUG_SPEED_MODIFIER`, `DRUG_ACTIVITIES`, `DRUG_CONVERSATION_PROMPTS`, `DANCEFLOOR` bounds, `DANCE_PROBABILITY*`
- `convex/aiTown/player.ts` — `drugState` field on Player (type + until), decay in `tick()`, speed modifier in `tickPathfinding()`
- `convex/aiTown/agentInputs.ts` — `dropDrug` input handler: picks random sober agent, applies drug state
- `convex/aiTown/agentOperations.ts` — Drug-aware behavior: drug-specific activity pools, dancefloor dancing with probability, cocaine ignores invite cooldowns, mushrooms never invite
- `convex/aiTown/movement.ts` — `findRoute()` accepts `speedMultiplier` param for actual movement speed changes
- `convex/agent/conversation.ts` — `agentPrompts()` injects drug personality into LLM system prompt
- `convex/world.ts` — `dropDrug` mutation: looks up agent name, returns it for toast
- `src/components/buttons/DrugButtons.tsx` — 3 emoji-only buttons (💊💗🍄) with colored borders
- `src/components/PlayerDetails.tsx` — Drug state badge when clicking on drugged agent
- `src/components/Character.tsx` — `danceSpeed` prop: cocaine=fast (0.5), mushroom=slow (0.12), normal=0.25
- `src/components/Player.tsx` — Computes `danceSpeed` from `player.drugState`, passes to Character

### Dancefloor
- Map area: tiles x:25-33, y:18-25 (checkerboard pattern in festival tileset)
- Agents randomly decide to dance there (20% base, 50% cocaine, 60% MDMA)
- Dance activities have `dance: true` flag → triggers bounce animation in Character.tsx

### Frontend
- `src/App.tsx` — Main layout, footer buttons
- `src/components/Game.tsx` — Game view: PixiJS stage + right sidebar
- `src/components/PixiGame.tsx` — PixiJS viewport, click-to-move, camera
- `src/components/Player.tsx` — Sprite rendering, animation, dance speed
- `src/components/AgentCreator.tsx` — Agent manager: list and remove existing agents
- `src/components/PlayerDetails.tsx` — Selected player info panel, drug state badge
- `src/components/buttons/DrugButtons.tsx` — Drug drop buttons (💊💗🍄)

## Common Tasks

### Add a new agent via UI
Click the "+" button (AddAgentButton) and enter a short description. The LLM generates a full character card, then Gemini creates a portrait and per-frame spritesheet. Takes ~60-90 seconds. "Артисты" button shows the agent list with remove controls.

### Add a hardcoded agent
Edit `data/characters.ts`, add entry to `Descriptions` array. Run `npx convex run init` to seed.

### Debug agent conversations
```bash
npx convex logs --success    # Watch all function logs
```
Look for `agentGenerateMessage` and `agentDoSomething` operations.

### Reset the world
```bash
npx convex run testing:stop
npx convex run testing:wipeAllTables
npx convex run init
npx convex run testing:resume
```

### Run a function manually
```bash
npx convex run testing:resume          # Start the engine
npx convex run testing:stop            # Stop the engine
npx convex run testing:kick            # Restart a stuck engine
npx convex run testing:randomPositions # Scatter all players
```

## Gotchas

- **Player spawn**: New players/agents spawn within 10 tiles of a random existing player. Falls back to random map position if no space found.
- **Convex generated files**: `convex/_generated/` is auto-generated. Don't edit manually but DO commit changes.
- **Image model**: `google/gemini-3-pro-image-preview` via OpenRouter for spritesheet/portrait generation. Needs `modalities: ['image', 'text']` in request.
- **Sprite generation**: Uses per-frame approach (4 API calls) instead of single-grid. Each frame generated individually with magenta bg, then assembled. See `docs/sprite-pipeline.md`.
- **Sprite regeneration**: Run `npx convex run testing:regenerateSprites` then restart the world to apply new sprites.
- **savedAgents table**: Agents persist across world restarts (including `spriteSheetUrl` and `portraitUrl`). `init.ts` restores from `savedAgents` if any exist, otherwise generates default agents from `data/characters.ts`.
