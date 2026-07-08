// ─────────────────────────────────────────────────────────────────────────────
// The Observatory — a holographic arcane console AND the reveal.
//
// The closing beat: the wizard steps up to the console and every module they just
// scrolled hovers before them as a pane of light, orbiting a fluid particle core
// in an abstract WebGL void. Move the cursor and the whole rig banks like a
// camera; the glass panels drift at their own depths (parallax); scroll and the
// scattered console assembles into formation and the core ignites.
//
// Each panel is one section of the page (see PANELS/MODULES + SPELLBOOK). Touch a
// panel and a modal opens with the exact incantation(s) that summoned it — the
// generic, design-system-aware build prompt plus the prompts for its art. This is
// the grimoire, handed over: proof that the whole page was conjured from sentences.
//
// How it's built (mirrors conjure.js / descent.js / iceWall.js conventions):
//   • A normal .section (not pinned) holding an .obs-stage — a dark holographic
//     viewport. Stacked back→front: a CSS void + soft core glow · a three.js
//     canvas (particle core + starfield + nebula + orrery rings, ADDITIVE light on
//     a transparent canvas) · a HUD frame (corner brackets, rotating reticle,
//     status) · the floating glassmorphism panels (backdrop-filter frosts the
//     canvas behind them).
//   • One rAF loop owns ALL writes. It eases a pointer target (nx, ny ∈ [-1,1]) and
//     an "assemble" value (0→1) read off the stage's position, then banks the GL
//     world, dollies the camera, and parallaxes every panel + the reticle by their
//     depth. On coarse/no-hover pointers the target auto-drifts on sin() so it
//     stays alive; fine pointers drive it directly.
//   • Capability gates: prefers-reduced-motion → a calm static composite (panels in
//     a settled grid, CSS core, no canvas, no parallax). No WebGL → the canvas is
//     skipped; the CSS core + DOM parallax still read.
//   • IntersectionObserver + visibilitychange run the loop only in view (zero work
//     off-screen; the video-less scene is cheap but still paused); ResizeObserver
//     keeps the renderer sized; full teardown disposes three.js and every listener.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import {
  coreVertex,
  coreFragment,
  dustVertex,
  dustFragment,
} from './gl/observatoryShaders.js'
import { SPELLBOOK, entryPrompts } from './spellbook.js'

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const mqCoarse = window.matchMedia('(hover: none), (pointer: coarse)')
const mqNarrow = window.matchMedia('(max-width: 760px)')

const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n)
const lerp = (a, b, t) => a + (b - a) * t

// ── The instrument panels — one per module in the scroll ─────────────────────
// Each panel IS one section of the page; touching it opens the modal with the
// exact incantation(s) that summoned it. The list is IN PAGE ORDER and zipped
// against SPELLBOOK by index (MODULES, below). x/y are the panel centre as a
// fraction of the stage; depth (0..1) drives the parallax throw, scale and blur
// (near = 1, moves most; far = small, hazier). `readout`/`metric` is the little
// console line; viz picks the live readout drawn in CSS. `narrow` hides a panel
// on phones, leaving a clean four-corner set (Hero · True Form · Wall · Arcade).
const PANELS = [
  {
    glyph: '✦', label: 'Hero', sub: 'The Summons',
    readout: 'looping', metric: 'video', viz: 'comet',
    x: 0.16, y: 0.2, depth: 0.92,
  },
  {
    glyph: '❋', label: 'True Form', sub: 'The X-Ray',
    readout: 'WebGL', metric: 'reveal', viz: 'stars',
    x: 0.84, y: 0.19, depth: 0.86,
  },
  {
    glyph: '☽', label: 'Conjuring', sub: 'The Render',
    readout: 'scroll', metric: 'scrub', viz: 'moon',
    x: 0.12, y: 0.52, depth: 0.74, narrow: true,
  },
  {
    glyph: '✴', label: 'The Descent', sub: 'The Fall',
    readout: 'Lenis', metric: 'parallax', viz: 'embers',
    x: 0.88, y: 0.5, depth: 0.68, narrow: true,
  },
  {
    glyph: '❂', label: 'The Wall', sub: 'The Ward',
    readout: 'frozen', metric: 'monster', viz: 'stars',
    x: 0.18, y: 0.82, depth: 0.6,
  },
  {
    glyph: '✧', label: 'Observatory', sub: 'The Console',
    readout: 'you are', metric: 'here', viz: 'comet',
    x: 0.5, y: 0.9, depth: 0.52, narrow: true,
  },
  {
    glyph: '❖', label: 'The Arcade', sub: 'The Dungeon',
    readout: 'Phaser', metric: 'maze', viz: 'embers',
    x: 0.82, y: 0.82, depth: 0.5,
  },
]

// Zip each panel with its Spellbook entry (same page order) + a stable index
// (used for the sheen delay and to survive the phone-narrow filter).
const MODULES = PANELS.map((p, i) => ({ ...p, index: i, spell: SPELLBOOK[i] }))

// Little arcane readouts, kept as markup fragments so a panel just picks one:
// a shooting-star comet, a twinkling constellation, an orbiting moon, embers.
const VIZ = {
  comet: `<span class="hc-comet" aria-hidden="true"></span>`,
  stars: `<span class="hc-stars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`,
  moon: `<span class="hc-moon" aria-hidden="true"><i></i></span>`,
  embers: `<span class="hc-embers" aria-hidden="true"><i></i><i></i><i></i></span>`,
}

export function initObservatory() {
  const mount = document.querySelector('[data-observatory]')
  if (!mount) return

  let teardown = build(mount)

  const rebuild = () => {
    if (teardown) {
      teardown()
      teardown = null
    }
    mount.replaceChildren()
    teardown = build(mount)
  }
  // Rebuild on a motion-preference flip (static ↔ animated) or when crossing the
  // narrow breakpoint (floating rig ↔ tappable grid) so the right layout is built.
  mqReduce.addEventListener('change', rebuild)
  mqNarrow.addEventListener('change', rebuild)
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

// ── Build the scene; returns a teardown() ───────────────────────────────────────
function build(mount) {
  const reduce = mqReduce.matches

  const stage = document.createElement('div')
  stage.className = 'obs-stage' + (reduce ? ' is-static' : '')

  // Always present: a soft CSS core glow (the base light; the canvas adds to it,
  // and it carries the whole scene when WebGL is unavailable).
  const core = document.createElement('div')
  core.className = 'obs-core'
  core.setAttribute('aria-hidden', 'true')
  core.innerHTML = `<span class="obs-core-ring"></span><span class="obs-core-orb"></span>`
  stage.appendChild(core)

  // HUD frame: corner brackets + a slow reticle + a status line.
  const hud = document.createElement('div')
  hud.className = 'obs-hud'
  hud.setAttribute('aria-hidden', 'true')
  // An arcane rune-circle (concentric rings + an inscribed hexagram) instead of a
  // targeting reticle; four corner sigils; and an incantation instead of a status.
  hud.innerHTML = `
    <span class="obs-corner obs-corner--tl">✦</span>
    <span class="obs-corner obs-corner--tr">✦</span>
    <span class="obs-corner obs-corner--bl">✦</span>
    <span class="obs-corner obs-corner--br">✦</span>
    <span class="obs-reticle">
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="47" stroke-width="0.7" opacity="0.4"/>
        <circle cx="50" cy="50" r="39" stroke-width="0.6" stroke-dasharray="1 4" opacity="0.55"/>
        <circle cx="50" cy="50" r="28" stroke-width="0.8" opacity="0.5"/>
        <circle cx="50" cy="50" r="11" stroke-width="0.8" opacity="0.6"/>
        <polygon points="50,14 82,68 18,68" stroke-width="0.7" opacity="0.5"/>
        <polygon points="50,86 18,32 82,32" stroke-width="0.7" opacity="0.5"/>
      </svg>
    </span>
    <span class="obs-status"><span class="obs-star" aria-hidden="true">✦</span>the circle is open</span>`
  stage.appendChild(hud)

  // The reveal modal — created once and mounted on <body> so it escapes the
  // stage's overflow/perspective. Every panel opens it with its own incantation.
  const disposers = []
  const modal = createModal()
  disposers.push(() => modal.destroy())

  // The floating glass panels — one per module; each opens the modal on click.
  // A <button> (not <article>) so it's focusable and keyboard-activatable; its
  // children are phrasing spans so the button holds only valid content.
  const field = document.createElement('div')
  field.className = 'obs-field'
  const narrow = mqNarrow.matches
  // Every module is always rendered — the reveal promises "every module was a
  // prompt", so every incantation must be reachable. On wide screens the panels
  // float in the 3D rig over the core; on narrow screens they flow into a static,
  // tappable grid below the console instead (all seven, none dropped).
  const defs = MODULES
  const panels = defs.map((m) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'holo-card'
    btn.setAttribute('aria-haspopup', 'dialog')
    btn.style.left = m.x * 100 + '%'
    btn.style.top = m.y * 100 + '%'
    btn.style.setProperty('--depth', m.depth.toFixed(3))
    btn.style.setProperty('--i', String(m.index))
    btn.innerHTML = `
      <span class="hc-scan" aria-hidden="true"></span>
      <span class="hc-head">
        <span class="hc-glyph" aria-hidden="true">${m.glyph}</span>
        <span class="hc-titles">
          <span class="hc-label">${m.label}</span>
          <span class="hc-sub">${m.sub}</span>
        </span>
      </span>
      <span class="hc-readout"><span class="hc-key">${m.readout}</span> <em>${m.metric}</em></span>
      <span class="hc-viz">${VIZ[m.viz] || ''}</span>
      <span class="hc-reveal">Read the spell<span class="hc-reveal-arrow" aria-hidden="true">↗</span></span>`
    btn.addEventListener('click', () => modal.open(m))
    field.appendChild(btn)
    return { el: btn, ...m }
  })
  // Wide: the field is the floating rig inside the console. Narrow: it's a static
  // grid appended below the console (see mount.appendChild after the stage).
  if (narrow) field.classList.add('obs-field--grid')
  else stage.appendChild(field)

  // a11y: one honest description of the whole scene.
  const sr = document.createElement('p')
  sr.className = 'obs-sr-only'
  sr.textContent =
    'A holographic command console floating in a dark void: a fluid, glowing particle core orbited by a starfield and thin light-rings, surrounded by floating panes of frosted glass — one for each discipline of front-end craft: rendering, shaders, motion, state, systems and interface. Moving the cursor banks the whole console like a camera and the panels drift at their own depths.'
  stage.appendChild(sr)

  mount.appendChild(stage)
  if (narrow) mount.appendChild(field) // the tappable spell grid, below the console

  // ── Reduced motion: settled composite, no canvas, no loop ─────────────────────
  // (the panels + reveal modal still work — only the animation is dropped)
  if (reduce) {
    stage.classList.add('is-live')
    return () => disposers.forEach((fn) => fn())
  }

  // ── WebGL core (optional enhancement) ─────────────────────────────────────────
  let gl = null
  if (hasWebGL()) {
    const canvas = document.createElement('canvas')
    canvas.className = 'obs-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    // sits above the CSS core, below the HUD + panels
    stage.insertBefore(canvas, hud)
    gl = buildGL(canvas, stage)
    if (!gl) canvas.remove()
  }
  if (!gl) stage.classList.add('no-gl')

  // ── pointer + assemble state (eased in the loop) ──────────────────────────────
  const finePointer = !mqCoarse.matches
  let tX = 0, tY = 0 // pointer target ∈ [-1,1]
  let cX = 0, cY = 0 // eased current
  let assemble = 0, assembleT = 0
  let energy = 0
  let inView = false
  let disposed = false
  let rafId = 0
  let pointerActive = false

  const onPointerMove = (e) => {
    const r = stage.getBoundingClientRect()
    if (!r.width || !r.height) return
    tX = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
    tY = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
    pointerActive = true
    stage.classList.add('is-tracking')
  }
  const onPointerLeave = () => {
    pointerActive = false
    stage.classList.remove('is-tracking')
  }
  if (finePointer) {
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerleave', onPointerLeave)
  }

  // Panel focus (hover/focus-within lifts a card): CSS handles the styling; here
  // we only need pointer parallax, so nothing extra to wire.

  const measureAssemble = () => {
    const r = stage.getBoundingClientRect()
    const vh = window.innerHeight || 1
    const center = r.top + r.height / 2
    const d = Math.abs(center - vh / 2) / vh // 0 centred → ~0.5 at edges
    assembleT = clamp(1.15 - d * 1.7, 0, 1)
  }

  const tick = (now) => {
    if (disposed) return
    if (!inView) {
      rafId = 0
      return
    }
    rafId = requestAnimationFrame(tick)
    const time = now * 0.001

    // auto-drift the "camera" when no fine pointer is steering it
    if (!pointerActive) {
      tX = Math.sin(time * 0.18) * 0.55
      tY = Math.cos(time * 0.13) * 0.4
    }
    cX = lerp(cX, tX, 0.06)
    cY = lerp(cY, tY, 0.06)

    measureAssemble()
    assemble = lerp(assemble, assembleT, 0.07)

    // energy rises with assembly and a touch of pointer engagement
    const engage = pointerActive ? 0.35 : 0.12
    energy = lerp(energy, 0.35 + 0.65 * assemble + engage * (Math.abs(cX) + Math.abs(cY)) * 0.5, 0.08)

    // parallax the glass panels + reticle by depth (camera-like layered depth).
    // Skipped on narrow (!narrow short-circuits): there the panels are a static
    // CSS grid, not the floating rig, so they must keep their own layout/opacity.
    const THROW = 44 // px at depth 1
    for (let i = 0; !narrow && i < panels.length; i++) {
      const p = panels[i]
      const dep = p.depth
      const dx = -cX * THROW * dep
      const dy = -cY * THROW * dep
      const rot = cX * 6 * dep
      const rotX = -cY * 5 * dep
      // assemble: fly in from further out along the panel's radial from centre
      const a = clamp((assemble - (1 - dep) * 0.15) / 0.85, 0, 1)
      const outX = (p.x - 0.5) * 240 * (1 - a)
      const outY = (p.y - 0.5) * 200 * (1 - a)
      const sc = lerp(0.82, 1, a) * lerp(0.9, 1, dep)
      p.el.style.transform =
        `translate(-50%, -50%) translate3d(${(dx + outX).toFixed(1)}px, ${(dy + outY).toFixed(1)}px, 0) ` +
        `rotateX(${rotX.toFixed(2)}deg) rotateY(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`
      p.el.style.opacity = a.toFixed(3)
    }

    // the reticle + core drift a little against the pointer for depth
    stage.style.setProperty('--rx', (cX * 22).toFixed(1) + 'px')
    stage.style.setProperty('--ry', (cY * 18).toFixed(1) + 'px')
    stage.style.setProperty('--energy', energy.toFixed(3))

    if (gl) gl.render(time, cX, cY, assemble, energy)

    if (!stage.classList.contains('is-live')) stage.classList.add('is-live')
  }

  const startLoop = () => {
    if (!rafId && !disposed) rafId = requestAnimationFrame(tick)
  }

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting
      if (inView) {
        if (gl) gl.resize()
        startLoop()
      }
    },
    { rootMargin: '200px 0px' }
  )
  io.observe(stage)

  const onVisibility = () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    } else if (inView) {
      startLoop()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  const ro = new ResizeObserver(() => gl && gl.resize())
  ro.observe(stage)

  // ── teardown ──────────────────────────────────────────────────────────────────
  return () => {
    disposed = true
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    io.disconnect()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    if (finePointer) {
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerleave', onPointerLeave)
    }
    if (gl) gl.dispose()
    disposers.forEach((fn) => fn())
  }
}

// ── WebGL scene: particle core + starfield + nebula + orrery rings ──────────────
// Returns { render(time, px, py, assemble, energy), resize(), dispose() } or null.
function buildGL(canvas, stage) {
  const coarse = mqCoarse.matches
  const DPR_CAP = coarse ? 1.5 : 2

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    })
  } catch {
    return null
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0) // transparent → CSS void shows through

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 6.6)

  // A world group we bank toward the pointer; children also self-rotate.
  const world = new THREE.Group()
  scene.add(world)

  // neon palette (brand-derived, boosted toward hologram brightness)
  // warm candlelit palette: gold + ember, with a moonlit-violet cool (not cyan)
  const COL_ARC = new THREE.Color(0.62, 0.55, 0.86) // moonlit arcane violet
  const COL_GOLD = new THREE.Color(0.98, 0.8, 0.42) // candlelight gold
  const COL_EMBER = new THREE.Color(0.95, 0.52, 0.3) // ember

  const dpr = () => Math.min(window.devicePixelRatio || 1, DPR_CAP)

  // ── core particle sphere (fibonacci sphere for even coverage) ─────────────────
  const CORE_N = coarse ? 9000 : 20000
  const corePos = new Float32Array(CORE_N * 3)
  const coreSeed = new Float32Array(CORE_N)
  const GA = Math.PI * (3 - Math.sqrt(5)) // golden angle
  for (let i = 0; i < CORE_N; i++) {
    const y = 1 - (i / (CORE_N - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = GA * i
    corePos[i * 3] = Math.cos(th) * r
    corePos[i * 3 + 1] = y
    corePos[i * 3 + 2] = Math.sin(th) * r
    coreSeed[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1
    if (coreSeed[i] < 0) coreSeed[i] += 1
  }
  const coreGeo = new THREE.BufferGeometry()
  coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3))
  coreGeo.setAttribute('aSeed', new THREE.BufferAttribute(coreSeed, 1))
  const coreUniforms = {
    uTime: { value: 0 },
    uSize: { value: 7.5 },
    uDpr: { value: dpr() },
    uAmp: { value: 0.3 },
    uAssemble: { value: 0 },
    uEnergy: { value: 0 },
    uColA: { value: COL_ARC },
    uColB: { value: COL_GOLD },
    uColC: { value: COL_EMBER },
  }
  const coreMat = new THREE.ShaderMaterial({
    vertexShader: coreVertex,
    fragmentShader: coreFragment,
    uniforms: coreUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const coreScale = 1.35 // world radius of the core
  const corePoints = new THREE.Points(coreGeo, coreMat)
  corePoints.scale.setScalar(coreScale)
  world.add(corePoints)

  // faint wireframe shell inside the core for structure
  const shellGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(coreScale * 0.62, 1))
  const shellMat = new THREE.LineBasicMaterial({
    color: COL_GOLD,
    transparent: true,
    opacity: 0.1,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const shell = new THREE.LineSegments(shellGeo, shellMat)
  world.add(shell)

  // ── dust systems: a shell builder shared by starfield + nebula ────────────────
  function buildDust(count, rMin, rMax, size, color, drift) {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // random point in a spherical shell
      const u = Math.random() * 2 - 1
      const t = Math.random() * Math.PI * 2
      const rad = rMin + Math.random() * (rMax - rMin)
      const s = Math.sqrt(1 - u * u)
      pos[i * 3] = Math.cos(t) * s * rad
      pos[i * 3 + 1] = u * rad
      pos[i * 3 + 2] = Math.sin(t) * s * rad
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const uniforms = {
      uTime: { value: 0 },
      uSize: { value: size },
      uDpr: { value: dpr() },
      uDrift: { value: drift },
      uColor: { value: color },
    }
    const mat = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(geo, mat)
    return { points, geo, mat, uniforms }
  }

  const stars = buildDust(coarse ? 260 : 520, 3.2, 9.0, 5.0, new THREE.Color(0.9, 0.86, 0.98), 0.12)
  const nebula = buildDust(coarse ? 40 : 90, 2.4, 6.5, 46.0, COL_ARC.clone().lerp(COL_GOLD, 0.5), 0.4)
  // stars sit in the scene (don't bank with the world) for a stable backdrop;
  // the nebula rides the world so it feels volumetric around the core.
  scene.add(stars.points)
  world.add(nebula.points)

  // ── orrery rings: thin glowing circles at varied tilts ────────────────────────
  function buildRing(radius, tilt, spin, color, opacity) {
    const N = 128
    const pos = new Float32Array((N + 1) * 3)
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      pos[i * 3] = Math.cos(a) * radius
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = Math.sin(a) * radius
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const line = new THREE.LineLoop(geo, mat)
    line.rotation.x = tilt
    return { line, geo, mat, spin }
  }
  const rings = [
    buildRing(2.05, 1.15, 0.06, COL_GOLD, 0.5),
    buildRing(2.55, -0.6, -0.045, COL_ARC, 0.4),
    buildRing(3.15, 0.42, 0.03, COL_EMBER, 0.3),
  ]
  rings.forEach((r) => world.add(r.line))

  const resize = () => {
    const w = canvas.clientWidth || stage.clientWidth || 1
    const h = canvas.clientHeight || stage.clientHeight || 1
    const d = dpr()
    renderer.setPixelRatio(d)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    coreUniforms.uDpr.value = d
    stars.uniforms.uDpr.value = d
    nebula.uniforms.uDpr.value = d
  }

  // context loss → drop to the CSS-only scene (just stop painting)
  let lost = false
  const onContextLost = (e) => {
    e.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)

  resize()

  return {
    render(time, px, py, assemble, energy) {
      if (lost) return

      // bank the world toward the pointer + a slow autonomous drift
      world.rotation.y = time * 0.03 + px * 0.5
      world.rotation.x = -py * 0.32
      corePoints.rotation.y = time * 0.035
      shell.rotation.y = -time * 0.05
      shell.rotation.x = time * 0.03

      // a gentle camera dolly-in as the console assembles
      camera.position.z = lerp(6.9, 4.7, assemble)
      camera.position.x = px * 0.35
      camera.position.y = -py * 0.28
      camera.lookAt(0, 0, 0)

      for (let i = 0; i < rings.length; i++) {
        rings[i].line.rotation.z += rings[i].spin * 0.02
        rings[i].line.rotation.y = time * rings[i].spin
      }

      coreUniforms.uTime.value = time
      coreUniforms.uAssemble.value = assemble
      coreUniforms.uEnergy.value = energy
      stars.uniforms.uTime.value = time
      nebula.uniforms.uTime.value = time
      shellMat.opacity = 0.05 + 0.14 * assemble

      renderer.render(scene, camera)
    },
    resize,
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      coreGeo.dispose()
      coreMat.dispose()
      shellGeo.dispose()
      shellMat.dispose()
      stars.geo.dispose()
      stars.mat.dispose()
      nebula.geo.dispose()
      nebula.mat.dispose()
      rings.forEach((r) => {
        r.geo.dispose()
        r.mat.dispose()
      })
      renderer.dispose()
      try {
        renderer.forceContextLoss()
      } catch {}
    },
  }
}

// ── The reveal modal: the grimoire, opened from a panel ─────────────────────────
// A single dialog on <body> that shows one module's incantation(s) — the build
// prompt plus any art prompts — each with a copy button. Pure DOM + clipboard;
// closes on Escape, backdrop click or the ✕, traps Tab, and restores focus.

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

// Create the singleton modal; returns { open(module), destroy() }.
function createModal() {
  const modal = document.createElement('div')
  modal.className = 'spell-modal'
  modal.hidden = true
  // Keep Lenis (smooth scroll) from stealing wheel/touch while the modal is open.
  modal.setAttribute('data-lenis-prevent', '')
  modal.innerHTML = `
    <div class="spell-modal-scrim" data-close></div>
    <div class="spell-modal-panel" role="dialog" aria-modal="true" aria-labelledby="spell-modal-title" tabindex="-1">
      <button class="spell-modal-close" type="button" data-close aria-label="Close the incantation">
        <span aria-hidden="true">✕</span>
      </button>
      <header class="spell-modal-head">
        <span class="spell-modal-glyph" aria-hidden="true"></span>
        <span class="spell-modal-heading">
          <span class="spell-modal-sub"></span>
          <h3 class="spell-modal-name" id="spell-modal-title"></h3>
          <p class="spell-modal-summary"></p>
        </span>
      </header>
      <div class="spell-modal-body"></div>
    </div>`
  document.body.appendChild(modal)

  const panel = modal.querySelector('.spell-modal-panel')
  const glyphEl = modal.querySelector('.spell-modal-glyph')
  const subEl = modal.querySelector('.spell-modal-sub')
  const nameEl = modal.querySelector('.spell-modal-name')
  const summaryEl = modal.querySelector('.spell-modal-summary')
  const bodyEl = modal.querySelector('.spell-modal-body')

  let isOpen = false
  let lastFocused = null
  let hideTimer = 0
  const copyTimers = new WeakMap()

  const open = (m) => {
    glyphEl.textContent = m.glyph
    subEl.textContent = m.sub
    nameEl.textContent = m.label
    summaryEl.textContent = m.spell.summary
    bodyEl.replaceChildren(...entryPrompts(m.spell).map(promptBlock))
    bodyEl.scrollTop = 0

    lastFocused = document.activeElement
    clearTimeout(hideTimer)
    modal.hidden = false
    void modal.offsetWidth // reflow so the open transition plays
    modal.classList.add('is-open')
    document.body.classList.add('spell-modal-lock')
    isOpen = true
    panel.focus()
  }

  const close = () => {
    if (!isOpen) return
    isOpen = false
    modal.classList.remove('is-open')
    document.body.classList.remove('spell-modal-lock')
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      modal.hidden = true
    }, 280)
    // Return focus to the opener (a panel button) — but never to something inside
    // the modal we're hiding, which would strand focus on a display:none element.
    if (lastFocused && lastFocused.focus && lastFocused.isConnected && !modal.contains(lastFocused)) {
      lastFocused.focus()
    }
  }

  const onClick = async (e) => {
    if (e.target.closest('[data-close]')) {
      close()
      return
    }
    const btn = e.target.closest('[data-copy]')
    if (!btn) return
    const text = btn.closest('.gc-prompt')?.querySelector('.gc-text')?.textContent
    if (!text) return
    const ok = await copyText(text)
    const label = btn.querySelector('.gc-copy-label')
    if (label) label.textContent = ok ? 'Copied ✓' : 'Press ⌘C'
    btn.classList.toggle('is-copied', ok)
    clearTimeout(copyTimers.get(btn))
    copyTimers.set(
      btn,
      setTimeout(() => {
        if (label) label.textContent = 'Copy'
        btn.classList.remove('is-copied')
      }, COPIED_MS)
    )
  }
  modal.addEventListener('click', onClick)

  const onKey = (e) => {
    if (!isOpen) return
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'Tab') {
      const f = Array.from(modal.querySelectorAll('button:not([disabled])'))
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
  document.addEventListener('keydown', onKey)

  return {
    open,
    destroy() {
      clearTimeout(hideTimer)
      modal.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('spell-modal-lock')
      modal.remove()
    },
  }
}
