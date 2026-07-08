import './styles/base.css'
import './styles/sections.css'

import { initSmoothScroll } from './modules/smoothScroll.js'
import { initNavTeleport } from './modules/navTeleport.js'
import { initScroll } from './modules/scroll.js'
import { initHeroVideo } from './modules/heroVideo.js'
import { initConjure } from './modules/conjure.js'
import { initDescent } from './modules/descent.js'
import { initTrueForm } from './modules/trueForm.js'
import { initIceWall } from './modules/iceWall.js'
import { initObservatory } from './modules/observatory.js'
import { initArcade } from './modules/arcade.js'

// ── Boot ─────────────────────────────────────────────────────────────────────
// The page is authored directly in index.html; every entry below is an effect
// that guards prefers-reduced-motion / capability internally.
function boot() {
  initSmoothScroll() // global Lenis eased scroll — drives the descent's fall feel
  initNavTeleport() // in-page anchors apparate (fade-cut) instead of gliding
  initScroll() // scroll-progress meter + .reveal entrance animations
  initHeroVideo()
  initConjure()
  initDescent()
  initTrueForm()
  initIceWall()
  initObservatory()
  initArcade()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
