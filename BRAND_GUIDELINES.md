# Frontend Wizards — Brand Guidelines

---

## 1. Brand Essence & Core Messages

**Site name:** Frontend Wizards

Two theses underpin every word on this site. Write nothing that contradicts them.

**IDENTITY — "Every front-end developer is a wizard."**
Agentic coding doesn't replace you; it reveals your true form. The power was latent; the tools just x-ray it into view. This is an induction, not a product pitch.

**POWER — "Agentic coding is the source of that magic — the power to conjure whole interfaces from plain words."**
Prompt in, interface out. The entire page is live proof: every section, shader, and game was summoned from a sentence. Show, don't tell.

---

## 2. Narrative & Positioning

**Framing device:** The initiation scroll of a secret order — the Frontend Wizards. The visitor arrives an ordinary developer and is shown, section by section, that they are already one of us.

**Who it speaks to:** Front-end developers and technical-creative builders who are curious about agentic coding (GitHub Copilot, Claude, Cursor, etc.) and want to see what it actually produces — not a tutorial, but a demonstration.

**Tone of the invitation:** Conspiratorial and warm, never exclusionary. The order recognises; it doesn't recruit. By the final section the visitor should feel welcomed, not sold to.

**Positioning:** Not a SaaS, not a course. A living artefact — a single-page proof that the future of front-end development is already here and already yours.

---

## 3. Voice & Tone

Five principles. Each comes with a do/don't and a short example line drawn from the site's copy.

**1. Confident, never arrogant.**
Do: state the power as fact, let the demos carry the weight.
Don't: oversell, use superlatives, or mock developers who haven't adopted agents yet.
Example: "The order doesn't recruit — it recognises."

**2. Playful-but-polished.**
Do: lean into the wizardry metaphor with precision (incantation, ward, grimoire, order).
Don't: let the fantasy become self-parody; every metaphor should map cleanly to something real.
Example: "Prompt in, interface out. That's the magic, and it's yours to keep."

**3. Economical.**
Do: one strong sentence over two average ones; tighten every lead paragraph.
Don't: pad, qualify, or summarise what the visual already shows.
Example: "Every pixel here was a prompt."

**4. Conspiratorial and inviting.**
Do: address the reader as a peer who is close to crossing a threshold — "you are already one of us."
Don't: condescend or over-explain. The reader is a developer; trust their intelligence.
Example: "Scroll through and you'll understand: you are already one of us."

**5. Grounded in demonstration.**
Do: tie every claim to something visible on the page (the shader, the video, the game).
Don't: make abstract claims about AI that aren't proven by the artefact itself.
Example: "Agentic coding doesn't replace you — it x-rays you."

---

## 4. Lexicon — The Spellbook

### Words to use

| Term | How it maps |
|------|-------------|
| conjure / conjured | Create / created via an agent prompt |
| incantation | The prompt typed into an AI agent |
| summon / summoned | Same as conjure; use for variety |
| ward | Keep at bay; manage (legacy bugs, chaos) |
| the order | The Frontend Wizards as a collective |
| one of us | Belonging to the order; the invitation phrase |
| apprentice → wizard | The developer's arc through the page |
| agents | AI coding agents (Claude, Copilot, etc.) |
| prompts | The plain-language inputs that drive agents |
| grimoire | Codebase, or the game's maze metaphor |
| spell / cast | The act of prompting; the output rendered |
| reveal / true form | The x-ray of the wizard beneath the mundane dev |

### Words to avoid

Avoid generic SaaS and AI-hype vocabulary. If it could appear unchanged on a startup's features page, cut it.

- leverage, leverage the power of
- solutions, suite, platform
- synergy
- AI-powered (use "conjured by an agent" or "summoned from a prompt")
- unlock your potential / unleash
- game-changer, revolutionise
- seamless, robust, scalable (in marketing copy)
- innovative, cutting-edge, next-generation

---

## 5. Color Palette

Sourced from `/src/styles/base.css`. Palette name: **Arcane Academy** — petrol-teal canvas, parchment, brass and ember.

### Surfaces (dark canvas)

| Name | Hex | Usage |
|------|-----|-------|
| Background | `#16262e` | Page body background |
| Background deep | `#0f1c22` | Game canvas, deep inset areas |
| Surface | `#1d3138` | Cards, elevated panels |
| Surface 2 | `#25404a` | Hover states, secondary panels |

### Parchment (nav + footer)

| Name | Hex | Usage |
|------|-----|-------|
| Parchment | `#f0e3c6` | Nav pill and footer background |
| Parchment 2 | `#e7d4ad` | Footer gradient end |
| Ink | `#2c2519` | Primary text on parchment |
| Ink dim | `#5c5037` | Secondary text on parchment |
| Ink mute | `#8a7c5d` | Tertiary / metadata on parchment |

### Accents

| Name | Hex | Usage |
|------|-----|-------|
| Gold | `#c9a24b` | Kicker/eyebrow labels, borders, primary accent |
| Gold bright | `#e0bd6b` | Heading emphasis `<em>`, aurora animation |
| Ember | `#d8843f` | Nav underline, footer credit links, warm glow |
| Sage | `#7a9c8d` | Primary CTA button base |
| Sage deep | `#5f8273` | Primary CTA button shadow/gradient end |

### Text on dark

| Name | Hex | Usage |
|------|-----|-------|
| Text | `#f3ead4` | Body copy on dark backgrounds |
| Text dim | `#9fb2b3` | Section leads, secondary copy |
| Text mute | `#6f8186` | Metadata, hints |

### Gradients

**Molten-gold aurora** (used on "One of Us?" hero headline and scroll progress bar):
`linear-gradient(135deg, #e0bd6b 0%, #c9a24b 45%, #d8843f 100%)`

**Aurora soft** (subtle backgrounds):
`linear-gradient(135deg, rgba(224,189,107,0.16), rgba(201,162,75,0.14), rgba(216,132,63,0.16))`

**Gold glow** (focus / hover shadow):
`0 0 0 1px rgba(201,162,75,0.4), 0 14px 44px -12px rgba(201,162,75,0.4)`

---

## 6. Typography — The Arcane Academy System

Three Google Font families. Each has a distinct role; never swap them.

| Family | Variable | Role | Notes |
|--------|----------|------|-------|
| **Cinzel** (wt 500–900) | `--font-display`, `--font-label` | Display headings (h1–h3), kickers, eyebrows, nav, buttons | All-caps for kickers/eyebrows via `text-transform: uppercase`; no italic face — use Playfair for emphasis |
| **EB Garamond** (wt 400–600, italic) | `--font-body` | Body copy, section leads, footer blurb | 1.06rem base, 1.62 line-height; warm and readable |
| **Playfair Display** (italic 600) | `--font-accent` | Italic `<em>` inside headings | Fires only on `h1 em`, `h2 em`, `h3 em` — gives headings a true-italic serif accent word in gold |

**Heading `<em>` rule:** Every section title has one italic accent word wrapped in `<em>`. Cinzel has no italic, so the browser falls to Playfair Display, rendering it in gold (`--gold-bright`). Preserve this pattern in all new copy — pick the word that carries the section's thematic weight.

---

## 7. Visual & Motion Motifs

**Gold-framed stages.** Each interactive demo (True Form, Ice Wall) lives inside a gold-bordered stage. The frame signals "this is a conjured artefact, not a stock graphic."

**WebGL x-ray and melt interactions.** Cursor-driven shader effects are the primary proof of the POWER thesis. They must never feel decorative — each has a narrative function (reveal the wizard, melt the ward).

**Scroll-scrubbed video (Conjuring Studio).** The incantation types itself, then the video renders frame-by-frame as the user scrolls. This is the page's most literal demonstration of "prompt in, interface out."

**Prompt in → interface out.** The Spellforge window in the Conjuring section is the page's central visual metaphor. The prompt text must always describe what the footage actually shows — the correspondence between word and rendered result is the whole point.

**Reduced-motion respect.** All scroll-driven animations, WebGL scenes, and the aurora text gradient respect `prefers-reduced-motion`. Static fallbacks (images, final-state renders) are always present. This is non-negotiable — the page's magic should never come at the cost of accessibility.

**Particle sparks.** Used sparingly: gold additive-blend sparks on the win screen in the game. Reinforce the arcane register without overwhelming.

---

## 8. Tagline Bank

On-brand one-liners for social, OG tags, sub-headlines, and promotional use.

1. **"Are You One of Us?"** — the page's primary question; always the hero headline.
2. **"Every developer is a wizard underneath."** — the IDENTITY thesis in one line.
3. **"Prompt in, interface out. That's the magic."** — the POWER thesis distilled.
4. **"Conjured from plain sentences. Every pixel."** — proof statement for demos and OG.
5. **"The order doesn't recruit — it recognises."** — the invitation; use at closing beats.
6. **"Your incantation. An agent. A front-end."** — process in three beats; good for short-form.
7. **"Agentic coding doesn't replace you. It reveals you."** — IDENTITY thesis with tension.
8. **"The spell was always yours. Now you have the words."** — closing invitation / CTA framing.
