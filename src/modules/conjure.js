// ─────────────────────────────────────────────────────────────────────────────
// The Conjuring Studio — a scroll-scrubbed render demo.
//
// One scroll progress (0→1) drives BOTH a video (scrubbed frame-by-frame, never
// autoplayed) and a self-typing prompt window. The story: the incantation types
// itself → an ordinary developer renders into a Frontend Wizard in the video →
// "Conjured ✓". Mirrors the page's own claim: every section was summoned from a
// single prompt handed to an AI agent.
//
// Desktop-only: on phones the scene is never built, so the mp4 is never fetched.
// Reduced-motion: no scroll loop — the final state is rendered statically.
// ─────────────────────────────────────────────────────────────────────────────

const VIDEO_SRC = '/conjure.mp4'

// ── Choreography (all fractions of the usable, pinned scroll) ────────────────
// The beats run in sequence — type the spell, THEN render it — so the prompt
// finishes and "Conjuring…" begins before the video moves a single frame.
const SCRUB_END = 0.88 // content uses this much of the scroll; the rest pins the
//                        final "done" state for a beat before the section releases
const TYPING_END = 0.42 // within the scrub: the prompt finishes typing here. Until
//                         this point the video stays frozen on its opening frame.
const DONE_AT = 0.95 //    within the scrub: the video reaches its end and the
//                         "Conjured ✓" state appears. The video scrubs across
//                         [TYPING_END, DONE_AT] — i.e. only while "Conjuring…".

// First-person incantation. It describes exactly what the footage renders —
// ordinary dev → robed Wizard, slow turn to camera, teal-and-gold, portrait —
// because that prompt↔result correspondence is what sells the effect.
const PROMPT_TEXT =
  'Take an everyday front-end developer and conjure them into a true Frontend Wizard — drape them in an enchanted teal-and-gold robe, set a glowing staff in their hand, and slowly turn them to face me. Cinematic, painterly, portrait.'

const STR = {
  studio: 'Spellforge',
  conjure: 'Conjure',
  generating: 'Conjuring…',
  done: 'Conjured ✓',
  label: 'Incantation',
  aria:
    'An everyday developer slowly transforms into a robed Frontend Wizard holding a glowing staff — rendered from the incantation typed beside it.',
}

const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n)

const mqDesktop = window.matchMedia('(min-width: 768px)')
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')

export function initConjure() {
  const mount = document.querySelector('[data-conjure]')
  if (!mount) return

  let teardown = null

  const sync = () => {
    const wantDesktop = mqDesktop.matches
    if (wantDesktop && !teardown) {
      teardown = build(mount)
    } else if (!wantDesktop && teardown) {
      teardown()
      teardown = null
      mount.replaceChildren() // drops the <video> → stops any fetch/decoding
    }
  }

  // Rebuild on a motion-preference flip so the static/animated path is chosen cleanly.
  const rebuild = () => {
    if (teardown) {
      teardown()
      teardown = null
      mount.replaceChildren()
    }
    sync()
  }

  mqDesktop.addEventListener('change', sync)
  mqReduce.addEventListener('change', rebuild)
  sync()
}

// Build the scene into `mount`; returns a teardown that releases everything.
function build(mount) {
  const reduce = mqReduce.matches

  // ── DOM ────────────────────────────────────────────────────────────────────
  const track = document.createElement('div')
  track.className = 'conjure-track'
  // Taller than a concurrent scene would need: typing and rendering now run
  // back-to-back, so both beats get their own stretch of scroll.
  if (!reduce) track.style.height = '560vh' // more vh = slower scrub

  const stage = document.createElement('div')
  stage.className = 'conjure-stage' + (reduce ? ' is-static' : '')

  // Left: the render screen (video in its native portrait aspect).
  const screen = document.createElement('div')
  screen.className = 'conjure-screen'
  const video = document.createElement('video')
  video.className = 'conjure-video'
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('playsinline', '') // Safari attribute form
  video.setAttribute('muted', '')
  video.preload = 'auto'
  video.tabIndex = -1
  video.setAttribute('aria-label', STR.aria)
  video.src = VIDEO_SRC
  screen.appendChild(video)

  // Right: the simulated prompt window.
  const win = document.createElement('div')
  win.className = 'conjure-window'
  win.innerHTML = `
    <div class="cw-chrome">
      <span class="cw-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="cw-spark" aria-hidden="true">✦</span>
      <span class="cw-title">${STR.studio}</span>
    </div>
    <div class="cw-body">
      <p class="cw-label">${STR.label}</p>
      <div class="cw-input"><span class="cw-typed"></span><span class="cw-caret" aria-hidden="true"></span></div>
    </div>
    <div class="cw-foot"></div>`

  stage.appendChild(screen)
  stage.appendChild(win)
  track.appendChild(stage)
  mount.appendChild(track)

  const typedEl = win.querySelector('.cw-typed')
  const footEl = win.querySelector('.cw-foot')

  // Fade the footage in once the first frame is decodable.
  const reveal = () => video.classList.add('is-ready')
  video.addEventListener('loadeddata', reveal, { once: true })
  video.addEventListener('loadedmetadata', reveal, { once: true })

  // ── Phase + typing renderers (cheap, idempotent) ────────────────────────────
  let phase = null
  const setPhase = (p) => {
    if (p === phase) return
    phase = p
    win.dataset.phase = p
    if (p === 'typing') {
      footEl.innerHTML = `<span class="cw-btn">${STR.conjure}</span>`
    } else if (p === 'generating') {
      footEl.innerHTML = `<span class="cw-badge cw-badge--busy"><span class="cw-spin" aria-hidden="true"></span>${STR.generating}</span>`
    } else {
      footEl.innerHTML = `<span class="cw-badge cw-badge--done">${STR.done}</span>`
    }
  }
  let lastChars = -1
  const setTyped = (chars) => {
    if (chars === lastChars) return
    lastChars = chars
    typedEl.textContent = PROMPT_TEXT.slice(0, chars)
  }

  // ── Reduced motion: static final state, no loop ─────────────────────────────
  if (reduce) {
    setTyped(PROMPT_TEXT.length)
    setPhase('done')
    const park = () => {
      const d = video.duration
      if (isFinite(d) && d > 0) {
        try {
          video.currentTime = Math.max(0, d - 0.05)
        } catch {}
      }
    }
    video.addEventListener('loadedmetadata', park, { once: true })
    if (video.readyState >= 1) park()
    return () => {
      video.removeEventListener('loadedmetadata', park)
      video.removeAttribute('src')
      video.load()
    }
  }

  // ── Scroll-driven scene ─────────────────────────────────────────────────────
  setPhase('typing')
  setTyped(0)

  let targetTime = 0 // latest video position the scroll wants
  let pendingChars = 0 // latest revealed-char count the scroll wants
  let desiredPhase = 'typing'
  let seeking = false // a seek is in flight — never queue a second one
  let inView = false
  let rafId = 0

  // Handler does READS only: measure geometry, store targets. No DOM writes,
  // no video pokes — the rAF loop owns all of that.
  const measure = () => {
    const rect = track.getBoundingClientRect()
    const denom = rect.height - window.innerHeight
    const progress = denom > 0 ? clamp(-rect.top / denom, 0, 1) : 0
    const scrub = clamp(progress / SCRUB_END, 0, 1)

    // 1) The prompt types itself first, while the video holds on frame 0.
    const typed = clamp(scrub / TYPING_END, 0, 1)
    pendingChars = Math.round(typed * PROMPT_TEXT.length)

    // 2) The video only starts rendering once "Conjuring…" begins (typing done),
    //    scrubbing 0→end across [TYPING_END, DONE_AT].
    const videoScrub = clamp((scrub - TYPING_END) / (DONE_AT - TYPING_END), 0, 1)
    const d = video.duration
    if (isFinite(d) && d > 0) targetTime = videoScrub * d

    desiredPhase = scrub >= DONE_AT ? 'done' : typed >= 1 ? 'generating' : 'typing'
  }

  const onSeeked = () => {
    seeking = false
  }
  video.addEventListener('seeked', onSeeked)

  // The loop owns all writes. Runs only while in view; chases the LATEST target
  // (skipping intermediate positions) instead of decoding every frame between.
  const tick = () => {
    if (!inView) {
      rafId = 0
      return // zero work off-screen
    }
    rafId = requestAnimationFrame(tick)

    setTyped(pendingChars)
    setPhase(desiredPhase)

    if (video.readyState < 1) return
    const dur = video.duration
    if (!isFinite(dur) || dur <= 0) return
    if (!seeking && Math.abs(targetTime - video.currentTime) > 0.01) {
      seeking = true
      if (typeof video.fastSeek === 'function') video.fastSeek(targetTime)
      else video.currentTime = targetTime
    }
  }
  const startLoop = () => {
    if (!rafId) rafId = requestAnimationFrame(tick)
  }

  const onScroll = () => measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  video.addEventListener('loadedmetadata', measure, { once: true })

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting
      if (inView) {
        measure()
        startLoop()
      }
    },
    { rootMargin: '256px 0px' }
  )
  io.observe(track)

  measure()

  return () => {
    if (rafId) cancelAnimationFrame(rafId)
    io.disconnect()
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    video.removeEventListener('seeked', onSeeked)
    video.removeAttribute('src')
    video.load()
  }
}
