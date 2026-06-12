// ─────────────────────────────────────────────────────────────────────────────
// Level data — one Game scene interprets these. Difficulty escalates: bugs get
// faster and braver, the maze gets mazier (lower braid = more dead-ends to be
// cornered in), and the potion's protection shrinks.
//
// Speeds are logical px/sec. The apprentice stays a touch faster than the bugs
// early on, then the gap closes to a knife-edge by the Hollow.
// ─────────────────────────────────────────────────────────────────────────────

export const LEVELS = [
  {
    name: "The Linter's Lair",
    beat: 'A gentle first descent — the bugs are sluggish and the halls forgiving.',
    braid: 0.95, // very loopy, easy to escape
    bugCount: 3,
    playerSpeed: 116,
    bugSpeed: 84,
    frightenedMs: 7000,
    scatterMs: 7000,
    chaseMs: 20000,
    bonus: 100,
  },
  {
    name: 'Null Pointer Nave',
    beat: 'A fourth bug wakes. The corridors tighten and the chase grows bolder.',
    braid: 0.6,
    bugCount: 4,
    playerSpeed: 124,
    bugSpeed: 102,
    frightenedMs: 5500,
    scatterMs: 6000,
    chaseMs: 24000,
    bonus: 200,
  },
  {
    name: 'The Heisenbug Hollow',
    beat: 'The deepest vault. Fast, relentless bugs and a maze full of dead-ends.',
    braid: 0.3,
    bugCount: 4,
    playerSpeed: 132,
    bugSpeed: 122,
    frightenedMs: 4000,
    scatterMs: 5000,
    chaseMs: 30000,
    bonus: 400,
  },
]

// Each bug's personality decides how it picks a target tile while chasing.
// Index aligns with C.bug[] colours in config.js.
export const PERSONALITIES = ['chaser', 'ambusher', 'flanker', 'wanderer']

export const POINTS = {
  rune: 10,
  potion: 50,
  // banishing bugs during one potion chains 200 → 400 → 800 → 1600
  bugChain: [200, 400, 800, 1600],
  levelClear: 500,
  extraLifeEvery: 5000, // a free life each time the score crosses a multiple
}

export const START_LIVES = 3
