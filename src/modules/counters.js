// Count-up animation for the "By the Numbers" stat cards.
// Fires once when a card scrolls into view. Honors reduced-motion.

import { gsap } from 'gsap'

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const format = (val, decimals, prefix, suffix) => {
  const num = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString()
  return `${prefix}${num}${suffix}`
}

export function initCounters() {
  const values = Array.from(document.querySelectorAll('.stat-value[data-to]'))
  if (!values.length) return

  // With reduced motion or no IO, the static fallback text already shows the
  // final number — nothing to animate.
  if (reduceMotion() || !('IntersectionObserver' in window)) return

  const run = (node) => {
    const to = parseFloat(node.dataset.to) || 0
    const decimals = parseInt(node.dataset.decimals || '0', 10)
    const prefix = node.dataset.prefix || ''
    const suffix = node.dataset.suffix || ''
    const obj = { v: 0 }
    node.textContent = format(0, decimals, prefix, suffix)
    gsap.to(obj, {
      v: to,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => {
        node.textContent = format(obj.v, decimals, prefix, suffix)
      },
    })
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        run(entry.target)
        obs.unobserve(entry.target)
      })
    },
    { threshold: 0.5 }
  )

  values.forEach((node) => io.observe(node))
}
