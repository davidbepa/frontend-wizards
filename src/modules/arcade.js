// ─────────────────────────────────────────────────────────────────────────────
// Debug the Dungeon — the site-side mount for the maze mini-game.
//
// Phaser is heavy, so nothing loads until the player clicks Play: only then do
// we dynamic-import the game factory and boot it into the cabinet screen. The
// game captures the arrow/WASD keys (so it never fights page scroll) only while
// it exists; Exit (or Esc) destroys it and hands the keyboard back to the page.
// Mirrors conjure.js's self-guarding + teardown style.
// ─────────────────────────────────────────────────────────────────────────────

import { Save } from './maze/save.js'

export function initArcade() {
  const mount = document.querySelector('[data-maze]')
  if (!mount) return

  const screen = mount.querySelector('.arcade-screen')
  const overlay = mount.querySelector('[data-arcade-overlay]')
  const exitBtn = mount.querySelector('[data-arcade-exit]')
  if (!screen || !overlay || !exitBtn) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let game = null
  let loading = false

  const renderOverlay = () => {
    const best = Save.high
    overlay.innerHTML = `
      <div class="arcade-card">
        <p class="arcade-kicker">Mini-game</p>
        <h3 class="arcade-name">Debug the Dungeon</h3>
        <p class="arcade-blurb">
          Guide the apprentice through the grimoire-maze. Gather every stray
          semicolon, quaff a potion to banish the bugs — and don't get caught.
        </p>
        ${best ? `<p class="arcade-best">Best run · <strong>${best}</strong></p>` : ''}
        <button class="btn btn-primary arcade-play" data-play type="button">
          ${best ? 'Play again' : 'Enter the dungeon'}
        </button>
        <p class="arcade-hint">
          <span>↑ ← ↓ →</span> or <span>W A S D</span> · swipe on touch · <span>Esc</span> to leave
        </p>
      </div>`
    overlay.querySelector('[data-play]').addEventListener('click', start)
  }

  const start = async () => {
    if (game || loading) return
    loading = true
    overlay.classList.add('is-hidden')
    try {
      const [{ createMazeGame }, { resumeAudio }] = await Promise.all([
        import('./maze/index.js'),
        import('./maze/audio.js'),
      ])
      resumeAudio() // unlock audio within the click gesture
      game = await createMazeGame(screen, { reduced, onExit: stop })
      exitBtn.hidden = false
      mount.classList.add('is-playing')
    } catch (err) {
      console.error('[arcade] failed to start game', err)
      overlay.classList.remove('is-hidden')
    } finally {
      loading = false
    }
  }

  const stop = () => {
    if (game) {
      game.destroy(true)
      game = null
    }
    exitBtn.hidden = true
    mount.classList.remove('is-playing')
    renderOverlay() // refreshes the best-score line
    overlay.classList.remove('is-hidden')
  }

  exitBtn.addEventListener('click', stop)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && game) stop()
  })

  renderOverlay()
}
