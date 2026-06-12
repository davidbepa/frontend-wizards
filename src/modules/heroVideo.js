// ─────────────────────────────────────────────────────────────────────────────
// Hero background video controller.
//
// The <video> autoplays muted/looped on its own; this module just adds the
// considerate touches:
//   • autoplay blocked / unsupported → swap in a static fallback image.
//   • prefers-reduced-motion → show the fallback image, never play.
//   • hero scrolled off-screen / tab hidden → pause to save battery + CPU.
//
// The fallback <img> starts without a src, so the image is only downloaded on
// devices that actually need it.
// ─────────────────────────────────────────────────────────────────────────────

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const FALLBACK_SRC = '/hero-fallback.jpg'

export function initHeroVideo() {
  const video = document.querySelector('.hero-video')
  if (!video) return

  const hero = video.closest('.hero')
  const fallbackImg = hero && hero.querySelector('.hero-fallback')

  const showFallback = () => {
    if (!hero) return
    if (fallbackImg && !fallbackImg.getAttribute('src')) {
      fallbackImg.src = FALLBACK_SRC
    }
    hero.classList.add('show-fallback')
  }
  const hideFallback = () => hero && hero.classList.remove('show-fallback')

  // Respect reduced-motion: never play, show the static image instead.
  if (reduceMotion()) {
    video.removeAttribute('autoplay')
    video.pause()
    showFallback()
    return
  }

  const tryPlay = () => {
    const p = video.play()
    // A rejected promise means autoplay was blocked → fall back to the image.
    if (p && typeof p.catch === 'function') p.catch(showFallback)
  }

  // If the source can't be loaded/decoded at all, fall back too.
  video.addEventListener('error', showFallback)
  // Once playback actually starts, make sure the fallback is out of the way.
  video.addEventListener('playing', hideFallback)

  // Some browsers need a nudge once metadata is ready.
  tryPlay()
  video.addEventListener('canplay', tryPlay, { once: true })

  // Pause when the hero leaves the viewport; resume when it returns.
  let visible = true
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting
        if (visible) tryPlay()
        else video.pause()
      },
      { threshold: 0.05 }
    )
    io.observe(video)
  }

  // Pause when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause()
    else if (visible) tryPlay()
  })
}
