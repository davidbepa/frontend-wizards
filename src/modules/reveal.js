// ─────────────────────────────────────────────────────────────────────────────
// The Reveal — the grimoire.
//
// The closing beat hands the visitor the spellbook: for every module on the page
// it shows the generic build prompt that conjured it, plus the prompts that
// generated its art (images / video). Every prompt is portable — it uses
// {{PLACEHOLDERS}} for brand specifics and tells the agent to obey the project's
// own design system — so a reader can paste them into any agent and summon the
// same modules on their own site.
//
// Prompts are deliberately precise: exact libraries, constants, timings and
// function-level behaviour, so a coding/asset agent can rebuild faithfully.
//
// Pure DOM + clipboard. No WebGL, no scroll loop. Cards reveal via the shared
// .reveal observer (scroll.js); copy buttons use the async Clipboard API with a
// graceful execCommand fallback.
// ─────────────────────────────────────────────────────────────────────────────

// Each entry mirrors one module in the scroll. `build` is the coding incantation;
// `assets` are the image/video generation prompts that module needs (if any).
// `kind` drives the tag colour: 'build' | 'image' | 'video'. Text uses backticks
// so the embedded code literals ('webgl2', 'lighter', …) need no escaping.
const GRIMOIRE = [
  {
    name: 'Hero',
    summary: 'Full-bleed looping background video behind a headline, subhead and CTAs.',
    build: {
      kind: 'build',
      label: 'Incantation · build',
      text: `Build a full-viewport hero (min-height 100svh) as a layered stack in HTML/CSS + a vanilla-JS controller. Markup: a background <video muted loop playsinline preload="auto" poster="{{HERO_POSTER}}"> absolutely positioned, object-fit:cover, behind a CSS gradient scrim; a sibling <img class="hero-fallback" alt="" aria-hidden="true"> with NO src attribute (set lazily); and a centred content column — eyebrow line, two-line <h1> whose second line carries the brand gradient/accent treatment, a 1–2 sentence subhead, a primary + a ghost button, a footnote, and an animated scroll-cue anchored to the next section. Controller logic, in order: (1) if window.matchMedia('(prefers-reduced-motion: reduce)').matches → video.removeAttribute('autoplay'), video.pause(), call showFallback(), return; (2) else tryPlay(): const p = video.play(); if (p && p.catch) p.catch(showFallback) — a rejected promise means autoplay was blocked; (3) video.addEventListener('error', showFallback) and 'playing' → hideFallback; (4) video.addEventListener('canplay', tryPlay, {once:true}); (5) an IntersectionObserver(threshold:0.05) pauses the video off-screen and tryPlay()s when it returns; (6) a 'visibilitychange' listener pauses on document.hidden and tryPlay()s when visible AND still in view. showFallback() must set img.src to {{HERO_FALLBACK}} only if it has no src yet (so it is never downloaded on devices that successfully play the video) and add a .show-fallback class; hideFallback() removes it. Never play audio. Pull every colour, type ramp, spacing, gradient and the scrim from the project design system ({{DESIGN_SYSTEM}}) as tokens — no literals — and write copy in the site voice from {{BRAND_GUIDELINES}}.`,
    },
    assets: [
      {
        kind: 'video',
        label: 'Conjure · background video',
        text: `A 1920×1080 (16:9) H.264 MP4, ~10–12s, that LOOPS SEAMLESSLY — first and last frames identical with matched motion so there is no visible jump. Slow, low-amplitude motion ONLY (drifting particles / volumetric light / a gentle parallax push); no cuts, no camera shake, no on-screen text. Keep the central ~60% and the lower third low-contrast and uncluttered — headline, subhead and buttons sit there over a dark scrim, so the grade must stay dark-to-mid to preserve WCAG contrast on light text. Theme: {{SITE_THEME}}; mood: {{MOOD}}; colour-graded strictly to the brand palette {{BRAND_COLORS}}. 24–30 fps, target file ≤10 MB, faststart enabled.`,
      },
      {
        kind: 'image',
        label: 'Conjure · poster + fallback',
        text: `Two 1920×1080 JPEG stills (quality ~80, ≤150 KB each) matching the hero video's composition, palette {{BRAND_COLORS}}, exposure and mood: (1) poster.jpg = the video's exact first frame, for the <video poster> attribute; (2) fallback.jpg = a representative frame shown under reduced-motion or blocked autoplay. Both must keep the centre and lower third low-contrast and uncluttered for an overlaid headline. No text, no logos, no borders.`,
      },
    ],
  },
  {
    name: 'X-Ray Reveal',
    summary: 'A WebGL stage that distorts a portrait to reveal a hidden "true form" beneath the cursor.',
    build: {
      kind: 'build',
      label: 'Incantation · build',
      text: `Build an interactive "x-ray reveal" WebGL stage with three.js. CAPABILITY GATE: if matchMedia('(prefers-reduced-motion: reduce)').matches OR WebGL is unavailable (try canvas.getContext('webgl2') || getContext('webgl')) → render a static composite of two stacked <img> (base portrait + glowing line-art outline) whose src is set only when shown; otherwise build the live scene and re-evaluate on a prefers-reduced-motion change. LIVE SCENE: new THREE.WebGLRenderer({canvas, antialias:false, alpha:false, powerPreference:'low-power'}), renderer.outputColorSpace = SRGBColorSpace; THREE.OrthographicCamera(-1,1,1,-1,0,1) + a full-screen THREE.PlaneGeometry(2,2) with a custom ShaderMaterial (depthTest:false, depthWrite:false). Load THREE textures via TextureLoader — base portrait {{BASE_IMG}}, photoreal "true form" {{REVEAL_IMG}}, line-art outline {{OUTLINE_IMG}} — each with colorSpace = NoColorSpace (the shader composites manually; sRGB-decoding here would render ~2× too dark), LinearFilter min/mag, generateMipmaps:false, ClampToEdgeWrapping; pass each image's width/height aspect as a uniform and cover-fit a 4:5 frame in-shader. REVEAL MECHANIC (cheap flowmap, no render targets): keep an offscreen 2D <canvas> trail of TRAIL_SIZE = 256 (192 on coarse pointers), uploaded as a THREE.CanvasTexture (NoColorSpace) each frame. On 'pointermove' (iterate event.getCoalescedEvents() for smooth fast strokes) convert clientX/Y to a 0..1 fraction of the canvas rect and stamp the segment from the previous fraction to the current one: walk it in steps ≈ ceil(dist/(radius*0.4)) (radius ≈ 0.17×TRAIL_SIZE), drawing radial-gradient discs rgba(255,255,255,0.55)→rgba(255,255,255,0) with ctx.globalCompositeOperation='lighter'; reset lastFrac on pointerleave/cancel to avoid streaks. Each frame, decay the whole trail toward black: globalCompositeOperation='source-over', fillRect with rgba(0,0,0,0.025) (smaller alpha = longer tail), then trailTex.needsUpdate=true. The FRAGMENT SHADER reads the trail to (a) displace the base UVs (uDistortAmp≈0.05) with an RGB channel split + film grain (uGrainAmp≈0.06, uExposure≈0.78), (b) cross-dissolve to the photoreal form once trail exceeds uWizardThreshold≈0.18, breaking up the edge into gold dust/sparks (per-pixel feather so it granulates, not a hard contour), and (c) flash the line-art outline along the dissolving edge; layer a slow ambient sweep (uSweepSpeed≈0.06 → ~8s reveal + ~8s rest) and a soft bloom (≈0.6) in the brand accent. On coarse/no-hover pointers, synthesize a drifting reveal point from sin(time) instead of the cursor. PLUMBING: cap DPR at 2 (1.5 on mobile); a ResizeObserver re-runs renderer.setSize + uResolution; an IntersectionObserver(threshold:0.02) plus 'visibilitychange' start/stop the requestAnimationFrame loop (zero work off-screen; the loop owns ALL writes); on 'webglcontextlost' call preventDefault() and drop to the static fallback; on teardown cancelAnimationFrame, disconnect observers, remove listeners, dispose geometry, material, all textures and renderer, then renderer.forceContextLoss(). Take the frame, accent glow colour and exposure from the project design system ({{DESIGN_SYSTEM}}) as tokens.`,
    },
    assets: [
      {
        kind: 'image',
        label: 'Conjure · base portrait',
        text: `A {{SUBJECT}} portrait at 2:3 aspect, 1024×1536, with a neutral "before" feeling, cleanly and evenly lit, graded to the brand palette {{BRAND_COLORS}}. Compose the subject centred with headroom and shoulders in frame so a 4:5 centre-crop still reads well (the stage cover-fits a 4:5 frame and trims top/bottom slightly). Plain or softly textured background, sharp focus, {{SITE_STYLE}} rendering. No text, no border, no frame. Export JPEG ~q82.`,
      },
      {
        kind: 'image',
        label: 'Conjure · revealed "true form"',
        text: `The SAME subject as the base portrait — identical framing, pose, scale and crop so the two register pixel-for-pixel (generate as an img2img / edit of the base at the same 2:3 1024×1536) — transformed into its themed "true form" per {{SITE_THEME}}: {{TRANSFORMATION}}. Photoreal/painterly with luminous rim-light and glowing accents in the brand accent {{ACCENT}}, pitched slightly higher-key than the base so it reads when revealed beneath. Same background placement, no text. Export JPEG ~q82.`,
      },
      {
        kind: 'image',
        label: 'Conjure · line-art outline',
        text: `A glowing single-colour line-art outline of that same "true form", with IDENTICAL 2:3 framing, pose and scale (1024×1536) so it overlays pixel-for-pixel with the other two. Thin luminous continuous strokes only — no fills, no shading — drawn entirely in the brand accent {{ACCENT}} on a pure-black background (it is composited additively, so black reads as transparent). Clean contours of the key shapes, high contrast, no text. Export PNG or JPEG ~q90.`,
      },
    ],
  },
  {
    name: 'Scroll-Scrubbed Render',
    summary: 'One scroll types a prompt, then scrubs a video frame-by-frame from "Generating…" to "Done ✓".',
    build: {
      kind: 'build',
      label: 'Incantation · build',
      text: `Build a desktop-only, scroll-scrubbed render demo in vanilla JS. Mount the scene ONLY when matchMedia('(min-width:768px)').matches (so phones never fetch the video) and rebuild on a prefers-reduced-motion change; tearing down must drop the <video> so any fetch/decoding stops. Structure: a tall .track (height 560vh — more vh = slower scrub) containing a position:sticky stage with two columns — left a .screen holding a <video muted playsinline preload="auto" tabindex="-1" src="{{RENDER_VIDEO}}"> that you NEVER call .play() on, right a simulated "prompt window" (chrome: traffic-light dots + title; body: a label and a typed line with a blinking caret; footer: a status). Drive everything from one progress value p = clamp(-rect.top / (rect.height - innerHeight), 0, 1) of the track. Constants: SCRUB_END=0.88 (content uses this much; the tail pins the finished state for a beat), TYPING_END=0.42, DONE_AT=0.95; scrub = clamp(p/SCRUB_END, 0, 1). BEAT 1 (type): typed = clamp(scrub/TYPING_END, 0, 1); show round(typed × PROMPT.length) characters of the incantation while the video stays on frame 0. BEAT 2 (render): only after typing completes, videoScrub = clamp((scrub-TYPING_END)/(DONE_AT-TYPING_END), 0, 1) and targetTime = videoScrub × video.duration. Phase = scrub≥DONE_AT ? 'done' : typed≥1 ? 'generating' : 'typing', shown as a button → spinner badge → "Done ✓". CRITICAL PERF SPLIT: the 'scroll'/'resize' handler does READS ONLY (measure the rect; store targetTime, char count and desired phase); a requestAnimationFrame loop does ALL writes (set the typed text, set the phase, and seek the video) and always chases the LATEST stored target. Guard seeking with a boolean: set seeking=true before video.fastSeek(targetTime) (fallback video.currentTime = targetTime), clear it on the 'seeked' event, and skip when Math.abs(targetTime - video.currentTime) ≤ 0.01 — so overlapping seeks never queue and intermediate frames are never decoded. Fade the video in on 'loadeddata'/'loadedmetadata'. Run the rAF loop only while an IntersectionObserver(rootMargin:'256px 0px') reports in-view; do zero work otherwise. REDUCED-MOTION path: no loop — set the full prompt text, phase 'done', and park the video on its last frame (currentTime = duration - 0.05). The typed PROMPT text must literally describe what the footage shows. Teardown: cancelAnimationFrame, disconnect the observer, remove scroll/resize/seeked listeners, video.removeAttribute('src'); video.load(). Style the window chrome, fonts and status badges from the project design system ({{DESIGN_SYSTEM}}).`,
    },
    assets: [
      {
        kind: 'video',
        label: 'Conjure · render video',
        text: `A {{SUBJECT}} transformation video, PORTRAIT 2:3 or 9:16 (e.g. 1080×1620), ~8–12s, authored to be SCRUBBED frame-by-frame (it is seeked, never played): smooth, strictly MONOTONIC motion with no cuts, flashes or camera shake, and clearly distinct first vs last frames so seek position is legible. It opens on an ordinary "before" state and resolves continuously into the site's themed "after" ({{TRANSFORMATION}}) — ideally a slow turn-to-camera or build-up — ending held on a finished hero frame. Spread the change EVENLY across the timeline (don't bunch it into the final second). Graded to {{BRAND_COLORS}}, {{SITE_STYLE}}, no text. The transformation MUST match the incantation copy displayed beside it. Export H.264 MP4 at 30 fps with a high bitrate (clean seeking) and faststart.`,
      },
    ],
  },
  {
    name: 'Creature Behind Glass',
    summary: 'A WebGL pane the cursor tilts and clears to reveal a looping creature that pounds the glass.',
    build: {
      kind: 'build',
      label: 'Incantation · build',
      text: `Build a WebGL "creature behind glass" stage with three.js. CAPABILITY GATE identical to the x-ray module: reduced-motion or no-WebGL → a static composite of two stacked <img> (creature poster {{CREATURE_POSTER}} + barrier/ice overlay {{BARRIER_IMG}}, srcs set lazily) and the <video> is NEVER created in that path. LIVE SCENE: WebGLRenderer({antialias:false, alpha:false, powerPreference:'low-power'}); renderer.setClearColor to the site's deepest surface colour so any sliver revealed at an extreme tilt blends into the edge instead of flashing black; a THREE.PerspectiveCamera(38° fov, position z=3) (wide-ish fov exaggerates the tilt depth) and a THREE.PlaneGeometry(1,1) inside a THREE.Group ("pane") that you rotate toward the pointer; scale the mesh to fill the view at z=0 (vH = 2·z·tan(fov·π/360), vW = vH·aspect) times OVERSCAN=1.5 so a corner tilt never reveals a frame edge (the stage clips it). CREATURE: a <video muted playsinline preload="auto"> with loop=false, kept IN the DOM hidden behind the canvas (detached videos get decode-throttled on iOS/Safari and freeze the texture), wrapped in THREE.VideoTexture (colorSpace NoColorSpace, LinearFilter, no mipmaps); src="{{CREATURE_VIDEO}}". BARRIER: load {{BARRIER_IMG}} as a texture (same settings) used in-shader as a refraction/relief map (uDistort≈0.065) over the creature, with a constant base clarity (uReveal≈0.5) and an icy crack tint. INTERACTION: on 'pointermove', store targetTilt = ((x/rect.w)*2-1, (y/rect.h)*2-1) ∈ [-1,1]; the rAF loop eases pane.rotation.y → targetTilt.x*MAX_TILT and pane.rotation.x → -targetTilt.y*MAX_TILT with MAX_TILT=0.15 rad using a frame-rate-independent factor k = 1 - pow(0.0015, dt); feed uParallax = (rot.y*0.5, -rot.x*0.5) so the creature slides against the glass for depth. On coarse pointers, drive the tilt from 'deviceorientation' instead (call DeviceOrientationEvent.requestPermission() on the first 'pointerdown' for iOS; remap beta/gamma onto screen axes via screen.orientation.angle so landscape doesn't invert; TILT_RANGE=15° maps to full tilt; slowly drift the neutral gyroBase toward the current hold), with a slow sin() auto-sway until a finger or sensor is active. IMPACT SYNC: the clip strikes the glass at fixed PUNCH_TIMES=[3.2, 5.4] seconds; each frame, when video.currentTime crosses a punch time (guard vt ≥ prevVideoT to skip the loop-wrap frame), drive (a) a shader pressure-bloom uImpact = max over hits of exp(-(vt - t)*4.5), and (b) a decaying camera shake: schedule echoes [{delay:0,amp:1.0},{delay:0.15,amp:0.45},{delay:0.3,amp:0.2}], set shake=max(shake,amp) as each fires, decay shake *= pow(0.0007, dt) per frame, and offset camera.position.x = shake²·0.09·sin(t·96) and .y = shake²·0.07·sin(t·78+1.7) (squared so it reads as a sharp hit, tiny vs the 1.5× overscan). MANUAL LOOP (still pause between repeats): loop=false; on 'ended', after REPEAT_GAP=3000 ms call video.play() again (clear any pending replay timer on every (re)start so an off-screen pause can't queue a stale restart). LIFECYCLE: IntersectionObserver(threshold:0.02) plays the clip + starts the loop in view and pauses the video out of view; 'visibilitychange' mirrors that; ResizeObserver re-sizes; 'webglcontextlost' → static fallback; teardown disposes geometry/material/all textures, pauses + removeAttribute('src') + load() + removes the video, disposes the renderer and forceContextLoss(). Frame, glow, clear colour and the cool tints come from the project design system ({{DESIGN_SYSTEM}}).`,
    },
    assets: [
      {
        kind: 'video',
        label: 'Conjure · creature loop',
        text: `A seamless-looping creature video, square 1:1 at 720×720, ~6–8s, in which {{CREATURE}} presses toward the camera out of darkness behind an implied pane of glass. It MUST land two clear forward STRIKES/lunges at ≈3.2s and ≈5.4s into the clip — the app jolts the screen on those exact frames, so make the impacts sharp and unambiguous. Keep the eyes/face readable and roughly centred so they can appear to track a cursor. Cold, dark, high-contrast lighting graded to {{BRAND_COLORS}}; rest the loop on a near-still framing at start and end so a 3-second pause between repeats looks natural. No text. Export H.264 MP4 with a poster frame.`,
      },
      {
        kind: 'image',
        label: 'Conjure · creature poster',
        text: `A 720×720 (1:1) still from the creature loop — ideally the loop's resting frame — same subject, palette {{BRAND_COLORS}} and framing. Used as the <video> poster and as the reduced-motion fallback shown beneath the barrier overlay. No text. Export JPEG ~q82.`,
      },
      {
        kind: 'image',
        label: 'Conjure · barrier texture',
        text: `A full-frame {{BARRIER}} texture (frosted ice / cracked glass / fog) at 720×720+ (1:1) that overlays as the pane AND doubles as a relief/refraction map. Even, edge-to-edge coverage of semi-translucent frost with fine cracks and crystalline micro-detail; NO large clear holes, no vignette, no focal subject. Mostly mid/high luminance with a subtle cool tint graded to {{BRAND_COLORS}} (the app refracts the creature by this image's brightness, so include varied micro-relief). No text. Export PNG or JPEG ~q88.`,
      },
    ],
  },
  {
    name: 'Maze Arcade Game',
    summary: 'A lazy-loaded Phaser maze-chaser in a cabinet, fully reskinned to the site theme.',
    build: {
      kind: 'build',
      label: 'Incantation · build',
      text: `Build a self-contained 2D maze arcade game with Phaser 3, themed to {{SITE_THEME}}, mounted in a framed "cabinet". LAZY EVERYTHING: render only an overlay with a Play button until the user clicks; on click, dynamic import() the game factory + an audio module, resume()/unlock the AudioContext INSIDE the click gesture, boot Phaser into the cabinet element, reveal an Exit button, and capture Arrow/WASD keys ONLY while the game exists so it never fights page scroll (Exit or 'Escape' calls game.destroy(true) and hands the keyboard back). PHASER CONFIG: type Phaser.AUTO, scale {mode:FIT, autoCenter:CENTER_BOTH}, width/height = VIEW × DPR where the logical VIEW is a tile grid — TILE=30 logical px, COLS=19, ROWS=21 (both ODD for clean maze generation, walls on even indices), plus a HUD band HUD_H=56 (VIEW ≈ 570×686); cap DPR at 2 and have each scene zoom its camera by DPR so it stays crisp on Retina; scenes [Preloader, Game, UI, Results]. ART is fully PROCEDURAL — draw every sprite with Graphics → generateTexture() in the brand palette (supersample ~3× then downscale for crisp edges) — with OPTIONAL PNG OVERRIDES: the Preloader tries to load public/assets/maze/<key>.png for keys hero, bug0, bug1, bug2, bug3, rune, potion, spark, bonus, life and, if present, uses them in place of the procedural texture (zero code change). GAMEPLAY = classic maze-chaser: generate a fresh random maze per level (carve on odd cells; a "braid" factor removes dead-ends — higher = loopier/easier), scatter collectible "runes" + a few "potions"; collecting ALL runes clears the level. {{ENEMY_COUNT}} (3–4) enemies hunt with four distinct PERSONALITIES — chaser (targets your tile), ambusher (targets N tiles ahead of you), flanker (targets a tile reflected through a partner enemy), wanderer (roams, then commits) — under a global mode that alternates scatter ↔ chase on per-level timers (e.g. scatterMs 5000–7000, chaseMs 20000–30000); each enemy steps toward the candidate tile minimising squared distance to its target and may not reverse. Eating a potion → "frightened" for a per-level frightenedMs (≈4000–7000, ending on a blink): enemies turn vulnerable and flee, and banishing them in one potion CHAINS 200 → 400 → 800 → 1600. SCORING: rune 10, potion 50, level clear 500, extra life every 5000 points; START_LIVES = 3. Provide 3 escalating levels (faster, braver bugs; lower braid; shorter potion). CONTROLS: Arrows + WASD + touch swipe; movement is tile-aligned (only turn at cell centres). Persist the high score in localStorage under a versioned key and show a "best run" line on the overlay. Respect prefers-reduced-motion via a 'reduced' flag (drop non-essential particle juice + screen-shake). Reskin every label, colour and entity to the site theme and design system ({{DESIGN_SYSTEM}}); the cabinet frame uses the brand accent.`,
    },
    assets: [
      {
        kind: 'image',
        label: 'Conjure · sprite overrides (optional)',
        text: `OPTIONAL art to override the game's procedural sprites — the engine runs fully with none. Supply individual transparent PNGs matched by filename, themed to {{SITE_THEME}} and coloured to the brand palette {{BRAND_COLORS}}: hero (a single forward-facing character ≈36px logical; the engine animates the chomp), bug0/bug1/bug2/bug3 (four visually distinct enemies ≈34px, each a different brand hue), rune (small collectible pip ≈18px), potion (power-up ≈30px), bonus (a treat/fruit-equivalent ≈28px), life (HUD life icon ≈26px), spark (a soft radial particle ≈64px for banish bursts). Draw each at 3× the listed size, centred on a transparent square canvas, flat high-contrast shapes with legible silhouettes at a 30px tile, no text.`,
      },
    ],
  },
]

const COPIED_MS = 1600

// Copy `text` to the clipboard; resolve true on success. Falls back to a hidden
// textarea + execCommand where the async API is unavailable (older / insecure ctx).
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// Build one prompt block (tag + copy button + the prompt text).
function promptBlock(prompt) {
  const block = document.createElement('div')
  block.className = 'gc-prompt'
  block.innerHTML = `
    <div class="gc-prompt-head">
      <span class="gc-tag gc-tag--${prompt.kind}">${prompt.label}</span>
      <button class="gc-copy" type="button" data-copy aria-label="Copy this prompt">
        <span class="gc-copy-label">Copy</span>
      </button>
    </div>
    <p class="gc-text"></p>`
  // Set as textContent so quotes/braces are never parsed as HTML.
  block.querySelector('.gc-text').textContent = prompt.text
  return block
}

function renderCard(entry) {
  // <details> gives accessible, keyboard-friendly collapse with zero JS.
  const card = document.createElement('details')
  card.className = 'grimoire-card reveal'
  card.innerHTML = `
    <summary class="gc-head">
      <span class="gc-heading">
        <h3 class="gc-name">${entry.name}</h3>
        <span class="gc-summary">${entry.summary}</span>
      </span>
      <span class="gc-toggle" aria-hidden="true"></span>
    </summary>
    <div class="gc-prompts"></div>`

  const prompts = card.querySelector('.gc-prompts')
  prompts.appendChild(promptBlock(entry.build))
  entry.assets.forEach((a) => prompts.appendChild(promptBlock(a)))
  return card
}

export function initReveal() {
  const mount = document.querySelector('[data-spellbook]')
  if (!mount) return

  const grid = document.createElement('div')
  grid.className = 'grimoire-grid'
  GRIMOIRE.forEach((entry) => grid.appendChild(renderCard(entry)))
  mount.appendChild(grid)

  // One delegated click handler for every copy button.
  const timers = new WeakMap()
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]')
    if (!btn) return
    const text = btn.closest('.gc-prompt')?.querySelector('.gc-text')?.textContent
    if (!text) return

    const ok = await copyText(text)
    const label = btn.querySelector('.gc-copy-label')
    if (label) label.textContent = ok ? 'Copied ✓' : 'Press ⌘C'
    btn.classList.toggle('is-copied', ok)

    clearTimeout(timers.get(btn))
    timers.set(
      btn,
      setTimeout(() => {
        if (label) label.textContent = 'Copy'
        btn.classList.remove('is-copied')
      }, COPIED_MS)
    )
  })
}
