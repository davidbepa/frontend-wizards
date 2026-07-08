// ─────────────────────────────────────────────────────────────────────────────
// The Descent — a scroll-parallax fall through the craft.
//
// The story beat after "Cast it yourself": casting is only the surface. Scroll
// and the order pulls you DOWN — a robed wizard plummets through a deep shaft
// while the strata of the craft (the runes you already speak, components, state,
// systems, architecture) rise and rush past. The lesson, in the page's own key:
// with an agent you don't climb the learning curve, you fall through it.
//
// How it's built (mirrors conjure.js / iceWall.js conventions):
//   • A tall track with a position:sticky full-viewport stage that pins while you
//     fall. One scroll progress (0→1) drives every layer; the fall VELOCITY
//     (eased by Lenis, read off window.scrollY) stretches the dust into streaks.
//   • Layers, back→front: a CSS gradient void · the user's falling video
//     (/descent.mp4, scrubbed frame-by-frame by scroll — it never auto-plays) ·
//     a CSS depth-scrim that darkens as you go deeper · a WebGL
//     atmosphere canvas (god-rays, embers, speed-smears) screened over the top ·
//     the parallax sigil strata · the falling wizard (a green-screen clip
//     /wizard-falling.mp4 keyed to transparency in a second alpha canvas and
//     scrubbed by scroll just like the background) · the story beats · a depth
//     rail. Each layer degrades independently.
//   • Capability gates: prefers-reduced-motion → a static composite (poster +
//     punchline, no loop, no video, natural height). No WebGL OR no
//     mix-blend-mode:screen → the atmosphere canvas is skipped; the DOM scene
//     stays and the wizard falls back to the static /wizard-falling.webp.
//   • IntersectionObserver + visibilitychange pause the render loop off-screen
//     (the video is paused throughout — only its frame is seeked); ResizeObserver
//     keeps the canvas sized; full teardown disposes
//     three.js, the video and every listener.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import {
  vertexShader,
  fragmentShader,
  wizardVertexShader,
  wizardFragmentShader,
} from './gl/descentShaders.js'

const VIDEO_SRC = '/descent.mp4' // the falling background video (user-provided)
const POSTER_SRC = '/descent-poster.jpg' // reduced-motion / pre-video backdrop
const WIZARD_VIDEO_SRC = '/wizard-falling.mp4' // the tumbling wizard on green screen
const WIZARD_SRC = '/wizard-falling.webp' // static wizard (reduced-motion / no-WebGL)

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const mqCoarse = window.matchMedia('(hover: none), (pointer: coarse)')

const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n)
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)

// ── Tool sigils — real front-end tech logos rendered as glowing gold line-art ──
// The strata you fall past are the actual tools of the craft. Each logo is drawn
// in a single colour (stroke/fill = currentColor) so the stage's gold tint and
// drop-shadow turn it into a luminous falling emblem, on-brand with the arcane
// sigils it replaced. All on a 0 0 100 100 canvas (24×24 for tailwind) for even
// sizing.
const GLYPHS = {
  // React — the atom (three orbits + a nucleus)
  react: `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 50)"><circle r="7.5" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="4.5"><ellipse rx="43" ry="16.5"/><ellipse rx="43" ry="16.5" transform="rotate(60)"/><ellipse rx="43" ry="16.5" transform="rotate(120)"/></g></g></svg>`,
  // Vue — the double chevron
  vue: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M4 18 L24 18 L50 61 L76 18 L96 18 L50 92 Z M39 18 L50 37 L61 18 Z"/></svg>`,
  // JavaScript — JS in a rounded square
  javascript: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="7" y="7" width="86" height="86" rx="14" fill="none" stroke="currentColor" stroke-width="5"/><text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="system-ui,'Segoe UI',Helvetica,Arial,sans-serif" font-weight="800" font-size="42" fill="currentColor">JS</text></svg>`,
  // TypeScript — TS in a rounded square
  typescript: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="7" y="7" width="86" height="86" rx="14" fill="none" stroke="currentColor" stroke-width="5"/><text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="system-ui,'Segoe UI',Helvetica,Arial,sans-serif" font-weight="800" font-size="42" fill="currentColor">TS</text></svg>`,
  // Tailwind CSS — the twin waves (native 24×24 logo geometry)
  tailwind: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 6c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35C13.4 10.84 14.55 12 17 12c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C15.6 7.16 14.45 6 12 6ZM7 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35C8.4 16.84 9.55 18 12 18c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C10.6 13.16 9.45 12 7 12Z"/></svg>`,
  // Node.js — the hexagon
  nodejs: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" d="M50 6 L89 28 L89 72 L50 94 L11 72 L11 28 Z"/></svg>`,
  // GraphQL — the connected triangle
  graphql: `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.5"><path d="M50 12 L15 74 L85 74 Z"/><path d="M32 43 L68 43 L50 74 Z"/></g><g fill="currentColor"><circle cx="50" cy="12" r="6"/><circle cx="15" cy="74" r="6"/><circle cx="85" cy="74" r="6"/><circle cx="32" cy="43" r="5"/><circle cx="68" cy="43" r="5"/><circle cx="50" cy="74" r="5"/></g></svg>`,
  // Git — the branch inside the diamond
  git: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" d="M50 7 L93 50 L50 93 L7 50 Z"/><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M42 68 L42 38"/><path d="M42 48 Q42 40 52 40 L61 40"/></g><g fill="currentColor"><circle cx="42" cy="69" r="6"/><circle cx="42" cy="37" r="6"/><circle cx="63" cy="40" r="6"/></g></svg>`,
  // Vite — the lightning bolt
  vite: `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M58 6 L26 52 L45 52 L38 94 L74 44 L53 44 Z"/></svg>`,
}

// The strata you fall past — the real tools of the craft. t0 = scroll progress
// where it crosses centre; depth 0..1 sets size/speed/sharpness (1 = near
// foreground, rushes by big & crisp); label names the tool (drives the story).
const SIGILS = [
  { g: 'react', x: 0.5, t0: 0.06, depth: 0.88, spin: -8, label: 'React' },
  { g: 'javascript', x: 0.17, t0: 0.14, depth: 0.5, spin: 6 },
  { g: 'tailwind', x: 0.83, t0: 0.21, depth: 0.72, spin: -12, label: 'Tailwind' },
  { g: 'typescript', x: 0.29, t0: 0.31, depth: 0.96, spin: 10, label: 'TypeScript' },
  { g: 'vite', x: 0.76, t0: 0.39, depth: 0.46, spin: -6 },
  { g: 'nodejs', x: 0.5, t0: 0.47, depth: 0.62, spin: 0, label: 'Node.js' },
  { g: 'vue', x: 0.2, t0: 0.55, depth: 0.82, spin: 14 },
  { g: 'graphql', x: 0.81, t0: 0.63, depth: 0.54, spin: -10, label: 'GraphQL' },
  { g: 'git', x: 0.37, t0: 0.71, depth: 0.92, spin: 8, label: 'Git' },
  { g: 'javascript', x: 0.67, t0: 0.81, depth: 0.5, spin: -8 },
  { g: 'react', x: 0.5, t0: 0.93, depth: 0.86, spin: 6 },
]

// Narrative beats that surface as you fall (centred subtitles). t0 = scroll
// progress where the line is fully lit.
const BEATS = [
  { t0: 0.13, html: 'Down past the runes you already speak.' },
  { t0: 0.4, html: 'Past the components, the patterns, the systems.' },
  { t0: 0.66, html: 'Years of the craft — falling away in seconds.' },
  {
    t0: 0.9,
    html: 'You don’t climb the learning curve.<br /><em>You fall through it.</em>',
    big: true,
  },
]

export function initDescent() {
  const mount = document.querySelector('[data-descent]')
  if (!mount) return

  let teardown = build(mount)

  // Rebuild on a motion-preference flip so the static/animated path is clean.
  mqReduce.addEventListener('change', () => {
    if (teardown) {
      teardown()
      teardown = null
    }
    mount.replaceChildren()
    teardown = build(mount)
  })
}

// ── Capability ────────────────────────────────────────────────────────────────
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
const supportsScreen = () =>
  typeof CSS !== 'undefined' &&
  CSS.supports &&
  CSS.supports('mix-blend-mode', 'screen')

// ── Build the scene; returns a teardown() ───────────────────────────────────────
function build(mount) {
  const reduce = mqReduce.matches

  // Tall scroll track; the stage pins inside it. The track height lives in CSS
  // (.descent-track / .descent-mount, gated on prefers-reduced-motion) so the
  // space is reserved BEFORE this lazy-loaded module builds — otherwise
  // initialising it would grow the document and jump the scroll-progress bar.
  // Reduced motion falls back to natural height.
  const track = document.createElement('div')
  track.className = 'descent-track'

  const stage = document.createElement('div')
  stage.className = 'descent-stage' + (reduce ? ' is-static' : '')
  track.appendChild(stage)
  mount.appendChild(track)

  // Always present: the void gradient lives on .descent-stage in CSS.
  const scrim = document.createElement('div')
  scrim.className = 'descent-scrim'
  scrim.setAttribute('aria-hidden', 'true')

  // ── Reduced motion: a static composite, no loop, no video ─────────────────────
  if (reduce) {
    stage.style.backgroundImage = `url(${POSTER_SRC})`
    stage.classList.add('has-poster')
    stage.appendChild(scrim)
    const beat = document.createElement('p')
    beat.className = 'descent-beat descent-beat--big is-static'
    beat.innerHTML = BEATS[BEATS.length - 1].html
    stage.appendChild(beat)
    stage.classList.add('is-live')
    return () => {}
  }

  // ── the falling background video (user-provided; gradient shows if absent) ─────
  const video = document.createElement('video')
  video.className = 'descent-video'
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('muted', '')
  video.setAttribute('aria-hidden', 'true')
  video.preload = 'auto'
  video.tabIndex = -1
  // The video IS the fall — scroll seeks its frames; it never plays on its own.
  // Deferred load: the multi-MB src is attached only when the section nears the
  // viewport (see the IntersectionObserver) so it never competes with the hero
  // for bandwidth on first paint.
  let videoReady = false
  let videoDuration = 0
  let srcSet = false
  const loadVideo = () => {
    if (srcSet) return
    srcSet = true
    video.src = VIDEO_SRC
  }
  const onVideoReady = () => {
    videoReady = true
    videoDuration = video.duration || 0
    video.classList.add('is-ready')
  }
  video.addEventListener('loadeddata', onVideoReady, { once: true })
  stage.appendChild(video)

  stage.appendChild(scrim)

  // ── WebGL atmosphere canvas (optional enhancement) ────────────────────────────
  let gl = null
  if (hasWebGL() && supportsScreen()) {
    const canvas = document.createElement('canvas')
    canvas.className = 'descent-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    stage.appendChild(canvas)
    gl = buildGL(canvas, stage)
  }

  // ── parallax sigil strata ─────────────────────────────────────────────────────
  const field = document.createElement('div')
  field.className = 'descent-field'
  field.setAttribute('aria-hidden', 'true')
  // Thin out the field on small / coarse screens to keep the fall buttery.
  const sigilDefs = mqCoarse.matches ? SIGILS.filter((_, i) => i % 2 === 0) : SIGILS
  const sigils = sigilDefs.map((s) => {
    const el = document.createElement('div')
    el.className = 'descent-sigil'
    el.style.left = s.x * 100 + '%'
    el.innerHTML =
      `<span class="ds-glyph">${GLYPHS[s.g]}</span>` +
      (s.label ? `<span class="ds-label">${s.label}</span>` : '')
    field.appendChild(el)
    return { el, ...s }
  })
  stage.appendChild(field)

  // ── the falling wizard ────────────────────────────────────────────────────────
  // A green-screen clip keyed to transparency in its own alpha canvas, scrubbed by
  // scroll like the background. Its frames are seeked (never auto-played), and it
  // fades in only once decoded so no black box flashes. If WebGL is unavailable we
  // fall back to the static PNG so the figure still falls.
  let wizard // the on-stage element (canvas or img), animated by updateWizard
  let wizardVideo = null
  let wizardGL = null
  let wizardReady = false
  let wizardDuration = 0
  let wizardSrcSet = false
  let wizardPrimed = false
  let wizardTime = 0 // eased seek target, mirrors the background scrub
  let wizardShown = false // has the fade-in class been added yet
  // no-ops unless the WebGL wizard is built (the PNG fallback needs neither)
  let loadWizardVideo = () => {}
  let primeWizardVideo = () => {}

  if (hasWebGL()) {
    wizardVideo = document.createElement('video')
    wizardVideo.muted = true
    wizardVideo.defaultMuted = true
    wizardVideo.playsInline = true
    wizardVideo.setAttribute('playsinline', '')
    wizardVideo.setAttribute('webkit-playsinline', '')
    wizardVideo.setAttribute('muted', '')
    wizardVideo.preload = 'auto'
    wizardVideo.tabIndex = -1

    const canvas = document.createElement('canvas')
    canvas.className = 'descent-wizard descent-wizard--video'
    canvas.setAttribute('aria-hidden', 'true')
    wizardGL = buildWizardGL(canvas, wizardVideo)
    if (wizardGL) {
      wizard = canvas
      stage.appendChild(wizard)
      wizardVideo.addEventListener(
        'loadeddata',
        () => {
          wizardReady = true
          wizardDuration = wizardVideo.duration || 0
        },
        { once: true }
      )
      // The multi-MB clip is attached only as the section nears the viewport, and
      // a single play→pause primes iOS to paint seeked frames (see the background
      // video for the same dance).
      loadWizardVideo = () => {
        if (wizardSrcSet) return
        wizardSrcSet = true
        wizardVideo.src = WIZARD_VIDEO_SRC
      }
      primeWizardVideo = () => {
        if (wizardPrimed) return
        wizardPrimed = true
        const pr = wizardVideo.play()
        if (pr && pr.then)
          pr.then(() => wizardVideo.pause()).catch(() => {
            wizardPrimed = false
          })
        else wizardVideo.pause()
      }
    } else {
      wizardVideo = null // WebGL init failed → drop to the static PNG below
    }
  }

  if (!wizardGL) {
    wizard = document.createElement('img')
    wizard.className = 'descent-wizard'
    wizard.alt = ''
    wizard.setAttribute('aria-hidden', 'true')
    wizard.src = WIZARD_SRC
    stage.appendChild(wizard)
  }

  // a11y: one honest description of the whole scene
  const sr = document.createElement('p')
  sr.className = 'descent-sr-only'
  sr.textContent =
    'A robed wizard plummets down a deep shaft as glowing emblems of the craft — React, JavaScript, TypeScript, Tailwind CSS, Node.js, Vue, GraphQL, Vite and Git — rise and rush past, illustrating that with an agent you fall through the learning curve rather than climbing it.'
  stage.appendChild(sr)

  // ── story beats ───────────────────────────────────────────────────────────────
  const beatsWrap = document.createElement('div')
  beatsWrap.className = 'descent-beats'
  const beats = BEATS.map((b) => {
    const el = document.createElement('p')
    el.className = 'descent-beat' + (b.big ? ' descent-beat--big' : '')
    el.innerHTML = b.html
    beatsWrap.appendChild(el)
    return { el, ...b }
  })
  stage.appendChild(beatsWrap)

  // ── depth rail (a quiet "how far you've fallen" gauge) ────────────────────────
  const rail = document.createElement('div')
  rail.className = 'descent-rail'
  rail.setAttribute('aria-hidden', 'true')
  rail.innerHTML =
    `<span class="dr-line"></span><span class="dr-bead"></span><span class="dr-depth">0 m</span>`
  stage.appendChild(rail)
  const railBead = rail.querySelector('.dr-bead')
  const railDepth = rail.querySelector('.dr-depth')

  // ── loop state ────────────────────────────────────────────────────────────────
  let inView = false
  let disposed = false
  let rafId = 0
  let prevY = window.scrollY
  let vel = 0
  let started = false
  let lastDepth = -1
  let videoTime = 0 // eased seek target so the scrub doesn't snap frame-to-frame

  const updateWizard = (p, time) => {
    // a slow tumble + bob, leaning harder the faster the fall — the camera falls
    // with the wizard, so he stays roughly centred and reacts in place.
    const sway = Math.sin(p * Math.PI * 4 + 0.4)
    const bob = Math.sin(time * 0.9)
    const rot = sway * 7 + vel * 9
    const tx = sway * 3.2 // vw
    const ty = bob * 1.6 + p * 4 // % — drifts a touch deeper over the fall
    const sc = 1 + Math.sin(time * 0.5) * 0.012 + vel * 0.03
    const stretch = 1 + vel * 0.16
    wizard.style.transform =
      `translate(-50%, -50%) translate(${tx}vw, ${ty}%) ` +
      `rotate(${rot}deg) scale(${sc}, ${sc * stretch})`
  }

  // The shaft's vanishing point sits below screen centre (where the fall
  // converges). VP_BELOW is its distance from centre in viewport-heights — it
  // sets how steeply the sigils fan outward along the perspective rays.
  const VP_BELOW = 0.34
  const updateSigils = (p) => {
    const vh = window.innerHeight
    const aspect = window.innerWidth / vh
    for (let i = 0; i < sigils.length; i++) {
      const s = sigils[i]
      const rel = p - s.t0
      const span = 0.15 + (1 - s.depth) * 0.12
      const dist = Math.abs(rel) / span
      if (dist >= 1) {
        if (s.el.style.opacity !== '0') s.el.style.opacity = '0'
        continue
      }
      // streams up-and-OUT along its radial from the vanishing point as the fall
      // passes it — emerging near bottom-centre, fanning toward the edge. Near
      // layers travel further/faster, so they fan wider.
      const travel = -rel * vh * (0.6 + s.depth * 1.5)
      const tx = (-travel * (s.x - 0.5) * aspect) / VP_BELOW
      const scale = 0.45 + s.depth * 1.05
      const stretch = 1 + vel * s.depth * 0.6
      const opacity = (1 - dist * dist) * (0.32 + 0.68 * s.depth)
      const blur = (1 - s.depth) * 4 + dist * 2.5
      s.el.style.opacity = opacity.toFixed(3)
      s.el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none'
      s.el.style.transform =
        `translate(-50%, -50%) translate(${tx.toFixed(1)}px, ${travel.toFixed(1)}px) ` +
        `rotate(${s.spin}deg) scale(${scale.toFixed(3)}, ${(scale * stretch).toFixed(3)})`
    }
  }

  const updateBeats = (p) => {
    for (let i = 0; i < beats.length; i++) {
      const b = beats[i]
      const rel = Math.abs(p - b.t0)
      const span = 0.12
      const o = clamp(1 - rel / span, 0, 1)
      const e = smooth(o)
      b.el.style.opacity = e.toFixed(3)
      b.el.style.transform = `translate(-50%, -50%) translateY(${((1 - e) * 26).toFixed(1)}px)`
    }
  }

  const updateRail = (p) => {
    railBead.style.top = (8 + p * 84) + '%'
    const depth = Math.round(p * 1320)
    if (depth !== lastDepth) {
      lastDepth = depth
      railDepth.textContent = depth + ' m'
      railDepth.style.top = (8 + p * 84) + '%'
    }
  }

  const tick = (now) => {
    if (disposed) return
    if (!inView) {
      rafId = 0
      return // zero work off-screen
    }
    rafId = requestAnimationFrame(tick)

    const time = now * 0.001

    // progress of the fall through the pinned track
    const rect = track.getBoundingClientRect()
    const denom = rect.height - window.innerHeight
    const p = denom > 0 ? clamp(-rect.top / denom, 0, 1) : 0

    // fall velocity off the (Lenis-eased) window scroll
    const y = window.scrollY
    const inst = clamp(Math.abs(y - prevY) / (window.innerHeight * 0.45), 0, 1)
    prevY = y
    vel = lerp(vel, inst, 0.18)

    stage.style.setProperty('--p', p.toFixed(4))
    updateWizard(p, time)
    updateSigils(p)
    updateBeats(p)
    updateRail(p)

    // the video is the fall: scroll seeks the frame, the clip never auto-plays.
    // currentTime is eased toward p·duration so the scrub glides instead of snaps.
    if (videoReady && videoDuration > 0) {
      const target = clamp(p, 0, 0.999) * videoDuration
      videoTime = lerp(videoTime, target, 0.35)
      if (!video.seeking && Math.abs(video.currentTime - videoTime) > 0.01) {
        video.currentTime = videoTime
      }
    }

    // the wizard clip scrubs the same way, then is keyed to transparency in GL.
    if (wizardGL && wizardReady && wizardDuration > 0) {
      const target = clamp(p, 0, 0.999) * wizardDuration
      wizardTime = lerp(wizardTime, target, 0.35)
      if (!wizardVideo.seeking && Math.abs(wizardVideo.currentTime - wizardTime) > 0.01) {
        wizardVideo.currentTime = wizardTime
      }
      wizardGL.render()
      if (!wizardShown) {
        wizardShown = true
        wizard.classList.add('is-ready') // fade in only once footage is decoded
      }
    }

    if (gl) gl.render(time, p, vel)

    if (!stage.classList.contains('is-live')) stage.classList.add('is-live')
  }

  const startLoop = () => {
    if (!rafId && !disposed) {
      prevY = window.scrollY
      rafId = requestAnimationFrame(tick)
    }
  }

  // Some browsers (notably iOS Safari) won't paint a seeked frame until the video
  // has played at least once. Prime it: a single play→pause unlocks frame
  // rendering, then scroll drives currentTime. A rejected play just leaves the
  // gradient until the first seek lands.
  let primed = false
  const primeVideo = () => {
    if (primed) return
    primed = true
    const pr = video.play()
    if (pr && pr.then) pr.then(() => video.pause()).catch(() => { primed = false })
    else video.pause()
  }

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting
      if (inView) {
        if (!started) {
          started = true
          if (gl) gl.resize()
          if (wizardGL) wizardGL.resize()
        }
        loadVideo()
        loadWizardVideo()
        primeVideo()
        primeWizardVideo()
        startLoop()
      }
    },
    { rootMargin: '600px 0px' } // start fetching the clips a little before it pins
  )
  io.observe(stage)

  const onVisibility = () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    } else if (inView) {
      loadVideo()
      loadWizardVideo()
      primeVideo()
      primeWizardVideo()
      startLoop()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  const ro = new ResizeObserver(() => {
    if (gl) gl.resize()
    if (wizardGL) wizardGL.resize()
  })
  ro.observe(stage)

  // ── teardown ──────────────────────────────────────────────────────────────────
  return () => {
    disposed = true
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    io.disconnect()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    video.removeEventListener('loadeddata', onVideoReady)
    video.pause()
    video.removeAttribute('src')
    video.load()
    if (gl) gl.dispose()
    if (wizardVideo) {
      wizardVideo.pause()
      wizardVideo.removeAttribute('src')
      wizardVideo.load()
    }
    if (wizardGL) wizardGL.dispose()
  }
}

// ── WebGL atmosphere (god-rays / embers / speed-smears), screened over the scene ─
// Returns { render(time, progress, velocity), resize(), dispose() } or null on
// any failure (the caller then runs the DOM-only scene).
function buildGL(canvas, stage) {
  const DPR_CAP = mqCoarse.matches ? 1.5 : 2

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    })
  } catch {
    return null
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 1) // black; CSS screen-blend makes it transparent

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new THREE.PlaneGeometry(2, 2)

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uProgress: { value: 0 },
    uVelocity: { value: 0 },
    uRay: { value: new THREE.Color(0.84, 0.69, 0.34) }, // gold
    uEmber: { value: new THREE.Color(0.85, 0.5, 0.24) }, // ember
    uHaze: { value: new THREE.Color(0.32, 0.52, 0.47) }, // sage-teal
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const resize = () => {
    const w = canvas.clientWidth || stage.clientWidth || 1
    const h = canvas.clientHeight || stage.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    uniforms.uResolution.value.set(Math.max(1, w * dpr), Math.max(1, h * dpr))
  }

  // context loss → drop to the DOM-only scene (just stop painting)
  let lost = false
  const onContextLost = (e) => {
    e.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)

  resize()

  return {
    render(time, progress, velocity) {
      if (lost) return
      uniforms.uTime.value = time
      uniforms.uProgress.value = progress
      uniforms.uVelocity.value = velocity
      renderer.render(scene, camera)
    },
    resize,
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      try {
        renderer.forceContextLoss()
      } catch {}
    },
  }
}

// ── The wizard's green-screen clip, keyed to transparency on its own alpha canvas ─
// One fullscreen quad samples the (scroll-scrubbed) video and drops the chroma
// background in-shader, so the robed figure floats free with clean, soft edges.
// Returns { render(), resize(), dispose() } or null on any WebGL failure (the
// caller then falls back to the static PNG wizard). The pixel buffer tracks the
// element's true device size (DPR-capped) so the keyed figure stays crisp — a
// smaller buffer would be CSS-upscaled and read as blurry.
function buildWizardGL(canvas, video) {
  const DPR_CAP = mqCoarse.matches ? 2 : 2.5

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true, // soft edges on the keyed matte
      alpha: true, // transparent canvas: only the wizard shows
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    })
  } catch {
    return null
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0) // fully transparent behind the keyed figure

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new THREE.PlaneGeometry(2, 2)

  const texture = new THREE.VideoTexture(video)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false

  const uniforms = {
    uTex: { value: texture },
    uKeyLow: { value: 0.12 }, // greenness where the subject stays fully opaque
    uKeyHigh: { value: 0.3 }, // greenness where the screen is fully keyed out
    uSpill: { value: 1.0 }, // full de-spill: clamp green to its neighbours (kills the halo)
    uOpacity: { value: 1 },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: wizardVertexShader,
    fragmentShader: wizardFragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const resize = () => {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    // render at the element's real device resolution so the matte stays sharp
    const pr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    renderer.setPixelRatio(pr)
    renderer.setSize(w, h, false)
  }

  // context loss → the wizard simply stops painting (its last frame lingers, then
  // the scene carries on without it)
  let lost = false
  const onContextLost = (e) => {
    e.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)

  resize()

  return {
    render() {
      if (lost) return
      renderer.render(scene, camera)
    },
    resize,
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      texture.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      try {
        renderer.forceContextLoss()
      } catch {}
    },
  }
}
