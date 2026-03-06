# CLAUDE.md — Project Guide for AI Assistants

## What is this

Fork of [a]i-town](https://github.com/a16z-infra/ai-town) turned into **БЛЯДСКИЙ ЦИРК** — a circus-themed virtual world where AI agents live, talk, and cause chaos. All UI is in Russian.

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
- **AI**: OpenRouter API (Gemini Flash for chat, Gemini Pro for image generation)
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
- `OPENROUTER_CHAT_MODEL` — chat model (default: `google/gemini-2.0-flash-001`)

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
- **Generation**: Gemini Pro generates pixel art on green (#00FF00) background
- **Processing pipeline**:
  1. Detect background color from image edges (override to pure green if greenish)
  2. Find content bounding box (exclude green borders)
  3. Gap-based grid detection: count pixel density per column/row, find gaps
  4. Extract cells from detected grid boundaries, fix duplicate frames if too wide
  5. Resize each cell to 32x32 via nearest-neighbor
  6. Remove green background via color-distance threshold + aggressive green-specific removal
  7. Assemble into 96x128 spritesheet
- `src/components/Player.tsx` — `generatedSpritesheetData` defines the PixiJS spritesheet layout for dynamic sprites; uses `playerDesc.spriteSheetUrl`
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
- **Gemini stopSequences limit**: Max 16 (exclusive). `body.stop` is spread into a new array and sliced to 16 to prevent accumulation across retries.

### Frontend
- `src/App.tsx` — Main layout, footer buttons
- `src/components/Game.tsx` — Game view: PixiJS stage + right sidebar
- `src/components/PixiGame.tsx` — PixiJS viewport, click-to-move, camera
- `src/components/Player.tsx` — Sprite rendering, animation, speech bubbles
- `src/components/AgentCreator.tsx` — Agent manager: create agents (all use generated sprites) and remove existing ones
- `src/components/PlayerDetails.tsx` — Selected player info panel

## Common Tasks

### Add a new agent via UI
Click "Артисты" button to open the agent manager. Fill in name, identity, and plan. The agent gets an AI-generated portrait and spritesheet. Takes ~60 seconds.

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
- **Grid detection**: AI sometimes generates grids with wrong dimensions (4x5 instead of 3x4). Gap-based detection handles this by finding actual cell boundaries and picking first 3x4 subset.
- **savedAgents table**: Agents persist across world restarts (including `spriteSheetUrl` and `portraitUrl`). `init.ts` restores from `savedAgents` if any exist, otherwise generates default agents from `data/characters.ts`.
