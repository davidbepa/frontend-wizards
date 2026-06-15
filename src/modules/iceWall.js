// ─────────────────────────────────────────────────────────────────────────────
// Behind the Wall — a monster frozen in ice (WebGL).
//
// A perspective-tilting pane of ice with the creature looping behind it (a
// VideoTexture). The cursor tilts the pane toward it for depth (the monster, set
// behind the glass, parallaxes against it). When the creature
// POUNDS the wall in the clip
// (fixed frames of its loop), the canvas jolts and a cold bloom of pressure
// pushes through the ice — both synced to the video. On touch devices the
// pane leans with the device instead (deviceorientation; iOS asks permission on
// the first tap), with a slow auto-sway until the sensor is live.
//
// Conventions mirror trueForm.js / conjure.js:
//   • prefers-reduced-motion / no-WebGL → a static composite fallback (poster +
//     ice overlay; <img> srcs are set only when actually shown, and the mp4 is
//     never created in that path).
//   • IntersectionObserver + visibilitychange pause the loop (and the video)
//     off-screen.
//   • full teardown (geometry / material / textures / video / renderer).
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { vertexShader, fragmentShader } from './gl/iceWallShaders.js'

const MONSTER_SRC = '/monster.mp4'
const POSTER_SRC = '/monster-poster.jpg'
const ICE_SRC = '/ice-wall.jpg'

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
const mqHoverNone = window.matchMedia('(hover: none), (pointer: coarse)')

const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n)
const lerp = (a, b, t) => a + (b - a) * t

export function initIceWall() {
  const mount = document.querySelector('[data-ice-wall]')
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
  const monster = mount.querySelector('.iw-fallback--monster')
  const ice = mount.querySelector('.iw-fallback--ice')
  if (monster && !monster.getAttribute('src')) monster.src = POSTER_SRC
  if (ice && !ice.getAttribute('src')) ice.src = ICE_SRC
  mount.classList.add('is-fallback')
  mount.classList.remove('is-live')
}

function hideStaticFallback(mount) {
  mount.classList.remove('is-fallback')
}

// ── Build the live scene; returns a teardown() ────────────────────────────────
function build(mount) {
  const canvas = mount.querySelector('.iw-canvas')
  if (!canvas) {
    showStaticFallback(mount)
    return null
  }

  const isMobile = mqHoverNone.matches
  const DPR_CAP = isMobile ? 1.5 : 2

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
  // Match the band's darkest tone so any sliver revealed at extreme tilt blends
  // into the edges instead of flashing black.
  renderer.setClearColor(0x0f1c22, 1)

  const scene = new THREE.Scene()
  // Perspective so the pane can tilt convincingly toward the cursor. A wider FOV
  // exaggerates the foreshortening on tilt → more depth.
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0, 3)

  // The pane lives in a group we rotate toward the pointer.
  const pane = new THREE.Group()
  scene.add(pane)

  const geometry = new THREE.PlaneGeometry(1, 1)

  // ── the looping creature (VideoTexture) ─────────────────────────────────────
  // Kept in the DOM (hidden behind the canvas) — Safari/iOS throttle decoding of
  // a detached video, which would freeze the texture.
  const video = document.createElement('video')
  video.className = 'iw-video'
  video.muted = true
  video.defaultMuted = true
  video.loop = false // we replay manually so there's a still pause between repeats
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('muted', '')
  video.setAttribute('aria-hidden', 'true')
  video.preload = 'auto'
  video.src = MONSTER_SRC
  mount.appendChild(video)

  const monsterTex = new THREE.VideoTexture(video)
  monsterTex.colorSpace = THREE.NoColorSpace // composited by hand below; don't gamma-decode
  monsterTex.minFilter = monsterTex.magFilter = THREE.LinearFilter
  monsterTex.generateMipmaps = false
  monsterTex.wrapS = monsterTex.wrapT = THREE.ClampToEdgeWrapping

  const uniforms = {
    uMonster: { value: monsterTex },
    uIce: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uMonsterAspect: { value: 1 }, // 720x720 source
    uIceAspect: { value: 1 },
    uParallax: { value: new THREE.Vector2(0, 0) }, // monster slide vs ice (depth)
    uReveal: { value: 0.5 }, // constant clarity of the creature through the ice
    uImpact: { value: 0 }, // pressure-bloom pulse, driven from the video's hits
    uDistort: { value: 0.065 }, // how hard the ice relief refracts the creature
    uCrackColor: { value: new THREE.Color(0.45, 0.75, 1.0) }, // icy cyan
    uMonsterTint: { value: new THREE.Color(0.82, 0.95, 1.06) }, // cool the creature
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  })
  const mesh = new THREE.Mesh(geometry, material)
  pane.add(mesh)

  // ── load the ice texture ────────────────────────────────────────────────────
  const loader = new THREE.TextureLoader()
  const prepIce = (tex) => {
    tex.colorSpace = THREE.NoColorSpace
    tex.minFilter = tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }

  // ── pointer + tilt state ────────────────────────────────────────────────────
  // The cursor ONLY rotates the pane. target* is where the pointer wants the
  // tilt; the loop eases toward it.
  let targetTilt = { x: 0, y: 0 } // -1..1 (drives group rotation)
  let hasPointer = false
  let inView = false
  let disposed = false
  let rafId = 0

  const onPointerMove = (e) => {
    const r = canvas.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    const nx = clamp((e.clientX - r.left) / r.width, 0, 1)
    const ny = clamp((e.clientY - r.top) / r.height, 0, 1)
    targetTilt = { x: nx * 2 - 1, y: ny * 2 - 1 } // -1..1 from centre
    hasPointer = true
  }
  const onPointerLeave = () => {
    hasPointer = false
    targetTilt = { x: 0, y: 0 } // ease back to face-on
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })
  canvas.addEventListener('pointercancel', onPointerLeave, { passive: true })

  // ── device tilt (touch devices) ─────────────────────────────────────────────
  // On phones/tablets the accelerometer plays the cursor's role: the pane leans
  // with the device. A finger on the glass still wins while it's down. iOS gates
  // orientation events behind a permission that must be requested from a user
  // gesture — the first tap on the stage asks; until granted (or on devices with
  // no sensor at all) the auto-sway in the loop keeps the scene alive.
  let hasGyro = false
  let gyroBase = null // the "neutral" hold, in screen-mapped degrees
  const TILT_RANGE = 15 // degrees of device tilt that map to full pane tilt

  const onDeviceTilt = (e) => {
    if (e.beta == null || e.gamma == null) return
    if (hasPointer) return // a touch on the glass overrides the sensor
    // Remap beta/gamma onto screen axes so rotating into landscape doesn't
    // flip the effect. (window.orientation is the legacy iOS fallback.)
    const angle =
      (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0
    let x, y
    if (angle === 90) {
      x = e.beta
      y = -e.gamma
    } else if (angle === -90 || angle === 270) {
      x = -e.beta
      y = e.gamma
    } else if (angle === 180) {
      x = -e.gamma
      y = -e.beta
    } else {
      x = e.gamma
      y = e.beta
    }
    if (!gyroBase) gyroBase = { x, y }
    // Drift the neutral point toward the current hold so the pane settles
    // face-on for *this* grip instead of pinning at an extreme.
    gyroBase.x = lerp(gyroBase.x, x, 0.005)
    gyroBase.y = lerp(gyroBase.y, y, 0.005)
    targetTilt = {
      x: clamp((x - gyroBase.x) / TILT_RANGE, -1, 1),
      y: clamp((y - gyroBase.y) / TILT_RANGE, -1, 1),
    }
    hasGyro = true
  }

  const addGyro = () =>
    window.addEventListener('deviceorientation', onDeviceTilt, { passive: true })
  const onGyroTap = () => {
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === 'granted' && !disposed) addGyro()
      })
      .catch(() => {})
  }
  if (mqHoverNone.matches && typeof window.DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      mount.addEventListener('pointerdown', onGyroTap, { once: true, passive: true })
    } else {
      addGyro()
    }
  }

  // ── resize: keep the pane filling the framed stage (+overscan for the tilt) ──
  const resize = () => {
    const w = canvas.clientWidth || mount.clientWidth || 1
    const h = canvas.clientHeight || mount.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    uniforms.uResolution.value.set(Math.max(1, w * dpr), Math.max(1, h * dpr))

    const aspect = w / h
    camera.aspect = aspect
    camera.updateProjectionMatrix()

    // Size the plane so it exactly fills the view at z=0, then overscan a touch
    // so the tilt never reveals a gap at the frame's edge (the stage clips it).
    const vH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)
    const vW = vH * aspect
    const OVERSCAN = 1.5 // generous, so even a corner tilt never reveals an edge
    mesh.scale.set(vW * OVERSCAN, vH * OVERSCAN, 1)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(mount)

  // ── render loop (owns all writes) ───────────────────────────────────────────
  let prevT = 0
  const MAX_TILT = 0.15 // radians (~8.5°) — rotate toward the cursor, gently

  // ── impact shake: the canvas jolts when the creature pounds the wall ─────────
  // The monster clip strikes the glass at fixed frames of its loop (PUNCH_TIMES).
  // We jolt the canvas as the video crosses those frames and feed a matching
  // pulse to the shader (uImpact) so its cold pressure-bloom swells on the very
  // same hit — one sharp, decaying rattle per strike.
  const PUNCH_TIMES = [3.2, 5.4] // seconds into /monster.mp4 where it hits the wall
  let prevVideoT = 0
  let shake = 0 // 0..1 jolt energy, rattles off after each hit
  const SHAKE_DECAY = 0.0007 // per-second multiplier → ~0.4s rattle tail
  // Each strike isn't a single hit — the wall rings: the slam, then diminishing
  // aftershocks (delay = seconds after the hit; amp = jolt strength 0..1).
  const ECHOES = [
    { delay: 0.0, amp: 1.0 }, // the strike
    { delay: 0.15, amp: 0.45 }, // first echo
    { delay: 0.3, amp: 0.2 }, // fainter second echo
  ]
  const echoQueue = [] // pending jolts: { at: `time` secs, amp }

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
    const k = 1 - Math.pow(0.0015, dt) // frame-rate-independent easing factor

    // No cursor (touch / coarse) and no device tilt yet → a slow auto-sway so
    // the parallax stays alive.
    if (!hasPointer && !hasGyro && mqHoverNone.matches) {
      targetTilt = {
        x: 0.6 * Math.sin(time * 0.4),
        y: 0.4 * Math.sin(time * 0.55 + 0.6),
      }
    }

    // Ease the tilt toward its target — the cursor's only job.
    pane.rotation.y = lerp(pane.rotation.y, targetTilt.x * MAX_TILT, k)
    pane.rotation.x = lerp(pane.rotation.x, -targetTilt.y * MAX_TILT, k)
    // Parallax: the monster sits deep behind the glass and slides against the ice
    // as the pane turns — the main depth cue between the layers.
    uniforms.uParallax.value.set(
      pane.rotation.y * 0.5,
      -pane.rotation.x * 0.5
    )

    // Sync to the monster clip: as currentTime crosses a punch frame, fire a
    // jolt. (currentTime only advances while in view; the vt >= prevVideoT guard
    // skips the loop-wrap frame so the restart never reads as a fresh strike.)
    const vt = video.currentTime
    if (vt >= prevVideoT) {
      for (let i = 0; i < PUNCH_TIMES.length; i++) {
        const pt = PUNCH_TIMES[i]
        // a fresh strike schedules the slam and its trailing echoes
        if (prevVideoT < pt && vt >= pt) {
          for (let j = 0; j < ECHOES.length; j++) {
            echoQueue.push({ at: time + ECHOES[j].delay, amp: ECHOES[j].amp })
          }
        }
      }
    }
    prevVideoT = vt

    // Fire each scheduled jolt as its moment arrives — the slam, then the echoes.
    // Entries gone stale (e.g. after an off-screen pause) just drop, never fire.
    for (let i = echoQueue.length - 1; i >= 0; i--) {
      if (time >= echoQueue[i].at) {
        if (time - echoQueue[i].at < 0.12) shake = Math.max(shake, echoQueue[i].amp)
        echoQueue.splice(i, 1)
      }
    }

    // Smooth pressure pulse for the shader's bloom: 1 at each hit, ~0.3s falloff.
    let impact = 0
    for (let i = 0; i < PUNCH_TIMES.length; i++) {
      const d = vt - PUNCH_TIMES[i]
      if (d >= 0) impact = Math.max(impact, Math.exp(-d * 4.5))
    }
    uniforms.uImpact.value = impact

    shake *= Math.pow(SHAKE_DECAY, dt)

    // High-frequency rattle on two incommensurate axes, sharpened (shake²) so it
    // reads as a hit, not a sway. Tiny vs the 1.5× overscan → no frame edge shows.
    const jolt = shake * shake
    camera.position.x = jolt * 0.09 * Math.sin(time * 96.0)
    camera.position.y = jolt * 0.07 * Math.sin(time * 78.0 + 1.7)

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

  // ── manual loop with a pause between repeats ────────────────────────────────
  // The clip plays through, holds on its last frame for REPEAT_GAP, then plays
  // again. Every (re)start clears any pending gap timer first, so scrolling away
  // and back (or tabbing out) during the pause can't leave a stale replay queued
  // that would later restart the clip mid-playback.
  const REPEAT_GAP = 3000 // ms of stillness between repetitions
  let replayTimer = 0
  const clearReplay = () => {
    if (replayTimer) {
      clearTimeout(replayTimer)
      replayTimer = 0
    }
  }
  const playMonster = () => {
    clearReplay()
    video.play().catch(() => {}) // play() on an ended clip restarts it from 0
  }
  const onEnded = () => {
    clearReplay()
    replayTimer = setTimeout(() => {
      replayTimer = 0
      if (!disposed && inView && !document.hidden) video.play().catch(() => {})
    }, REPEAT_GAP)
  }
  video.addEventListener('ended', onEnded)

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting
      if (inView) {
        playMonster()
        start()
      } else if (!video.paused) {
        video.pause()
      }
    },
    { threshold: 0.02 }
  )
  io.observe(mount)

  const onVisibility = () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
      video.pause()
    } else if (inView) {
      playMonster()
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
  loader.load(
    ICE_SRC,
    (tex) => {
      if (disposed) {
        tex.dispose()
        return
      }
      uniforms.uIce.value = prepIce(tex)
      uniforms.uIceAspect.value =
        tex.image && tex.image.width ? tex.image.width / tex.image.height : 1
      resize()
      if (inView) {
        playMonster()
        start()
      }
    },
    undefined,
    () => {
      cleanup()
      showStaticFallback(mount)
    }
  )

  // ── teardown ──────────────────────────────────────────────────────────────────
  function cleanup() {
    if (disposed) return
    disposed = true
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    clearReplay()
    ro.disconnect()
    io.disconnect()
    video.removeEventListener('ended', onEnded)
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    canvas.removeEventListener('pointercancel', onPointerLeave)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    window.removeEventListener('deviceorientation', onDeviceTilt)
    mount.removeEventListener('pointerdown', onGyroTap)
    geometry.dispose()
    material.dispose()
    monsterTex.dispose()
    if (uniforms.uIce.value) uniforms.uIce.value.dispose()
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
    renderer.dispose()
    try {
      renderer.forceContextLoss()
    } catch {}
    mount.classList.remove('is-live')
  }

  return cleanup
}
