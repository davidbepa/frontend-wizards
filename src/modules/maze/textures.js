// ─────────────────────────────────────────────────────────────────────────────
// Procedural textures — drawn in the Arcane Academy palette so the game looks
// finished with no asset files at all. Every key here is also an OVERRIDE point:
// if the user drops a real PNG into public/assets/maze/<key>.png (see
// sprites-todo.md), the Preloader loads it under the same key and we skip the
// procedural version. So the art upgrades in place with zero code changes.
//
// Drawn at SS× and scaled down at display time → crisp on HiDPI.
// ─────────────────────────────────────────────────────────────────────────────

const SS = 3 // supersample for crisp edges

export const ART = {
  HERO: 36, // hero sprite-sheet frame (logical px)
  BUG: 34,
  RUNE: 18,
  POTION: 30,
  SPARK: 64,
  BONUS: 28,
  LIFE: 26,
  EYE: 18,
}

// The optional override files the Preloader tries to load, keyed by texture name.
// Custom hero art is a single image (a chomp sprite-sheet is hard to generate);
// the procedural hero is a 2-frame sheet. Game.js handles both.
export const OVERRIDES = {
  hero: { type: 'image' },
  bug0: { type: 'image' },
  bug1: { type: 'image' },
  bug2: { type: 'image' },
  bug3: { type: 'image' },
  rune: { type: 'image' },
  potion: { type: 'image' },
  spark: { type: 'image' },
  bonus: { type: 'image' },
  life: { type: 'image' },
}

export function buildProceduralTextures(scene) {
  if (!scene.textures.exists('hero')) buildHero(scene)
  if (!scene.textures.exists('bugBase')) buildBug(scene, 'bugBase')
  if (!scene.textures.exists('rune')) buildRune(scene)
  if (!scene.textures.exists('potion')) buildPotion(scene)
  if (!scene.textures.exists('spark')) buildSpark(scene)
  if (!scene.textures.exists('bonus')) buildBonus(scene)
  if (!scene.textures.exists('life')) buildLife(scene)
}

// canvas helper: make a CanvasTexture, hand back the 2d context to a drawer
function canvas(scene, key, w, h) {
  const tex = scene.textures.createCanvas(key, w, h)
  return tex
}

// ── Hero: a gold "chomping" arcane disc, two-frame sheet, faces +x ───────────
function buildHero(scene) {
  const f = ART.HERO * SS
  const tex = canvas(scene, 'hero', f * 2, f)
  const ctx = tex.context
  drawHeroFrame(ctx, 0, f, 0.30) // mouth open
  drawHeroFrame(ctx, f, f, 0.02) // mouth nearly closed
  tex.add(0, 0, 0, 0, f, f)
  tex.add(1, 0, f, 0, f, f)
  tex.refresh()
}

function drawHeroFrame(ctx, x0, f, mouth) {
  const cx = x0 + f / 2
  const cy = f / 2
  const r = f * 0.4
  // soft glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.4)
  glow.addColorStop(0, 'rgba(224,189,107,0.45)')
  glow.addColorStop(1, 'rgba(224,189,107,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x0, 0, f, f)
  // body (mouth wedge cut on the right)
  const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r)
  body.addColorStop(0, '#f3dc97')
  body.addColorStop(0.6, '#e0bd6b')
  body.addColorStop(1, '#c39a44')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, r, mouth * Math.PI, (2 - mouth) * Math.PI)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = Math.max(1, f * 0.022)
  ctx.strokeStyle = 'rgba(60,42,10,0.45)'
  ctx.stroke()
  // faint inner rune ring
  ctx.strokeStyle = 'rgba(255,248,224,0.35)'
  ctx.lineWidth = Math.max(1, f * 0.012)
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2)
  ctx.stroke()
  // eye
  ctx.fillStyle = '#2c2519'
  ctx.beginPath()
  ctx.arc(cx + r * 0.04, cy - r * 0.44, f * 0.05, 0, Math.PI * 2)
  ctx.fill()
}

// ── Bug body (no eyes — eyes are drawn in-scene so they can look around) ─────
function buildBug(scene, key) {
  const s = ART.BUG * SS
  const tex = canvas(scene, key, s, s)
  const ctx = tex.context
  const w = s * 0.82
  const x0 = (s - w) / 2
  const top = s * 0.1
  const r = w / 2
  const cx = s / 2
  const bottom = s * 0.9
  const grd = ctx.createLinearGradient(0, top, 0, bottom)
  grd.addColorStop(0, '#ffffff')
  grd.addColorStop(1, '#d7e0e0')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.moveTo(x0, bottom)
  ctx.lineTo(x0, top + r)
  ctx.arc(cx, top + r, r, Math.PI, 0) // domed head
  ctx.lineTo(x0 + w, bottom)
  const humps = 4
  const hw = w / humps
  for (let i = 0; i < humps; i++) {
    const sx = x0 + w - i * hw
    ctx.quadraticCurveTo(sx - hw / 2, bottom - s * 0.13, sx - hw, bottom)
  }
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = Math.max(1, s * 0.02)
  ctx.strokeStyle = 'rgba(15,28,34,0.2)'
  ctx.stroke()
  // a little antenna glitch-spark to read as "bug"
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = Math.max(1, s * 0.025)
  ctx.beginPath()
  ctx.moveTo(cx, top)
  ctx.lineTo(cx, top - s * 0.12)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, top - s * 0.14, s * 0.05, 0, Math.PI * 2)
  ctx.fill()
  tex.refresh()
}

// ── Rune pellet: a twinkling gold spark ──────────────────────────────────────
function buildRune(scene) {
  const s = ART.RUNE * SS
  const tex = canvas(scene, 'rune', s, s)
  const ctx = tex.context
  const cx = s / 2
  const cy = s / 2
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5)
  g.addColorStop(0, 'rgba(224,189,107,0.95)')
  g.addColorStop(0.45, 'rgba(201,162,75,0.45)')
  g.addColorStop(1, 'rgba(201,162,75,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#f7eccb'
  ctx.beginPath()
  const R = s * 0.36
  const rr = s * 0.12
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2
    const rad = i % 2 ? rr : R
    const x = cx + Math.cos(ang) * rad
    const y = cy + Math.sin(ang) * rad
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  tex.refresh()
}

// ── Power potion: a glowing sage flask with a gold cork ──────────────────────
function buildPotion(scene) {
  const s = ART.POTION * SS
  const tex = canvas(scene, 'potion', s, s)
  const ctx = tex.context
  const cx = s / 2
  // glow
  const glow = ctx.createRadialGradient(cx, s * 0.6, s * 0.1, cx, s * 0.6, s * 0.5)
  glow.addColorStop(0, 'rgba(122,156,141,0.6)')
  glow.addColorStop(1, 'rgba(122,156,141,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, s, s)
  // flask body
  ctx.fillStyle = 'rgba(243,234,212,0.18)'
  ctx.strokeStyle = '#e0bd6b'
  ctx.lineWidth = Math.max(1, s * 0.03)
  ctx.beginPath()
  ctx.arc(cx, s * 0.62, s * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // liquid
  const liq = ctx.createLinearGradient(0, s * 0.45, 0, s * 0.9)
  liq.addColorStop(0, '#8fb3a4')
  liq.addColorStop(1, '#5f8273')
  ctx.fillStyle = liq
  ctx.beginPath()
  ctx.arc(cx, s * 0.62, s * 0.21, 0, Math.PI * 2)
  ctx.fill()
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.ellipse(cx - s * 0.08, s * 0.52, s * 0.05, s * 0.08, -0.5, 0, Math.PI * 2)
  ctx.fill()
  // neck + cork
  ctx.fillStyle = '#1d3138'
  ctx.fillRect(cx - s * 0.07, s * 0.24, s * 0.14, s * 0.16)
  ctx.fillStyle = '#c9a24b'
  ctx.fillRect(cx - s * 0.09, s * 0.18, s * 0.18, s * 0.08)
  tex.refresh()
}

// ── Spark: soft round glow for additive particle bursts ──────────────────────
function buildSpark(scene) {
  const s = ART.SPARK
  const tex = canvas(scene, 'spark', s, s)
  const ctx = tex.context
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,244,214,0.85)')
  g.addColorStop(1, 'rgba(255,244,214,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  tex.refresh()
}

// ── Bonus gem (Pac-Man's fruit) ──────────────────────────────────────────────
function buildBonus(scene) {
  const s = ART.BONUS * SS
  const tex = canvas(scene, 'bonus', s, s)
  const ctx = tex.context
  const cx = s / 2
  const cy = s / 2
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5)
  glow.addColorStop(0, 'rgba(216,132,63,0.6)')
  glow.addColorStop(1, 'rgba(216,132,63,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, s, s)
  const w = s * 0.34
  const h = s * 0.42
  const grd = ctx.createLinearGradient(cx, cy - h, cx, cy + h)
  grd.addColorStop(0, '#f0a463')
  grd.addColorStop(1, '#c9662a')
  ctx.fillStyle = grd
  ctx.strokeStyle = '#f3ead4'
  ctx.lineWidth = Math.max(1, s * 0.02)
  ctx.beginPath()
  ctx.moveTo(cx, cy - h)
  ctx.lineTo(cx + w, cy)
  ctx.lineTo(cx, cy + h)
  ctx.lineTo(cx - w, cy)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // facet
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.moveTo(cx - w, cy)
  ctx.lineTo(cx, cy - h * 0.3)
  ctx.lineTo(cx + w, cy)
  ctx.stroke()
  tex.refresh()
}

// ── Life icon: a little wizard hat (the one place the hat motif lives) ────────
function buildLife(scene) {
  const s = ART.LIFE * SS
  const tex = canvas(scene, 'life', s, s)
  const ctx = tex.context
  const cx = s / 2
  // hat cone
  ctx.fillStyle = '#5f8273'
  ctx.beginPath()
  ctx.moveTo(cx, s * 0.12)
  ctx.lineTo(s * 0.78, s * 0.74)
  ctx.lineTo(s * 0.22, s * 0.74)
  ctx.closePath()
  ctx.fill()
  // brim
  ctx.fillStyle = '#7a9c8d'
  ctx.beginPath()
  ctx.ellipse(cx, s * 0.76, s * 0.4, s * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  // gold band + star
  ctx.fillStyle = '#c9a24b'
  ctx.fillRect(s * 0.3, s * 0.6, s * 0.4, s * 0.07)
  ctx.fillStyle = '#f3ead4'
  star(ctx, cx, s * 0.4, s * 0.09, s * 0.04)
  tex.refresh()
}

function star(ctx, cx, cy, R, r) {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2
    const rad = i % 2 ? r : R
    const x = cx + Math.cos(ang) * rad
    const y = cy + Math.sin(ang) * rad
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}
