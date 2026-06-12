# Design System — "Arcane Academy"

The visual language for **Frontend Wizards**. It evokes a painterly,
storybook _magical-academy_ feel: a deep petrol-teal canvas, warm
parchment surfaces, brass-gold filigree, and ember accents — elegant,
cinematic, and literary rather than neon.

> Replaces the previous "Crystal Cavern Aura" theme (indigo + cyan/purple
> neon). Every token below lives in `src/styles/base.css` under `:root`.

---

## 1. Color

### Surfaces (the dark canvas)

| Token            | Value                | Use                                              |
| ---------------- | -------------------- | ------------------------------------------------ |
| `--bg`           | `#16262e`            | Page background (petrol-teal)                    |
| `--bg-2`         | `#0f1c22`            | Deepest wells, scrims                            |
| `--surface`      | `#1d3138`            | Raised panels                                    |
| `--surface-2`    | `#25404a`            | Hover / elevated panels                          |
| `--surface-soft` | `rgba(37,64,74,.45)` | Translucent cards (spells, stats, stack, ladder) |

### Parchment (the light surfaces)

| Token           | Value     | Use                          |
| --------------- | --------- | ---------------------------- |
| `--parchment`   | `#f0e3c6` | Nav pill + footer background |
| `--parchment-2` | `#e7d4ad` | Parchment gradient base      |
| `--ink`         | `#2c2519` | Text on parchment            |
| `--ink-dim`     | `#5c5037` | Secondary text on parchment  |
| `--ink-mute`    | `#8a7c5d` | Fine print on parchment      |

### Accents

| Token           | Value     | Use                                   |
| --------------- | --------- | ------------------------------------- |
| `--gold`        | `#c9a24b` | Filigree, crests, hairlines, labels   |
| `--gold-bright` | `#e0bd6b` | Gradient highlight, emphasis text     |
| `--ember`       | `#d8843f` | Dot accents, kicker underlines, ranks |
| `--sage`        | `#7a9c8d` | **Primary** button fill               |
| `--sage-deep`   | `#5f8273` | Primary button gradient base          |

### Text on dark

`--text` `#f3ead4` (warm cream) · `--text-dim` `#9fb2b3` (muted slate) ·
`--text-mute` `#6f8186`.

### Signature gradient — "molten gold"

```css
--aurora: linear-gradient(135deg, #e0bd6b 0%, #c9a24b 45%, #d8843f 100%);
```

Used for gradient text (`.aurora-text`), stat values, pay figures, the
scroll-progress bar, and tech bars. The old neon aurora is gone.

---

## 2. Typography

Three families, loaded in `index.html`:

| Token            | Family               | Role                                                   |
| ---------------- | -------------------- | ------------------------------------------------------ |
| `--font-display` | **Playfair Display** | Headlines, stat/pay numbers — high-contrast serif      |
| `--font-body`    | **EB Garamond**      | Body copy + nav — warm, literary serif                 |
| `--font-label`   | **Cinzel**           | Kickers, labels, buttons, marquee — inscriptional caps |

Conventions:

- Body is serif (`EB Garamond`, ~1.06rem, line-height 1.62) for the
  storybook feel.
- Labels/kickers: Cinzel, uppercase, `letter-spacing: .3em`, gold or ember.
- Headings: Playfair, weight 700–900, near-flat tracking.
- `em` renders in italic `--gold-bright` (used in headlines).

---

## 3. Layout tokens

`--maxw: 1160px` · `--pad: clamp(1.25rem, 4vw, 3rem)` ·
`--radius: 16px` · `--radius-lg: 24px` ·
`--ease: cubic-bezier(.22,1,.36,1)` (every transition/animation).

Sections: `max-width: var(--maxw)`, centered, vertical rhythm
`clamp(4rem, 9vw, 7rem)`. Add `.section-head--center` to center a heading
block.

---

## 4. Components

### Floating pill nav — `.site-header > .nav-pill`

A parchment, fully-rounded bar floating with top padding (not a full-width
strip). Brand (left) · nav links (center, Cinzel) · sage CTA (right).
Nav links hide below 860px; the pill becomes brand + CTA.

### Buttons — `.btn`

Pill-shaped, Cinzel, `letter-spacing: .04em`. Variants:

- `.btn-primary` — **sage-green** gradient, dark text (the hero/nav CTA).
- `.btn-gold` — **brass-gold** gradient, ink text (warm secondary).
- `.btn-ghost` — gold hairline border, fills toward gold on hover.
- Sizes: `.btn-sm`, `.btn-lg`. `.btn-magnetic` enables the JS magnetic pull.

### Filigree divider — `.flourish`

Inline SVG: symmetric gold scrollwork around a central diamond crest with a
4-point star. Drops between major sections (currently atop "What's a
Frontend Wizzard?"). `color: var(--gold)` drives the stroke; soft gold
drop-shadow. Purely decorative (`aria-hidden`).

### Lore columns — `.pillars > .pillar`

Borderless, centered text columns separated by gold hairline rules
(`.pillar + .pillar::before`). Each ends with **three ember dots**
(`.pillar::after`, radial-gradient). Collapses to a single column < 720px
(rules become horizontal). This is the reference's three-column motif.

### Cards — `.spell`, `.stat`, `.tech`, `.rung`

`--surface-soft` fill, `--border` gold hairline, lift + `--glow-gold` on
hover. The ladder rungs additionally step up like a staircase ≥ 880px.

### Cinematic band — `.section-band` (the CTA)

Full-bleed image (`/hero-poster.jpg`), warmed via
`filter: saturate(.9) sepia(.14) hue-rotate(-6deg)`, under a teal radial +
linear scrim. Rounded, gold-bordered, centered proclamation inside. Mirrors
the reference's "Arcane Academy: Awakening of Powers" band.

### Parchment footer — `.site-footer`

Parchment gradient, ink text, gold top hairline, two-column grid (brand +
sources).

### Hero — `.hero`

Background video warmed with the same sepia/hue filter; a teal scrim heavy
on the left for legibility, fading into `--bg` at the bottom. Title uses the
molten-gold gradient on the second word.

---

## 5. Motion

- Reveal-on-scroll: `.reveal` → `.is-visible` (handled in JS).
- Count-up stat numbers; animated tech bars; gold scroll-progress meter.
- Confetti on `[data-confetti]`, in the warm palette
  `['#e0bd6b', '#d8843f', '#7a9c8d', '#f3ead4']` (`src/modules/confetti.js`).
- **Everything respects `prefers-reduced-motion`** — animations are disabled
  in the reduced-motion block in `base.css`.

---

## 6. Where things live

```
index.html              markup + Google Fonts + flourish/wand SVGs
src/styles/base.css     tokens · reset · type · buttons · nav · footer · a11y
src/styles/sections.css hero · flourish · lore columns · cards · CTA band
src/modules/*.js        scroll, counters, confetti, hero video
public/favicon.svg      brass crest on teal (matches the system)
```

## 7. Extending it

- New surface card? Reuse `--surface-soft` + `--border` + `--glow-gold` hover.
- New section heading? `.kicker` (Cinzel/gold) → `.section-title` (Playfair).
- Need emphasis color? Gold for "magic/value", ember for "accents/markers",
  sage for "primary action". Avoid introducing a fourth accent hue.
- Keep light surfaces parchment and dark surfaces petrol-teal — the contrast
  between the two is the core of the identity.
