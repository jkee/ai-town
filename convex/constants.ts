export const ACTION_TIMEOUT = 120_000; // more time for local dev
// export const ACTION_TIMEOUT = 60_000;// normally fine

export const IDLE_WORLD_TIMEOUT = 5 * 60 * 1000;
export const WORLD_HEARTBEAT_INTERVAL = 60 * 1000;

export const MAX_STEP = 10 * 60 * 1000;
export const TICK = 16;
export const STEP_INTERVAL = 1000;

export const PATHFINDING_TIMEOUT = 60 * 1000;
export const PATHFINDING_BACKOFF = 1000;
export const CONVERSATION_DISTANCE = 1.3;
export const MIDPOINT_THRESHOLD = 4;
export const TYPING_TIMEOUT = 15 * 1000;
export const COLLISION_THRESHOLD = 0.75;

// How many human players can be in a world at once.
export const MAX_HUMAN_PLAYERS = 8;

// Don't talk to anyone for 15s after having a conversation.
export const CONVERSATION_COOLDOWN = 15000;

// Don't do another activity for 10s after doing one.
export const ACTIVITY_COOLDOWN = 10_000;

// Don't talk to a player within 60s of talking to them.
export const PLAYER_CONVERSATION_COOLDOWN = 60000;

// Invite 80% of invites that come from other agents.
export const INVITE_ACCEPT_PROBABILITY = 0.8;

// Wait for 1m for invites to be accepted.
export const INVITE_TIMEOUT = 60000;

// Wait for another player to say something before jumping in.
export const AWKWARD_CONVERSATION_TIMEOUT = 60_000; // more time locally
// export const AWKWARD_CONVERSATION_TIMEOUT = 20_000;

// Leave a conversation after participating too long.
export const MAX_CONVERSATION_DURATION = 10 * 60_000; // more time locally
// export const MAX_CONVERSATION_DURATION = 2 * 60_000;

// Leave a conversation if it has more than 8 messages;
export const MAX_CONVERSATION_MESSAGES = 8;

// Wait for 1s after sending an input to the engine. We can remove this
// once we can await on an input being processed.
export const INPUT_DELAY = 1000;

// How many memories to get from the agent's memory.
// This is over-fetched by 10x so we can prioritize memories by more than relevance.
export const NUM_MEMORIES_TO_SEARCH = 3;

// Wait for at least two seconds before sending another message.
export const MESSAGE_COOLDOWN = 2000;

// Don't run a turn of the agent more than once a second.
export const AGENT_WAKEUP_THRESHOLD = 1000;

// How old we let memories be before we vacuum them
export const VACUUM_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000;
export const DELETE_BATCH_SIZE = 64;

export const HUMAN_IDLE_TOO_LONG = 5 * 60 * 1000;

export const ACTIVITIES = [
  { description: 'танцует как ненормальный', emoji: '🕺', duration: 60_000 },
  { description: 'крутит файер-шоу', emoji: '🔥', duration: 45_000 },
  { description: 'жонглирует бутылками', emoji: '🍾', duration: 50_000 },
  { description: 'орёт в мегафон', emoji: '📢', duration: 30_000 },
  { description: 'медитирует под басы', emoji: '🧘', duration: 60_000 },
  { description: 'делает стойку на руках', emoji: '🤸', duration: 35_000 },
  { description: 'пускает мыльные пузыри', emoji: '🫧', duration: 40_000 },
  { description: 'рисует граффити', emoji: '🎨', duration: 55_000 },
  { description: 'играет на барабанах', emoji: '🥁', duration: 50_000 },
  { description: 'пьёт что-то странное', emoji: '🍹', duration: 30_000 },
  { description: 'показывает фокус', emoji: '🎩', duration: 40_000 },
  { description: 'кричит "ВОТЭТОЦИРК!"', emoji: '🎪', duration: 20_000 },
  { description: 'светится неоном', emoji: '✨', duration: 45_000 },
  { description: 'качает головой под бит', emoji: '🎧', duration: 50_000 },
  { description: 'обнимает столб', emoji: '💃', duration: 35_000 },
];

// Drug system
export type DrugType = 'cocaine' | 'mdma' | 'mushroom';

export const DRUG_DURATION: Record<DrugType, number> = {
  cocaine: 2 * 60_000,
  mdma: 5 * 60_000,
  mushroom: 4 * 60_000,
};

export const DRUG_SPEED_MODIFIER: Record<DrugType, number> = {
  cocaine: 2.0,
  mdma: 1.0,
  mushroom: 0.5,
};

export const DRUG_ACTIVITIES: Record<DrugType, typeof ACTIVITIES> = {
  cocaine: [
    { description: 'бегает кругами как бешеный', emoji: '💊', duration: 20_000 },
    { description: 'танцует с бешеной скоростью', emoji: '⚡', duration: 25_000 },
    { description: 'рассказывает бизнес-план на миллиард', emoji: '💰', duration: 30_000 },
    { description: 'чистит зубы жвачкой', emoji: '😬', duration: 15_000 },
    { description: 'нюхает что-то с ключа', emoji: '🔑', duration: 10_000 },
    { description: 'говорит без остановки', emoji: '🗣️', duration: 35_000 },
    { description: 'дёргает головой под каждый бит', emoji: '💥', duration: 20_000 },
  ],
  mdma: [
    { description: 'обнимает всех подряд', emoji: '🫂', duration: 40_000 },
    { description: 'танцует с закрытыми глазами', emoji: '💗', duration: 60_000 },
    { description: 'гладит траву руками', emoji: '🌿', duration: 45_000 },
    { description: 'говорит всем "я тебя люблю"', emoji: '❤️', duration: 30_000 },
    { description: 'качается в такт музыке', emoji: '🎶', duration: 50_000 },
    { description: 'массирует себе челюсть', emoji: '😵', duration: 20_000 },
    { description: 'светится от счастья', emoji: '✨', duration: 55_000 },
  ],
  mushroom: [
    { description: 'лежит и смотрит на звёзды', emoji: '🌌', duration: 90_000 },
    { description: 'разговаривает с деревом', emoji: '🌳', duration: 60_000 },
    { description: 'смотрит на свои руки', emoji: '🖐️', duration: 45_000 },
    { description: 'ржёт без причины', emoji: '🤣', duration: 40_000 },
    { description: 'лежит в траве и ржёт', emoji: '🍄', duration: 70_000 },
    { description: 'видит фракталы в облаках', emoji: '🌀', duration: 55_000 },
    { description: 'медленно кружится на месте', emoji: '🔮', duration: 60_000 },
  ],
};

export const DRUG_CONVERSATION_PROMPTS: Record<DrugType, string> = {
  cocaine: `You are currently HIGH ON COCAINE. You talk extremely fast, interrupt constantly, jump between topics, think you're a genius. You're hyperactive, grandiose, and can't sit still. Use short choppy sentences. Be aggressive and confident. Sometimes mention how great you feel. Speak in a rushed, manic way.`,
  mdma: `You are currently HIGH ON MDMA/ECSTASY. You feel overwhelming love and empathy for everyone. You want to hug people, tell them how beautiful they are, share deep emotional truths. Everything feels amazing - the music, the lights, the people. You're touchy-feely and deeply emotional. Use lots of affectionate language.`,
  mushroom: `You are currently HIGH ON MAGIC MUSHROOMS. Reality is melting and shifting around you. You see patterns in everything, have deep philosophical insights that may or may not make sense. You speak slowly, get distracted by visuals, sometimes forget what you were saying. Mix profound observations with complete nonsense. You might talk to objects or see things that aren't there.`,
};

export const ENGINE_ACTION_DURATION = 30000;

// Bound the number of pathfinding searches we do per game step.
export const MAX_PATHFINDS_PER_STEP = 16;

export const DEFAULT_NAME = 'Зритель';
