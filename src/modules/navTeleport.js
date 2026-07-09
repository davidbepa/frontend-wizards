// ─────────────────────────────────────────────────────────────────────────────
// Apparate — teleport between sections instead of gliding through them.
//
// This page is heavy with scroll-SCRUBBED scenes: the conjure video scrub, the
// descent fall, true-form, ice-wall and the observatory assembly all read the
// live scroll position. Easing an auto-scroll from the top to a far section
// therefore fast-forwards every scene in between at once — the jank we're
// avoiding. Instead, an in-page anchor click fades a full-viewport "void"
// curtain over everything, hard-JUMPS under cover (nothing plays mid-flight),
// then clears. Reads as teleporting through the dark — on theme for the order.
//
// prefers-reduced-motion → no fade, just an instant cut. ⌘/ctrl/shift-click and
// modified clicks are left alone so links still open normally.
// ─────────────────────────────────────────────────────────────────────────────

import { getLenis } from './smoothScroll.js'

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Must match the .void-curtain opacity transition in base.css.
const FADE_MS = 260

export function initNavTeleport() {
  const curtain = document.createElement('div')
  curtain.className = 'void-curtain'
  curtain.setAttribute('aria-hidden', 'true')
  document.body.appendChild(curtain)

  let busy = false

  // Hard-jump with no animation. Lenis owns the scroll while it's running, so go
  // through it; fall back to native for reduced-motion / no-Lenis.
  //
  // Two gotchas, both handled here:
  //   • Lenis caches the document height, and it's measured at init — BEFORE the
  //     conjure/descent sections inject their tall (620vh) scroll-scrubbed tracks.
  //     Until its ResizeObserver settles (a beat after fonts/layout), Lenis thinks
  //     the page is ~5.6k tall and CLAMPS any jump to ~4.9k. resize() forces a
  //     fresh measurement so a jump fired right after load still reaches the end.
  //   • Lenis' element-based scrollTo mis-resolves offsets through those pinned
  //     tracks, so we compute the absolute target ourselves and pass a number.
  const jump = (target) => {
    const lenis = getLenis()

    // A section may nominate a child to CENTRE in the viewport on arrival instead
    // of the default top-align (mark it `data-teleport-center`). The Observatory
    // uses this: its payoff is the centred, fully-assembled console, not the
    // heading above it — and its assemble animation only completes when the stage
    // sits at viewport centre, so top-aligning would land you on a half-built rig.
    const focus = target.querySelector('[data-teleport-center]')

    if (!lenis) {
      // reduced-motion / no-Lenis: native isn't clamped
      ;(focus || target).scrollIntoView(focus ? { block: 'center' } : true)
      return
    }
    lenis.resize()
    let top
    if (focus) {
      const r = focus.getBoundingClientRect()
      // Centre the focus; if it's taller than the viewport, fall back to top-align.
      top = r.top + window.scrollY - Math.max(0, (window.innerHeight - r.height) / 2)
    } else {
      top = target.getBoundingClientRect().top + window.scrollY
    }
    lenis.scrollTo(top, { immediate: true, force: true })
  }

  const resolve = (link) => {
    const hash = link.getAttribute('href')
    if (!hash || hash === '#') return null
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    return target ? { hash, target } : null
  }

  document.addEventListener(
    'click',
    (e) => {
      // Let modified clicks (open-in-tab, etc.) and non-primary buttons through.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return

      const link = e.target.closest('a[href^="#"]')
      if (!link) return
      const hit = resolve(link)
      if (!hit) return

      e.preventDefault()

      // Reduced motion: cut straight there, no fade (and no busy gate needed).
      if (reduceMotion()) {
        jump(hit.target)
        history.pushState(null, '', hit.hash)
        return
      }
      if (busy) return
      busy = true

      curtain.classList.add('is-covering')
      window.setTimeout(() => {
        // The jump is the heavy beat — the destination section spins up its
        // WebGL on arrival, which can block the thread and delay the cleanup
        // below (the curtain simply lingers a touch, masking that pop-in). The
        // finally guarantees we ALWAYS lift the curtain and release, even if the
        // jump throws — never leave the viewport blacked out or teleport wedged.
        try {
          jump(hit.target)
          history.pushState(null, '', hit.hash)
        } finally {
          // Lift the curtain just after the jump. A plain timer, NOT rAF: rAF is
          // paused while the tab is hidden, so an rAF-based cleanup would wedge
          // the curtain up (and the busy gate on) if the user teleports then
          // switches tabs. The short delay lets the new position paint first.
          window.setTimeout(() => {
            curtain.classList.remove('is-covering')
            window.setTimeout(() => {
              busy = false
            }, FADE_MS)
          }, 60)
        }
      }, FADE_MS)
    },
    true // capture — settle the destination before anything else reacts
  )
}
