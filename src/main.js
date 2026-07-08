import './styles/base.css'
import './styles/sections.css'

import { initSmoothScroll } from './modules/smoothScroll.js'
import { initNavTeleport } from './modules/navTeleport.js'
import { initScroll } from './modules/scroll.js'
import { initHeroVideo } from './modules/heroVideo.js'
import { initArcade } from './modules/arcade.js'

// ── Lazy, below-the-fold modules ──────────────────────────────────────────────
// The WebGL scenes (True form, Descent, The wall, Observatory) and the scrubbed
// Conjuring studio all pull in three.js (~600 kB) or heavy scene code. Statically
// importing them here would fold that weight into the entry chunk and block first
// paint. Instead each is code-split behind a dynamic import() and fetched only as
// its section nears the viewport — three.js never touches the critical path, and a
// visitor who bounces at the hero downloads none of it. Every module still guards
// prefers-reduced-motion / capability internally once initialised.
//
// Only Conjure (560vh) and Descent (620vh) set a tall scroll-track height, and both
// sit far below the initial viewport, so the deferred height is added off-screen —
// no visible layout shift.
const LAZY = [
  ['[data-true-form]', () => import('./modules/trueForm.js').then((m) => m.initTrueForm())],
  ['[data-conjure]', () => import('./modules/conjure.js').then((m) => m.initConjure())],
  ['[data-descent]', () => import('./modules/descent.js').then((m) => m.initDescent())],
  ['[data-ice-wall]', () => import('./modules/iceWall.js').then((m) => m.initIceWall())],
  ['[data-observatory]', () => import('./modules/observatory.js').then((m) => m.initObservatory())],
]

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Fetch + initialise a lazy module when its mount approaches the viewport. The
// generous rootMargin gives the chunk time to download and the scene time to build
// before it scrolls into view; without IntersectionObserver we just load eagerly.
//
// Under reduced motion the modules build a static, natural-height composite whose
// size can't be reserved in CSS ahead of time (unlike the animated tall tracks,
// which are reserved in sections.css). Loading at boot — while scrollTop is still
// 0 — means that growth never shifts the scroll-progress bar. Either path keeps
// the module a code-split chunk, off the entry bundle.
function lazyLoad([selector, load]) {
  const el = document.querySelector(selector)
  if (!el) return
  if (prefersReduced || !('IntersectionObserver' in window)) {
    load()
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        load()
      }
    },
    { rootMargin: '1200px 0px' }
  )
  io.observe(el)
}

// ── Boot ─────────────────────────────────────────────────────────────────────
// The page is authored directly in index.html. The eager set below is light
// (Lenis + vanilla effects) and needed at once; everything heavy is lazy above.
function boot() {
  initSmoothScroll() // global Lenis eased scroll — drives the descent's fall feel
  initNavTeleport() // in-page anchors apparate (fade-cut) instead of gliding
  initScroll() // scroll-progress meter + .reveal entrance animations
  initHeroVideo()
  initArcade() // only renders the cabinet overlay; Phaser stays click-gated
  LAZY.forEach(lazyLoad)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
