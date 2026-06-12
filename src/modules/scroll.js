// Scroll-driven effects: reveal-on-enter, top progress bar, tech-bar fills.
// Uses IntersectionObserver (robust, dependency-free) for triggering.

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function initScroll() {
  initProgress()
  initReveals()
}

function initProgress() {
  const bar = document.querySelector('[data-progress]')
  if (!bar) return
  let ticking = false
  const update = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - doc.clientHeight
    const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0
    bar.style.width = pct + '%'
    ticking = false
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    },
    { passive: true }
  )
  update()
}

function initReveals() {
  const items = Array.from(document.querySelectorAll('.reveal'))
  if (!items.length) return

  // Reduced motion (or no IO support): just show everything immediately.
  if (reduceMotion() || !('IntersectionObserver' in window)) {
    items.forEach((node) => {
      node.classList.add('is-visible')
      fillBars(node)
    })
    return
  }

  // Stagger siblings within the same container for a pleasing cascade.
  items.forEach((node) => {
    const parent = node.parentElement
    const idx = parent ? Array.prototype.indexOf.call(parent.children, node) : 0
    node.style.transitionDelay = Math.min(idx, 6) * 70 + 'ms'
  })

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        fillBars(entry.target)
        obs.unobserve(entry.target)
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  )

  items.forEach((node) => io.observe(node))
}

// Animate the arcane-stack adoption bars to their real percentage on reveal.
function fillBars(scope) {
  scope.querySelectorAll('[data-bar]').forEach((bar) => {
    const pct = parseFloat(bar.getAttribute('data-bar')) || 0
    bar.style.width = pct + '%'
  })
}
