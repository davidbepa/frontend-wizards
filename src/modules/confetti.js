// Confetti spell on any [data-confetti] element. Honors reduced-motion.

import confetti from 'canvas-confetti'

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const COLORS = ['#e0bd6b', '#d8843f', '#7a9c8d', '#f3ead4']

export function initConfetti() {
  const triggers = document.querySelectorAll('[data-confetti]')
  if (!triggers.length) return

  const cast = (e) => {
    if (reduceMotion()) return
    const r = e.currentTarget.getBoundingClientRect()
    const origin = {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    }
    confetti({
      particleCount: 70,
      spread: 75,
      startVelocity: 42,
      gravity: 0.9,
      scalar: 0.9,
      ticks: 200,
      origin,
      colors: COLORS,
      disableForReducedMotion: true,
    })
    // a second, delayed burst for a little extra sparkle
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 110,
        startVelocity: 28,
        scalar: 0.7,
        origin,
        colors: COLORS,
        disableForReducedMotion: true,
      })
    }, 130)
  }

  triggers.forEach((t) => t.addEventListener('click', cast))
}
