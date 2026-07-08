import './styles/base.css'
import './styles/sections.css'

import { pillars, spells, stats, stack, grimoire, ladder, sources, work } from './data.js'
import { initSmoothScroll } from './modules/smoothScroll.js'
import { initNavTeleport } from './modules/navTeleport.js'
import { initScroll } from './modules/scroll.js'
import { initCounters } from './modules/counters.js'
import { initHeroVideo } from './modules/heroVideo.js'
import { initConjure } from './modules/conjure.js'
import { initDescent } from './modules/descent.js'
import { initTrueForm } from './modules/trueForm.js'
import { initIceWall } from './modules/iceWall.js'
import { initObservatory } from './modules/observatory.js'
import { initArcade } from './modules/arcade.js'

// Small helpers ──────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel)
const el = (tag, cls, html) => {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (html != null) node.innerHTML = html
  return node
}
const srcLink = (id) => {
  const s = sources[id]
  return s ? `<a class="stat-src" href="${s.url}" target="_blank" rel="noopener">${s.label} ↗</a>` : ''
}

// ── Render data-driven sections ──────────────────────────────────────────────
function renderPillars() {
  const wrap = $('[data-pillars]')
  if (!wrap) return
  pillars.forEach((p) => {
    const card = el('article', 'pillar reveal')
    card.innerHTML = `
      <div class="pillar-icon" aria-hidden="true">${p.icon}</div>
      <p class="pillar-label">${p.label}</p>
      <h3>${p.title}</h3>
      <p>${p.blurb}</p>`
    wrap.appendChild(card)
  })
}

function renderSpells() {
  const wrap = $('[data-spells]')
  if (!wrap) return
  spells.forEach((s) => {
    const card = el('article', 'spell reveal')
    card.innerHTML = `
      <span class="spell-icon" aria-hidden="true">${s.icon}</span>
      <h3>${s.title}</h3>
      <p>${s.blurb}</p>`
    wrap.appendChild(card)
  })
}

function renderStats() {
  const wrap = $('[data-stats]')
  if (!wrap) return
  stats.forEach((s) => {
    const card = el('article', 'stat reveal')
    const value = el('div', 'stat-value')
    value.dataset.to = s.to
    if (s.decimals != null) value.dataset.decimals = s.decimals
    if (s.prefix) value.dataset.prefix = s.prefix
    if (s.suffix) value.dataset.suffix = s.suffix
    // sensible pre-JS / reduced-motion fallback text
    value.textContent = `${s.prefix || ''}${s.to}${s.suffix || ''}`
    card.appendChild(value)
    card.appendChild(el('p', 'stat-label', s.label))
    if (s.note) card.appendChild(el('p', 'stat-note', s.note))
    card.insertAdjacentHTML('beforeend', srcLink(s.source))
    wrap.appendChild(card)
  })

  const workLine = $('[data-work]')
  if (workLine) {
    workLine.innerHTML = `And the lifestyle? <strong>${work.remote}%</strong> work fully remote and another
      <strong>${work.hybrid}%</strong> hybrid — only <strong>${work.onsite}%</strong> are tied to a desk.
      ${srcLink(work.source)}`
  }
}

function renderGrimoire() {
  const wrap = $('[data-grimoire]')
  if (!wrap) return
  grimoire.forEach((g) => {
    const item = el('li', 't-item reveal')
    item.innerHTML = `
      <span class="t-time">${g.time}</span>
      <h3>${g.title}</h3>
      <p>${g.text}</p>`
    wrap.appendChild(item)
  })
}

function renderStack() {
  const wrap = $('[data-stack]')
  if (wrap) {
    stack.forEach((t) => {
      const card = el('article', 'tech reveal')
      card.innerHTML = `
        <div class="tech-top">
          <span class="tech-name">${t.name}</span>
          <span class="tech-pct">${t.pct}%</span>
        </div>
        <p class="tech-tag">${t.tag}</p>
        <div class="tech-bar"><span data-bar="${t.pct}"></span></div>`
      wrap.appendChild(card)
    })
  }

  // duplicate the tool list twice so the marquee loops seamlessly (-50%)
  const track = $('[data-marquee]')
  if (track) {
    const names = [
      'React', 'Vue', 'Svelte', 'Next.js', 'Astro', 'TypeScript', 'Tailwind',
      'Sass', 'GSAP', 'Three.js', 'Vite', 'Figma', 'Git', 'Vitest', 'Playwright',
    ]
    const run = names.map((n) => `<span>✦ ${n}</span>`).join('')
    track.innerHTML = run + run
  }
}

function renderLadder() {
  const wrap = $('[data-ladder]')
  if (!wrap) return
  ladder.forEach((r) => {
    const card = el('article', 'rung reveal')
    card.innerHTML = `
      <p class="rung-rank">${r.rank}</p>
      <h3>${r.role}</h3>
      <p class="rung-meta">${r.years}</p>
      <p class="rung-pay">${r.pay}</p>
      <p>${r.text}</p>`
    wrap.appendChild(card)
  })
}

// ── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  renderPillars()
  renderSpells()
  renderStats()
  renderGrimoire()
  renderStack()
  renderLadder()

  // Effects (each guards prefers-reduced-motion / capability internally)
  initSmoothScroll() // global Lenis eased scroll — drives the descent's fall feel
  initNavTeleport() // in-page anchors apparate (fade-cut) instead of gliding
  initScroll()
  initCounters()
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
