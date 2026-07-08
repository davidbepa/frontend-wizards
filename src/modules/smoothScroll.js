// ─────────────────────────────────────────────────────────────────────────────
// Global smooth scrolling with Lenis (https://lenis.dev).
//
// Lenis eases the real window scroll, so native `scroll` events still fire and
// getBoundingClientRect() reflects the smoothed offset — every existing
// scroll-driven module (the conjuring scrub, the progress bar, the descent)
// keeps working unchanged, just gliding now instead of snapping. The descent
// section in particular reads its fall velocity straight off this eased scroll.
//
// Disabled under prefers-reduced-motion (native scroll), and re-evaluated when
// the preference flips. Lenis also takes over in-page anchor links (anchors:true)
// so the nav pill glides to each section instead of jumping.
// ─────────────────────────────────────────────────────────────────────────────

import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')

let lenis = null

// Exposed so other modules can read the eased scroll velocity if they want it.
export function getLenis() {
  return lenis
}

function start() {
  if (lenis || mqReduce.matches) return
  lenis = new Lenis({
    autoRaf: true, // Lenis owns its own rAF; module render loops stay separate
    duration: 1.05, // weight of the easing — a little glide, not syrup
    smoothWheel: true,
    anchors: true, // nav `#…` links glide via lenis.scrollTo
  })
}

function stop() {
  if (!lenis) return
  lenis.destroy()
  lenis = null
}

export function initSmoothScroll() {
  start()
  // Flip cleanly between eased and native scrolling on a motion-preference change.
  mqReduce.addEventListener('change', (e) => (e.matches ? stop() : start()))
}
