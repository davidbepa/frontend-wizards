// ─────────────────────────────────────────────────────────────────────────────
// The Observatory — a holographic arcane console.
//
// The story beat after warding the monster: the wizard steps up to the console.
// Every discipline of the craft — rendering, shaders, motion, state, systems,
// interface — hovers before them as a pane of light, orbiting a fluid particle
// core in an abstract WebGL void. Move the cursor and the whole rig banks like a
// camera; the glass panels drift at their own depths (parallax); scroll and the
// scattered console assembles into formation and the core ignites. The lesson in
// the page's key: with an agent, the entire craft is laid out at arm's reach.
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

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const mqCoarse = window.matchMedia('(hover: none), (pointer: coarse)')
const mqNarrow = window.matchMedia('(max-width: 760px)')

const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n)
const lerp = (a, b, t) => a + (b - a) * t

// ── The instrument panels — one per discipline of the craft ──────────────────
// x/y are the panel centre as a fraction of the stage; depth (0..1) drives the
// parallax throw, scale and blur (near = 1, moves most; far = small, hazier).
// viz picks the little live readout drawn in CSS. `narrow` hides a panel on phones.
const PANELS = [
  {
    glyph: '❋', label: 'Rendering', sub: 'The Loom',
    readout: 'painting at', metric: '60fps', viz: 'comet',
    x: 0.15, y: 0.24, depth: 0.92,
  },
  {
    glyph: '✴', label: 'Shaders', sub: 'The Light',
    readout: 'GLSL', metric: 'by hand', viz: 'stars',
    x: 0.85, y: 0.2, depth: 0.86,
  },
  {
    glyph: '☽', label: 'Motion', sub: 'The Tide',
    readout: 'eased', metric: 'alive', viz: 'moon',
    x: 0.13, y: 0.63, depth: 0.72, narrow: true,
  },
  {
    glyph: '✧', label: 'State', sub: 'The Ledger',
    readout: 'one source', metric: 'of truth', viz: 'embers',
    x: 0.87, y: 0.6, depth: 0.66,
  },
  {
    glyph: '❂', label: 'Systems', sub: 'The Lattice',
    readout: 'typed', metric: 'end-to-end', viz: 'stars',
    x: 0.28, y: 0.86, depth: 0.55, narrow: true,
  },
  {
    glyph: '✦', label: 'Interface', sub: 'The Threshold',
    readout: 'reachable by', metric: 'all', viz: 'comet',
    x: 0.74, y: 0.85, depth: 0.5,
  },
]

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

  // The floating glass panels.
  const field = document.createElement('div')
  field.className = 'obs-field'
  const narrow = mqNarrow.matches
  const defs = narrow ? PANELS.filter((p) => !p.narrow) : PANELS
  const panels = defs.map((p, i) => {
    const elx = document.createElement('article')
    elx.className = 'holo-card'
    elx.style.left = p.x * 100 + '%'
    elx.style.top = p.y * 100 + '%'
    elx.style.setProperty('--depth', p.depth.toFixed(3))
    elx.style.setProperty('--i', String(i))
    elx.innerHTML = `
      <span class="hc-scan" aria-hidden="true"></span>
      <header class="hc-head">
        <span class="hc-glyph" aria-hidden="true">${p.glyph}</span>
        <span class="hc-titles">
          <span class="hc-label">${p.label}</span>
          <span class="hc-sub">${p.sub}</span>
        </span>
      </header>
      <p class="hc-readout"><span class="hc-key">${p.readout}</span> <em>${p.metric}</em></p>
      <div class="hc-viz">${VIZ[p.viz] || ''}</div>`
    field.appendChild(elx)
    return { el: elx, ...p }
  })
  stage.appendChild(field)

  // a11y: one honest description of the whole scene.
  const sr = document.createElement('p')
  sr.className = 'obs-sr-only'
  sr.textContent =
    'A holographic command console floating in a dark void: a fluid, glowing particle core orbited by a starfield and thin light-rings, surrounded by floating panes of frosted glass — one for each discipline of front-end craft: rendering, shaders, motion, state, systems and interface. Moving the cursor banks the whole console like a camera and the panels drift at their own depths.'
  stage.appendChild(sr)

  mount.appendChild(stage)

  // ── Reduced motion: settled composite, no canvas, no loop ─────────────────────
  if (reduce) {
    stage.classList.add('is-live')
    return () => {}
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

    // parallax the glass panels + reticle by depth (camera-like layered depth)
    const THROW = 44 // px at depth 1
    for (let i = 0; i < panels.length; i++) {
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
