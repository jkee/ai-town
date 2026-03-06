import { ObjectType, v } from 'convex/values';
import { GameId, parseGameId, playerId } from './ids';

export const serializedPlayerDescription = {
  playerId,
  name: v.string(),
  description: v.string(),
  character: v.string(),
  portraitUrl: v.optional(v.string()),
  spriteSheetUrl: v.optional(v.string()),
};
export type SerializedPlayerDescription = ObjectType<typeof serializedPlayerDescription>;

export class PlayerDescription {
  playerId: GameId<'players'>;
  name: string;
  description: string;
  character: string;
  portraitUrl?: string;
  spriteSheetUrl?: string;

  constructor(serialized: SerializedPlayerDescription) {
    const { playerId, name, description, character, portraitUrl, spriteSheetUrl } = serialized;
    this.playerId = parseGameId('players', playerId);
    this.name = name;
    this.description = description;
    this.character = character;
    this.portraitUrl = portraitUrl;
    this.spriteSheetUrl = spriteSheetUrl;
  }

  serialize(): SerializedPlayerDescription {
    const { playerId, name, description, character, portraitUrl, spriteSheetUrl } = this;
    return {
      playerId,
      name,
      description,
      character,
      portraitUrl,
      spriteSheetUrl,
    };
  }
}
