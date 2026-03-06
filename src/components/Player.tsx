import { Character } from './Character.tsx';
import { orientationDegrees } from '../../convex/util/geometry.ts';
import { characters } from '../../data/characters.ts';
import { toast } from 'react-toastify';
import { Player as ServerPlayer } from '../../convex/aiTown/player.ts';
import { GameId } from '../../convex/aiTown/ids.ts';
import { Id } from '../../convex/_generated/dataModel';
import { Location, locationFields, playerLocation } from '../../convex/aiTown/location.ts';
import { useHistoricalValue } from '../hooks/useHistoricalValue.ts';
import { PlayerDescription } from '../../convex/aiTown/playerDescription.ts';
import { WorldMap } from '../../convex/aiTown/worldMap.ts';
import { ServerGame } from '../hooks/serverGame.ts';

export type SelectElement = (element?: { kind: 'player'; id: GameId<'players'> }) => void;

const logged = new Set<string>();

// Spritesheet data for dynamically generated 96x128 spritesheets
// Same layout as hardcoded characters: down(0), left(32), right(64), up(96)
const generatedSpritesheetData = {
  frames: {
    down: { frame: { x: 0, y: 0, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    down2: { frame: { x: 32, y: 0, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    down3: { frame: { x: 64, y: 0, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    left: { frame: { x: 0, y: 32, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    left2: { frame: { x: 32, y: 32, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    left3: { frame: { x: 64, y: 32, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    right: { frame: { x: 0, y: 64, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    right2: { frame: { x: 32, y: 64, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    right3: { frame: { x: 64, y: 64, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    up: { frame: { x: 0, y: 96, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    up2: { frame: { x: 32, y: 96, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
    up3: { frame: { x: 64, y: 96, w: 32, h: 32 }, sourceSize: { w: 32, h: 32 }, spriteSourceSize: { x: 0, y: 0 } },
  },
  meta: { scale: '1' },
  animations: {
    left: ['left', 'left2', 'left3'],
    right: ['right', 'right2', 'right3'],
    up: ['up', 'up2', 'up3'],
    down: ['down', 'down2', 'down3'],
  },
};

export const Player = ({
  game,
  isViewer,
  player,
  onClick,
  historicalTime,
}: {
  game: ServerGame;
  isViewer: boolean;
  player: ServerPlayer;

  onClick: SelectElement;
  historicalTime?: number;
}) => {
  const playerDesc = game.playerDescriptions.get(player.id);
  const playerCharacter = playerDesc?.character;
  if (!playerCharacter) {
    throw new Error(`Player ${player.id} has no character`);
  }
  const character = characters.find((c) => c.name === playerCharacter);
  const dynamicSpriteSheetUrl = playerDesc?.spriteSheetUrl;

  const locationBuffer = game.world.historicalLocations?.get(player.id);
  const historicalLocation = useHistoricalValue<Location>(
    locationFields,
    historicalTime,
    playerLocation(player),
    locationBuffer,
  );
  if (!character && !dynamicSpriteSheetUrl) {
    if (!logged.has(playerCharacter)) {
      logged.add(playerCharacter);
      toast.error(`Unknown character ${playerCharacter}`);
    }
    return null;
  }

  if (!historicalLocation) {
    return null;
  }

  const isSpeaking = !![...game.world.conversations.values()].find(
    (c) => c.isTyping?.playerId === player.id,
  );
  const isThinking =
    !isSpeaking &&
    !![...game.world.agents.values()].find(
      (a) => a.playerId === player.id && !!a.inProgressOperation,
    );
  const tileDim = game.worldMap.tileDim;
  const historicalFacing = { dx: historicalLocation.dx, dy: historicalLocation.dy };
  return (
    <>
      <Character
        x={historicalLocation.x * tileDim + tileDim / 2}
        y={historicalLocation.y * tileDim + tileDim / 2}
        orientation={orientationDegrees(historicalFacing)}
        isMoving={historicalLocation.speed > 0}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        emoji={
          player.activity && player.activity.until > (historicalTime ?? Date.now())
            ? player.activity?.emoji
            : undefined
        }
        isViewer={isViewer}
        textureUrl={dynamicSpriteSheetUrl || character!.textureUrl}
        spritesheetData={dynamicSpriteSheetUrl ? generatedSpritesheetData : character!.spritesheetData}
        speed={character?.speed ?? 0.1}
        onClick={() => {
          onClick({ kind: 'player', id: player.id });
        }}
      />
    </>
  );
};
