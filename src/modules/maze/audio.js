// ─────────────────────────────────────────────────────────────────────────────
// Lightweight procedural SFX via the Web Audio API — so the game has feedback
// with zero audio files. If the user later drops real SFX/music into
// public/assets/maze/, they can be wired through Phaser's loader; until then,
// these synthesised blips cover every meaningful action.
//
// A browser won't start audio without a user gesture; resume() is called from
// the Play button click and again on the first keypress.
// ─────────────────────────────────────────────────────────────────────────────

let ctx = null
const getCtx = () => {
  if (ctx) return ctx
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    ctx = null
  }
  return ctx
}

export function resumeAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

function tone(freq, dur = 0.08, type = 'square', gain = 0.04, when = 0) {
  const c = getCtx()
  if (!c) return
  const t = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function sweep(f0, f1, dur, type = 'sawtooth', gain = 0.05) {
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const Sfx = {
  muted: false,
  set enabled(v) {
    this.muted = !v
  },
  get enabled() {
    return !this.muted
  },
  chomp() {
    if (this.muted) return
    tone(150 + Math.random() * 60, 0.045, 'square', 0.02)
  },
  potion() {
    if (this.muted) return
    sweep(280, 620, 0.28, 'triangle', 0.05)
  },
  eat() {
    if (this.muted) return
    tone(760, 0.09, 'square', 0.05)
    tone(1140, 0.12, 'square', 0.05, 0.07)
  },
  bonus() {
    if (this.muted) return
    tone(880, 0.09, 'triangle', 0.05)
    tone(1320, 0.12, 'triangle', 0.05, 0.08)
  },
  caught() {
    if (this.muted) return
    sweep(420, 70, 0.5, 'sawtooth', 0.06)
  },
  win() {
    if (this.muted) return
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.05, i * 0.12))
  },
  lose() {
    if (this.muted) return
    ;[392, 311, 233, 175].forEach((f, i) => tone(f, 0.22, 'sawtooth', 0.05, i * 0.16))
  },
  start() {
    if (this.muted) return
    tone(440, 0.1, 'triangle', 0.05)
    tone(660, 0.14, 'triangle', 0.05, 0.1)
  },
}
