import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { insertInput } from './insertInput';

// ─── Mutation to create the agent in the world ───

export const createGeneratedAgent = internalMutation({
  args: {
    worldId: v.id('worlds'),
    name: v.string(),
    character: v.string(),
    identity: v.string(),
    plan: v.string(),
    portraitStorageId: v.optional(v.string()),
    spriteSheetStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let portraitUrl: string | undefined;
    if (args.portraitStorageId) {
      portraitUrl = (await ctx.storage.getUrl(args.portraitStorageId as any)) ?? undefined;
    }
    let spriteSheetUrl: string | undefined;
    if (args.spriteSheetStorageId) {
      spriteSheetUrl = (await ctx.storage.getUrl(args.spriteSheetStorageId as any)) ?? undefined;
    }

    await ctx.db.insert('savedAgents', {
      worldId: args.worldId,
      name: args.name,
      character: args.character,
      identity: args.identity,
      plan: args.plan,
      portraitUrl,
      spriteSheetUrl,
    });

    await insertInput(ctx, args.worldId, 'createAgent', {
      name: args.name,
      character: args.character,
      identity: args.identity,
      plan: args.plan,
      portraitUrl,
      spriteSheetUrl,
    });
  },
});
