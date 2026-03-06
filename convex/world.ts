import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { insertInput } from './aiTown/insertInput';
import {
  DEFAULT_NAME,
  ENGINE_ACTION_DURATION,
  IDLE_WORLD_TIMEOUT,
  WORLD_HEARTBEAT_INTERVAL,
} from './constants';
import { agentId, playerId } from './aiTown/ids';
import { kickEngine, startEngine, stopEngine } from './aiTown/main';
import { engineInsertInput } from './engine/abstractGame';
import { internal } from './_generated/api';

export const defaultWorldStatus = query({
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    return worldStatus;
  },
});

export const heartbeatWorld = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!worldStatus) {
      throw new Error(`Invalid world ID: ${args.worldId}`);
    }
    const now = Date.now();

    // Skip the update (and then potentially make the transaction readonly)
    // if it's been viewed sufficiently recently..
    if (!worldStatus.lastViewed || worldStatus.lastViewed < now - WORLD_HEARTBEAT_INTERVAL / 2) {
      await ctx.db.patch(worldStatus._id, {
        lastViewed: Math.max(worldStatus.lastViewed ?? now, now),
      });
    }

    // Restart inactive worlds, but leave worlds explicitly stopped by the developer alone.
    if (worldStatus.status === 'stoppedByDeveloper') {
      console.debug(`World ${worldStatus._id} is stopped by developer, not restarting.`);
    }
    if (worldStatus.status === 'inactive') {
      console.log(`Restarting inactive world ${worldStatus._id}...`);
      await ctx.db.patch(worldStatus._id, { status: 'running' });
      await startEngine(ctx, worldStatus.worldId);
    }
  },
});

export const stopInactiveWorlds = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - IDLE_WORLD_TIMEOUT;
    const worlds = await ctx.db.query('worldStatus').collect();
    for (const worldStatus of worlds) {
      if (cutoff < worldStatus.lastViewed || worldStatus.status !== 'running') {
        continue;
      }
      console.log(`Stopping inactive world ${worldStatus._id}`);
      await ctx.db.patch(worldStatus._id, { status: 'inactive' });
      await stopEngine(ctx, worldStatus.worldId);
    }
  },
});

export const restartDeadWorlds = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Restart an engine if it hasn't run for 2x its action duration.
    const engineTimeout = now - ENGINE_ACTION_DURATION * 2;
    const worlds = await ctx.db.query('worldStatus').collect();
    for (const worldStatus of worlds) {
      if (worldStatus.status !== 'running') {
        continue;
      }
      const engine = await ctx.db.get(worldStatus.engineId);
      if (!engine) {
        throw new Error(`Invalid engine ID: ${worldStatus.engineId}`);
      }
      if (engine.currentTime && engine.currentTime < engineTimeout) {
        console.warn(`Restarting dead engine ${engine._id}...`);
        await kickEngine(ctx, worldStatus.worldId);
      }
    }
  },
});

export const userStatus = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   return null;
    // }
    // return identity.tokenIdentifier;
    return DEFAULT_NAME;
  },
});

export const joinWorld = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new ConvexError(`Not logged in`);
    // }
    // const name =
    //   identity.givenName || identity.nickname || (identity.email && identity.email.split('@')[0]);
    const name = DEFAULT_NAME;

    // if (!name) {
    //   throw new ConvexError(`Missing name on ${JSON.stringify(identity)}`);
    // }
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new ConvexError(`Invalid world ID: ${args.worldId}`);
    }
    // const { tokenIdentifier } = identity;
    return await insertInput(ctx, world._id, 'join', {
      name,
      character: 'generated',
      description: `${DEFAULT_NAME} — зритель, который забрёл в цирк`,
      // description: `${identity.givenName} is a human player`,
      tokenIdentifier: DEFAULT_NAME,
    });
  },
});

export const leaveWorld = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error(`Not logged in`);
    // }
    // const { tokenIdentifier } = identity;
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`Invalid world ID: ${args.worldId}`);
    }
    // const existingPlayer = world.players.find((p) => p.human === tokenIdentifier);
    const existingPlayer = world.players.find((p) => p.human === DEFAULT_NAME);
    if (!existingPlayer) {
      return;
    }
    await insertInput(ctx, world._id, 'leave', {
      playerId: existingPlayer.id,
    });
  },
});

export const sendWorldInput = mutation({
  args: {
    engineId: v.id('engines'),
    name: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error(`Not logged in`);
    // }
    return await engineInsertInput(ctx, args.engineId, args.name as any, args.args);
  },
});

export const worldState = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`Invalid world ID: ${args.worldId}`);
    }
    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', world._id))
      .unique();
    if (!worldStatus) {
      throw new Error(`Invalid world status ID: ${world._id}`);
    }
    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) {
      throw new Error(`Invalid engine ID: ${worldStatus.engineId}`);
    }
    return { world, engine };
  },
});

export const gameDescriptions = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const playerDescriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const agentDescriptions = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const worldMap = await ctx.db
      .query('maps')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!worldMap) {
      throw new Error(`No map for world: ${args.worldId}`);
    }
    return { worldMap, playerDescriptions, agentDescriptions };
  },
});

export const createAgent = mutation({
  args: {
    worldId: v.id('worlds'),
    name: v.string(),
    character: v.string(),
    identity: v.string(),
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new ConvexError(`Invalid world ID: ${args.worldId}`);
    }
    // All agents now use 'generated' character with AI spritesheets
    if (args.character !== 'generated') {
      throw new ConvexError(`Invalid character: ${args.character}. Use 'generated'.`);
    }
    // Save the agent config for persistence
    await ctx.db.insert('savedAgents', {
      worldId: args.worldId,
      name: args.name,
      character: args.character,
      identity: args.identity,
      plan: args.plan,
    });
    // Create the agent in the running world
    return await insertInput(ctx, args.worldId, 'createAgent', {
      name: args.name,
      character: args.character,
      identity: args.identity,
      plan: args.plan,
    });
  },
});

export const removeAgent = mutation({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new ConvexError(`Invalid world ID: ${args.worldId}`);
    }
    // Find the agent to get its player description (name) for removing from savedAgents
    const agent = world.agents.find((a) => a.id === args.agentId);
    if (!agent) {
      throw new ConvexError(`Agent not found: ${args.agentId}`);
    }
    // Find the player description to get the name
    const playerDesc = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', agent.playerId))
      .unique();
    if (playerDesc) {
      // Remove from savedAgents by matching name
      const savedAgents = await ctx.db
        .query('savedAgents')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
        .collect();
      const saved = savedAgents.find((s) => s.name === playerDesc.name);
      if (saved) {
        await ctx.db.delete(saved._id);
      }
    }
    // Remove the agent from the running world
    return await insertInput(ctx, args.worldId, 'removeAgent', {
      agentId: args.agentId,
    });
  },
});

export const generateAndCreateAgent = mutation({
  args: {
    worldId: v.id('worlds'),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new ConvexError(`Invalid world ID: ${args.worldId}`);
    }
    await ctx.scheduler.runAfter(0, internal.aiTown.generateAgentAction.generateAgent, {
      worldId: args.worldId,
      prompt: args.prompt,
    });
  },
});

export const listSavedAgents = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('savedAgents')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
  },
});

export const previousConversation = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args) => {
    // Walk the player's history in descending order, looking for a nonempty
    // conversation.
    const members = ctx.db
      .query('participatedTogether')
      .withIndex('playerHistory', (q) => q.eq('worldId', args.worldId).eq('player1', args.playerId))
      .order('desc');

    for await (const member of members) {
      const conversation = await ctx.db
        .query('archivedConversations')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('id', member.conversationId))
        .unique();
      if (!conversation) {
        throw new Error(`Invalid conversation ID: ${member.conversationId}`);
      }
      if (conversation.numMessages > 0) {
        return conversation;
      }
    }
    return null;
  },
});
