// ─────────────────────────────────────────────────────────────────────────────
// The True Form — a WebGL "x-ray" reveal.
//
// A base portrait of an everyday developer is rendered on a fullscreen quad. As
// the cursor moves it warps the portrait (mouse-trail displacement + RGB split +
// grain) and reveals a glowing line-art bearded wizard beneath — their "true
// form". The trail is an offscreen 2D canvas (a cheap flowmap; no ping-pong
// render targets) uploaded as a CanvasTexture each frame.
//
// Conventions mirror conjure.js / heroVideo.js:
//   • prefers-reduced-motion / no-WebGL → a static composite fallback (the two
//     <img>s, whose src is set only when actually shown).
//   • IntersectionObserver + visibilitychange pause the loop off-screen.
//   • full teardown (dispose geometry / material / textures / renderer).
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { vertexShader, fragmentShader } from './gl/trueFormShaders.js'

const PORTRAIT_SRC = '/portrait.jpg'
const WIZARD_SRC = '/wizard-overlay.jpg' // line-art → glitch flash + static fallback
const WIZARD_REAL_SRC = '/wizard-real.jpg' // photoreal wizard → revealed on hover

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const mqHoverNone = window.matchMedia('(hover: none), (pointer: coarse)')

const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n)

export function initTrueForm() {
  const mount = document.querySelector('[data-true-form]')
  if (!mount) return

  let teardown = null

  const wantStatic = () => mqReduce.matches || !hasWebGL()

  const sync = () => {
    if (wantStatic()) {
      if (teardown) {
        teardown()
        teardown = null
      }
      showStaticFallback(mount)
    } else if (!teardown) {
      hideStaticFallback(mount)
      teardown = build(mount) // may itself fall back on texture/context failure
    }
  }

  // Re-evaluate the live/static choice when the motion preference flips.
  mqReduce.addEventListener('change', () => {
    if (teardown) {
      teardown()
      teardown = null
    }
    sync()
  })

  sync()
}

// ── Capability + fallback ─────────────────────────────────────────────────────
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function showStaticFallback(mount) {
  const base = mount.querySelector('.tf-fallback--base')
  const wiz = mount.querySelector('.tf-fallback--wizard')
  if (base && !base.getAttribute('src')) base.src = PORTRAIT_SRC
  if (wiz && !wiz.getAttribute('src')) wiz.src = WIZARD_SRC
  mount.classList.add('is-fallback')
  mount.classList.remove('is-live')
}

function hideStaticFallback(mount) {
  mount.classList.remove('is-fallback')
}

// ── Build the live scene; returns a teardown() ────────────────────────────────
function build(mount) {
  const canvas = mount.querySelector('.tf-canvas')
  if (!canvas) {
    showStaticFallback(mount)
    return null
  }

  const isMobile = mqHoverNone.matches
  const DPR_CAP = isMobile ? 1.5 : 2
  const TRAIL_SIZE = isMobile ? 192 : 256

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    })
  } catch {
    showStaticFallback(mount)
    return null
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new THREE.PlaneGeometry(2, 2)

  // ── trail flowmap (offscreen 2D canvas → CanvasTexture) ─────────────────────
  const trailCanvas = document.createElement('canvas')
  trailCanvas.width = trailCanvas.height = TRAIL_SIZE
  const tctx = trailCanvas.getContext('2d')
  tctx.fillStyle = '#000'
  tctx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE)
  const trailTex = new THREE.CanvasTexture(trailCanvas)
  trailTex.colorSpace = THREE.NoColorSpace // a data mask — never gamma-decode it
  trailTex.minFilter = trailTex.magFilter = THREE.LinearFilter
  trailTex.generateMipmaps = false
  trailTex.wrapS = trailTex.wrapT = THREE.ClampToEdgeWrapping

  const uniforms = {
    uPortrait: { value: null },
    uWizardLine: { value: null },
    uWizardReal: { value: null },
    uTrail: { value: trailTex },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPortraitAspect: { value: 0.6667 },
    uLineAspect: { value: 0.6667 },
    uRealAspect: { value: 0.6667 },
    uReveal: { value: 1 },
    uDistortAmp: { value: 0.05 },
    uWizardThreshold: { value: 0.18 },
    uGrainAmp: { value: 0.06 },
    uExposure: { value: 0.78 }, // base-image brightness: a bit darker than the source
    uGoldTint: { value: new THREE.Color(0.882, 0.741, 0.42) },
    uEmber: { value: new THREE.Color(0.847, 0.518, 0.247) }, // --ember #d8843f
    uMagicIntensity: { value: 1.1 }, // wizard-overlay glow opacity (+10%)
    uSweepSpeed: { value: 0.06 }, // ~8s sweep + ~8s quiet (developer fully visible between)
    uSweepBoost: { value: 1.0 }, // glow under the travelling light
    uBloom: { value: 0.6 }, // soft gold glow through the dissolving dust
    uSparkIntensity: { value: 0.85 },
    uDustBand: { value: 0.28 }, // soft feather → granular dust, no hard edge
    uDustIntensity: { value: 1.1 }, // density of gold flecks in the dust
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

  // ── load textures (both required) ───────────────────────────────────────────
  const loader = new THREE.TextureLoader()
  const prep = (tex) => {
    // NoColorSpace = pass the JPEG bytes through untouched. This ShaderMaterial does
    // its own compositing and three is NOT re-encoding the output, so decoding the
    // textures sRGB→linear here would render the image ~2x too dark.
    tex.colorSpace = THREE.NoColorSpace
    tex.minFilter = tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }
  const loadTex = (src) =>
    new Promise((resolve, reject) =>
      loader.load(src, (t) => resolve(prep(t)), undefined, reject)
    )

  // ── pointer trail state ─────────────────────────────────────────────────────
  let lastFrac = null // {x,y} 0..1 from the stage top-left (last stamp position)
  let synthLast = null
  let inView = false
  let disposed = false
  let rafId = 0
  let prevT = 0

  const stampSegment = (from, to) => {
    // from/to are 0..1 fractions measured from the stage top-left.
    const x1 = from.x * TRAIL_SIZE
    const y1 = from.y * TRAIL_SIZE
    const x2 = to.x * TRAIL_SIZE
    const y2 = to.y * TRAIL_SIZE
    const dist = Math.hypot(x2 - x1, y2 - y1)
    const radius = TRAIL_SIZE * 0.17 // reveal brush size (bigger → larger revealed patch)
    const steps = clamp(Math.ceil(dist / (radius * 0.4)), 1, 64)
    tctx.globalCompositeOperation = 'lighter'
    for (let i = 1; i <= steps; i++) {
      const x = x1 + (x2 - x1) * (i / steps)
      const y = y1 + (y2 - y1) * (i / steps)
      const g = tctx.createRadialGradient(x, y, 0, x, y, radius)
      g.addColorStop(0, 'rgba(255,255,255,0.55)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      tctx.fillStyle = g
      tctx.beginPath()
      tctx.arc(x, y, radius, 0, Math.PI * 2)
      tctx.fill()
    }
  }

  const stampPoint = (frac) => {
    if (lastFrac) stampSegment(lastFrac, frac)
    else stampSegment(frac, frac)
    lastFrac = frac
  }

  // ── pointer handling ────────────────────────────────────────────────────────
  const fracFromEvent = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    return {
      x: clamp((clientX - r.left) / r.width, 0, 1),
      y: clamp((clientY - r.top) / r.height, 0, 1),
    }
  }

  const onPointerMove = (e) => {
    const events =
      typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null
    if (events && events.length) {
      for (const ev of events) {
        const f = fracFromEvent(ev.clientX, ev.clientY)
        if (f) stampPoint(f)
      }
    } else {
      const f = fracFromEvent(e.clientX, e.clientY)
      if (f) stampPoint(f)
    }
  }
  const onPointerLeave = () => {
    lastFrac = null // avoid streaking a line across on the next entry
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })
  canvas.addEventListener('pointercancel', onPointerLeave, { passive: true })

  // ── resize ──────────────────────────────────────────────────────────────────
  const resize = () => {
    const w = canvas.clientWidth || mount.clientWidth || 1
    const h = canvas.clientHeight || mount.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    uniforms.uResolution.value.set(Math.max(1, w * dpr), Math.max(1, h * dpr))
  }
  const ro = new ResizeObserver(resize)
  ro.observe(mount)

  // ── render loop (owns all writes) ───────────────────────────────────────────
  const tick = (now) => {
    if (disposed) return
    if (!inView) {
      rafId = 0
      return
    }
    rafId = requestAnimationFrame(tick)

    const time = now * 0.001
    const dt = prevT ? Math.min(0.05, time - prevT) : 0.016
    prevT = time

    // No cursor on touch / coarse pointers → drive a slow drifting reveal point.
    if (mqHoverNone.matches && !lastFrac) {
      const f = {
        x: 0.5 + 0.28 * Math.sin(time * 0.6),
        y: 0.5 + 0.22 * Math.sin(time * 0.83 + 1.1),
      }
      if (synthLast) stampSegment(synthLast, f)
      synthLast = f
    } else {
      synthLast = null
    }

    // Decay the whole trail toward black (controls tail length — lower = longer trace).
    tctx.globalCompositeOperation = 'source-over'
    tctx.fillStyle = 'rgba(0,0,0,0.025)'
    tctx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE)
    trailTex.needsUpdate = true

    uniforms.uTime.value = time
    renderer.render(scene, camera)

    if (!mount.classList.contains('is-live')) mount.classList.add('is-live')
  }
  const start = () => {
    if (!rafId && !disposed) {
      prevT = 0
      rafId = requestAnimationFrame(tick)
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting
      if (inView) start()
    },
    { threshold: 0.02 }
  )
  io.observe(mount)

  const onVisibility = () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    } else if (inView) {
      start()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  // ── context loss → drop to the static fallback ──────────────────────────────
  const onContextLost = (e) => {
    e.preventDefault()
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    cleanup()
    showStaticFallback(mount)
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)

  // ── go ──────────────────────────────────────────────────────────────────────
  const aspectOf = (tex) =>
    tex.image && tex.image.width ? tex.image.width / tex.image.height : 0.6667

  Promise.all([loadTex(PORTRAIT_SRC), loadTex(WIZARD_SRC), loadTex(WIZARD_REAL_SRC)])
    .then(([portrait, line, real]) => {
      if (disposed) {
        portrait.dispose()
        line.dispose()
        real.dispose()
        return
      }
      uniforms.uPortrait.value = portrait
      uniforms.uWizardLine.value = line
      uniforms.uWizardReal.value = real
      uniforms.uPortraitAspect.value = aspectOf(portrait)
      uniforms.uLineAspect.value = aspectOf(line)
      uniforms.uRealAspect.value = aspectOf(real)
      resize()
      start()
    })
    .catch(() => {
      cleanup()
      showStaticFallback(mount)
    })

  // ── teardown ─────────────────────────────────────────────────────────────────
  function cleanup() {
    if (disposed) return
    disposed = true
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    canvas.removeEventListener('pointercancel', onPointerLeave)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    geometry.dispose()
    material.dispose()
    trailTex.dispose()
    if (uniforms.uPortrait.value) uniforms.uPortrait.value.dispose()
    if (uniforms.uWizardLine.value) uniforms.uWizardLine.value.dispose()
    if (uniforms.uWizardReal.value) uniforms.uWizardReal.value.dispose()
    renderer.dispose()
    try {
      renderer.forceContextLoss()
    } catch {}
    mount.classList.remove('is-live')
  }

  return cleanup
}
