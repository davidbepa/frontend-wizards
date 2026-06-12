// ─────────────────────────────────────────────────────────────────────────────
// Debug the Dungeon — shared constants & palette.
//
// One tile grid drives the whole game. The logical VIEW is authored in these
// units; the Phaser camera zooms by DPR so it renders crisp on Retina (see
// index.js). Every colour mirrors a design token from src/styles/base.css so the
// game reads as part of the "Arcane Academy" site.
// ─────────────────────────────────────────────────────────────────────────────

export const TILE = 30 // logical px per maze cell
export const COLS = 19 // odd → clean maze generation (walls on even indices)
export const ROWS = 21 // odd
export const HUD_H = 56 // top band reserved for the in-canvas HUD

export const VIEW = { W: COLS * TILE, H: ROWS * TILE + HUD_H } // 570 × 686
export const DPR = Math.min(window.devicePixelRatio || 1, 2) // cap to bound memory

// Maze geometry helpers (tile ↔ world). Maze starts below the HUD band.
export const tileToX = (c) => c * TILE + TILE / 2
export const tileToY = (r) => HUD_H + r * TILE + TILE / 2
export const xToCol = (x) => Math.floor(x / TILE)
export const yToRow = (y) => Math.floor((y - HUD_H) / TILE)

// Arcane Academy palette (hex numbers for Phaser).
export const C = {
  bg: 0x16262e,
  bg2: 0x0f1c22,
  surface: 0x1d3138,
  wall: 0x24414c,
  wallEdge: 0x3c6471,
  wallGlow: 0x4f7c8a,
  gold: 0xc9a24b,
  goldBright: 0xe0bd6b,
  ember: 0xd8843f,
  sage: 0x7a9c8d,
  sageDeep: 0x5f8273,
  cream: 0xf3ead4,
  textDim: 0x9fb2b3,
  textMute: 0x6f8186,
  frightened: 0x6f8fb0, // cold blue — bugs when banishable
  frightenedEnd: 0xcfe0ea, // blink colour as the potion wears off
  // four distinct, muted enemy hues that still sit in the warm palette
  bug: [0xd8843f, 0xb96a86, 0x6aa9a0, 0xc9a24b],
}

// Web fonts already loaded by index.html (Google Fonts). We await
// document.fonts.ready in the Preloader so canvas text uses them.
export const FONT_LABEL = 'Cinzel, Georgia, serif'
export const FONT_DISPLAY = '"Playfair Display", Georgia, serif'
export const FONT_BODY = '"EB Garamond", Georgia, serif'

// localStorage key — bump the suffix if the save shape ever changes.
export const SAVE_KEY = 'fw-maze-v1'
