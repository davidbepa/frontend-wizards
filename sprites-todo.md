# Sprites TODO — "Debug the Dungeon" mini-game

> ✅ **A full set of these assets has already been generated** (with OpenAI
> `gpt-image-2`), background-removed, and installed in `public/assets/maze/` —
> they're live in the game now (listed in `manifest.json`). This file is kept as
> the **regenerate / customise** guide: tweak a prompt below, re-make any file,
> overwrite it at the same path, and reload. To revert any asset to the built-in
> procedural art, remove its name from `manifest.json`.

The maze game also runs fully on procedurally-drawn art (no files needed) — every
asset here is an **override**: drop a PNG at the listed path, list its key in the
manifest, and the game swaps it in automatically.

---

## How to install an asset (do this for each file you make)

1. Save the PNG into **`public/assets/maze/`** with the **exact filename** listed
   (e.g. `public/assets/maze/hero.png`).
2. Open **`public/assets/maze/manifest.json`** and add the asset's **key** (the
   filename without `.png`) to the `assets` array. Example after adding three:
   ```json
   { "assets": ["hero", "bug0", "rune"] }
   ```
3. Reload the page → the game loads your art in place of the procedural version.
   (If a file is missing or not listed in the manifest, the game just keeps using
   the built-in art — nothing breaks.)

No attribution / `CREDITS.md` is required: everything shipped is either procedural
or your own generated art. If you ever use a third-party CC-BY asset, add its
credit line to a `CREDITS.md` then.

---

## The palette (paste this into every prompt for cohesion)

> Arcane Academy palette — deep petrol-teal `#16262e` / `#0f1c22`, brass gold
> `#c9a24b` and bright gold `#e0bd6b`, ember orange `#d8843f`, sage green
> `#7a9c8d`, warm cream `#f3ead4`. Painterly storybook-magic mood, NOT neon.

**Style to hold across every asset:** clean, slightly painterly 2D game art with
soft inner glow and crisp silhouettes, readable at small sizes, **transparent
background**, no text, no drop shadow baked in.

**Recommended tools:** Midjourney / DALL·E / Leonardo / Ideogram / Stable
Diffusion for images; remove backgrounds with the model's transparent option or
remove.bg. For a sprite **sheet**, ask for "evenly spaced frames in a single
horizontal row on one transparent canvas."

---

## 1. Hero — `hero.png`  ·  key `hero`  ·  **single image**

The apprentice the player controls (the Pac-Man-style character). It's a **single
image** (a clean chomp sprite-sheet is hard to generate reliably). The game
**mirrors** it left↔right to face movement, so draw it **facing RIGHT** with the
mouth opening on the right edge; keep it roughly upright (it isn't rotated). The
built-in procedural hero, by contrast, is a 2-frame animated chomp — the code
auto-detects which kind it loaded.

- **One frame**, ~**1024×1024** transparent (the pipeline crops & downscales it).

> A single 2D game character sprite, centered, **facing right**, isolated on a
> transparent background: a small round glowing wizard-developer "orb mage"
> shaped like Pac-Man — a brass-gold `#c9a24b` sphere with bright-gold `#e0bd6b`
> highlights, a wedge mouth open toward the right, one small dark friendly eye
> near the top, a faint cream `#f3ead4` glowing rune ring, a little wizard hat,
> soft warm aura. Painterly storybook fantasy style, NOT neon, crisp silhouette,
> no text, no drop shadow.
> → save as `public/assets/maze/hero.png`

---

## 2. The four bugs — `bug0.png` `bug1.png` `bug2.png` `bug3.png`  ·  keys `bug0`–`bug3`

The four pursuers (the "ghosts"). Each is a **single image**, drawn **facing the
viewer** (the game doesn't rotate bugs). **Bake the eyes and colour in** — custom
bugs are used at full colour. Keep the same ghost-ish silhouette family so they
read as a set, but give each a distinct colour + personality cue.

- **Each file:** one frame, **128×128 px**, transparent, the creature centered and
  filling ~80% of the frame.
- **Colours (one per bug, to match the game's tints):**
  - `bug0` → **ember orange `#d8843f`** — "The Linter" (angry, direct)
  - `bug1` → **dusty rose `#b96a86`** — "Null Pointer" (sneaky)
  - `bug2` → **teal-green `#6aa9a0`** — "Race Condition" (jittery)
  - `bug3` → **brass gold `#c9a24b`** — "Memory Leak" (slow, lurking)

> A 2D arcade game enemy sprite — a small magical "bug" gremlin / glitch-spirit
> for a maze game, facing the viewer, with a rounded floaty body and a wavy
> bottom edge (ghost-like silhouette) and two expressive eyes. Primary colour
> **{COLOUR from the list}**, with cream `#f3ead4` eyes and subtle arcane glitch
> sparks. Painterly storybook style (not neon), soft glow, crisp silhouette, one
> frame 128×128 px, centered, transparent background, no text, no drop shadow.
> → save as `public/assets/maze/{bug0|bug1|bug2|bug3}.png`

*(The game automatically tints whichever bugs are vulnerable cold-blue while a
potion is active, so you don't need a separate "frightened" sprite.)*

---

## 3. Rune pellet — `rune.png`  ·  key `rune`

The little collectibles that fill the maze (the "dots" / stray semicolons).

- **One frame, 96×96 px**, transparent, the glyph centered & small (~40% of frame
  so the glow has room).

> A small glowing magical rune-spark pickup for a 2D maze game — a four-point
> golden sparkle / stylised semicolon glyph in bright gold `#e0bd6b` over brass
> `#c9a24b`, with a soft radial glow. Centered, 96×96 px, transparent background,
> crisp at small size, no text, no drop shadow.
> → save as `public/assets/maze/rune.png`

---

## 4. Power potion — `potion.png`  ·  key `potion`

The power-up that lets the apprentice banish the bugs (the "power pellet").

- **One frame, 128×128 px**, transparent, flask centered.

> A glowing arcane power potion for a 2D maze game — a small round flask with a
> gold cork and **sage-green `#7a9c8d`** glowing liquid, a bright highlight, and a
> soft green-gold aura. Painterly storybook style, centered, 128×128 px,
> transparent background, no text, no drop shadow.
> → save as `public/assets/maze/potion.png`

---

## 5. Bonus pickup — `bonus.png`  ·  key `bonus`

The mid-level bonus item (Pac-Man's "fruit"), worth extra points.

- **One frame, 96×96 px**, transparent, centered.

> A small glowing reward gem for a 2D fantasy arcade game — a faceted diamond-cut
> gem in **ember orange `#d8843f`** with cream `#f3ead4` edge light and a warm
> glow. Centered, 96×96 px, transparent background, no text, no drop shadow.
> → save as `public/assets/maze/bonus.png`

---

## 6. Spark particle — `spark.png`  ·  key `spark`

The soft glow used for pickup bursts and banish puffs (additive-blended, so make
it bright and soft-edged on transparent).

- **One frame, 64×64 px**, transparent.

> A soft round glow particle for additive blending in a 2D game — a white-to-warm-
> cream `#f3ead4` radial gradient dot, bright center fading to fully transparent
> edges, 64×64 px, no hard edge, no text.
> → save as `public/assets/maze/spark.png`

---

## 7. Life icon — `life.png`  ·  key `life`

The little HUD icon repeated once per remaining life.

- **One frame, 64×64 px**, transparent, icon centered & filling most of the frame.

> A tiny crisp HUD icon of a wizard's pointed hat for a 2D game — sage-green
> `#7a9c8d` hat with a brass-gold `#c9a24b` band and a small cream star, clean
> flat-painterly style, centered, 64×64 px, transparent background, no text.
> → save as `public/assets/maze/life.png`

---

## Optional — audio

The game plays synthesised Web-Audio blips already, so audio files are a stretch
goal (wiring real music/SFX into Phaser's loader is a small follow-up code change
— ask me when you have the files and I'll hook them up). If you want to generate
them now (**Suno**/**Udio** for music, **ElevenLabs SFX** for effects), aim for:

- `music-maze.mp3` — *"~75-second seamless-loop background track for a magical
  arcade maze game, playful but mysterious, harpsichord + soft synth + light
  percussion, ~120 BPM, no abrupt ending."*
- `sfx-rune.mp3` — *"short bright magical pickup chime, ~0.2s, no reverb tail."*
- `sfx-potion.mp3` — *"rising magical power-up shimmer, ~0.4s."*
- `sfx-banish.mp3` — *"satisfying sparkly 'poof' as a bug is banished, ~0.3s."*
- `sfx-caught.mp3` — *"descending failure sting, ~0.5s."*
- → save under `public/assets/maze/`.

---

## Checklist

- [x] `hero.png` (single image, facing right)
- [x] `bug0.png` ember `#d8843f`
- [x] `bug1.png` rose `#b96a86`
- [x] `bug2.png` teal-green `#6aa9a0`
- [x] `bug3.png` gold `#c9a24b`
- [x] `rune.png`
- [x] `potion.png`
- [x] `bonus.png`
- [ ] `spark.png` — *left procedural on purpose (a soft radial glow is cleaner generated in-engine)*
- [x] `life.png`
- [ ] (optional) audio files — *not yet made; ask me to wire them up when ready*
- [x] all finished keys are listed in `public/assets/maze/manifest.json`
