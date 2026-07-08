# Frontend Wizards

> _Every developer is a wizard, and agentic coding is the proof._

A single-page, interactive showcase where every section, shader, and game was
**conjured by an AI agent from plain-language prompts** — no templates, no
hand-written CSS, no stock components. The closing section then hands the
visitor the spellbook: the exact, portable prompts that summoned each module, so
they can cast the same magic on their own site.

Built with vanilla JavaScript and Vite — no UI framework — wrapped in an
"Arcane Academy" magical-academy aesthetic (deep petrol-teal, parchment,
brass-gold filigree).

---

## ✦ The page, section by section

| Section            | What it is                                                                                                | Tech                          |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Hero**           | Full-bleed looping video intro with a graceful poster/image fallback.                                     | `<video>` + `heroVideo.js`    |
| **True form**      | A cursor "x-ray" portrait — move over the developer and a glowing line-art wizard bleeds through.         | WebGL displacement shader     |
| **Conjure**        | A scroll-scrubbed clip of a dev transmuting into a wizard, paired with the incantation that rendered it.  | Scroll-driven video scrubbing |
| **The descent**    | A scroll-pinned fall through the craft: a plunging video, a tumbling wizard, and tool-sigils that rush past under a WebGL light atmosphere. | Lenis + WebGL                 |
| **The wall**       | A monster frozen behind ice; frost melts where you point, and the canvas jolts as the creature pounds it. | WebGL + `VideoTexture`        |
| **Arcade**         | _Debug the Dungeon_ — a full playable maze game: gather semicolons, quaff potions, outrun the bugs.       | Phaser 3                      |
| **The reveal**     | The Observatory — a WebGL holographic console; each floating panel opens the exact prompt that summoned that module (all seven reachable, even on phones). | Three.js + `observatory.js`   |

Every effect guards `prefers-reduced-motion` and degrades gracefully when WebGL
or video isn't available.

---

## ✦ Tech stack

- **[Vite 6](https://vite.dev)** — dev server & build (static, relative-base output)
- **[Three.js](https://threejs.org)** — WebGL shaders for the true-form portrait and ice wall
- **[Phaser 3](https://phaser.io)** — the arcade maze game
- **[GSAP](https://gsap.com)** — scroll/animation timing
- Plain ES modules, plain CSS (custom properties in `src/styles/base.css`)

---

## ✦ Getting started

```bash
# install
npm install

# run the dev server (http://localhost:5173)
npm run dev

# production build → dist/
npm run build

# preview the production build
npm run preview
```

Requires Node 18+. The build uses a relative base, so `dist/` can be served from
any static host (GitHub Pages, Netlify, or even opened from a sub-path).

---

## ✦ Project structure

```
.
├── index.html                 # the single page; sections + fallback markup
├── src/
│   ├── main.js                # boot: init every section effect
│   ├── modules/
│   │   ├── smoothScroll.js    # global Lenis eased scroll (shared)
│   │   ├── navTeleport.js     # in-page anchors "apparate" (fade-cut jump)
│   │   ├── heroVideo.js       # hero video + fallback
│   │   ├── trueForm.js        # cursor x-ray portrait (WebGL)
│   │   ├── conjure.js         # scroll-scrubbed transformation
│   │   ├── descent.js         # scroll-pinned fall through the craft (WebGL)
│   │   ├── iceWall.js         # monster-behind-ice, video-synced impact shake
│   │   ├── arcade.js          # arcade overlay → loads the maze game
│   │   ├── observatory.js     # the reveal: holographic console of prompt panels
│   │   ├── spellbook.js       # the portable prompt catalogue (pure data)
│   │   ├── scroll.js          # scroll-progress meter + .reveal IntersectionObserver
│   │   ├── gl/                # GLSL shaders (iceWall, trueForm, descent)
│   │   └── maze/              # Phaser game: scenes, levels, generation, audio
│   └── styles/                # base.css (design tokens) + sections.css
├── public/                    # videos, posters, sprites, maze assets
├── mcp-servers/               # local MCP servers for AI image generation
├── DESIGN.md                  # "Arcane Academy" design system
└── BRAND_GUIDELINES.md        # voice & brand guidance
```

---

## ✦ The grimoire (portable prompts)

The whole point of the page: the **reveal** section — the Observatory
(`src/modules/observatory.js`) — surfaces, for each module, the generic build
prompt that created it plus any image/video generation prompts its art needed.
The catalogue itself lives in `src/modules/spellbook.js`. The prompts use
`{{PLACEHOLDERS}}` for brand specifics and instruct the agent to obey the
project's own design system — paste them into any coding/asset agent to
reproduce the same modules elsewhere.

---

## ✦ Asset generation

The visuals (portraits, the monster clip, the conjure transformation, maze
sprites) were generated by AI. The repo includes tooling for that pipeline:

- **`mcp-servers/`** — local [MCP](https://modelcontextprotocol.io) servers
  (`openai-images.mjs`, `xai-images.mjs`) exposing image generation as tools.
  Configured via `.mcp.json` (see `.mcp.json.example`).
- **`_process-sprite.mjs`** — turns an opaque generated sprite into a clean,
  cropped transparent PNG (corner flood-fill + fringe erosion + autocrop).
- **`_derive-overlay.py`** — derives the wizard line-art overlay from the
  photoreal portrait so the glitch flash and hover reveal stay pixel-aligned.
- **`_verify-assets.mjs`** — Puppeteer smoke test that loads the page and
  collects console/asset errors.

---

## ✦ Design & brand

- **`DESIGN.md`** — the "Arcane Academy" design system: color tokens, surfaces,
  typography, spacing. All tokens live under `:root` in `src/styles/base.css`.
- **`BRAND_GUIDELINES.md`** — voice and messaging guidance.

---

## ✦ Credits

Conjured by **[David Bergmann](https://www.linkedin.com/in/david-bergmann/)** —
a celebration of the craft, and proof that with the right spell, every front-end
developer is already a wizard.

_No apprentices were harmed in the making of this page._
