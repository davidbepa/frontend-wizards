// Turn an opaque generated sprite (often on a white/grey "transparency"
// checkerboard) into a clean transparent PNG:
//   1. flood-fill from the 4 corners, removing connected light-grey/white bg
//   2. erode the anti-aliased fringe
//   3. autocrop to content
//   4. downscale to a sane max size (box average) to bound texture memory
//
// usage: node _process-sprite.mjs <in.png> <out.png> [maxSize]
import { PNG } from 'pngjs'
import fs from 'fs'

const [, , inPath, outPath, maxSizeArg] = process.argv
const MAX = Number(maxSizeArg || 320)

const src = PNG.sync.read(fs.readFileSync(inPath))
const { width: W, height: H, data } = src
const idx = (x, y) => (y * W + x) * 4

// background test: light + low-saturation (covers white & grey checker tones)
const isBg = (i) => {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max > 175 && max - min < 30
}

// 1. flood fill from corners
const removed = new Uint8Array(W * H)
const stack = []
const pushIf = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const p = y * W + x
  if (removed[p]) return
  if (!isBg(idx(x, y))) return
  removed[p] = 1
  stack.push(x, y)
}
pushIf(0, 0)
pushIf(W - 1, 0)
pushIf(0, H - 1)
pushIf(W - 1, H - 1)
// also seed along all edges (sprite may touch a corner)
for (let x = 0; x < W; x++) {
  pushIf(x, 0)
  pushIf(x, H - 1)
}
for (let y = 0; y < H; y++) {
  pushIf(0, y)
  pushIf(W - 1, y)
}
while (stack.length) {
  const y = stack.pop()
  const x = stack.pop()
  pushIf(x + 1, y)
  pushIf(x - 1, y)
  pushIf(x, y + 1)
  pushIf(x, y - 1)
}

// 2. erode the AA fringe: grey-ish opaque pixels touching removed bg → remove
for (let pass = 0; pass < 2; pass++) {
  const toRemove = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      if (removed[p]) continue
      if (!isBg(idx(x, y))) continue
      const neighbourGone =
        (x > 0 && removed[p - 1]) ||
        (x < W - 1 && removed[p + 1]) ||
        (y > 0 && removed[p - W]) ||
        (y < H - 1 && removed[p + W])
      if (neighbourGone) toRemove.push(p)
    }
  }
  toRemove.forEach((p) => (removed[p] = 1))
}

// apply alpha
for (let p = 0; p < W * H; p++) {
  if (removed[p]) data[p * 4 + 3] = 0
}

// 3. autocrop bbox of opaque-ish pixels
let minX = W
let minY = H
let maxX = 0
let maxY = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (data[idx(x, y) + 3] > 16) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
const pad = 6
minX = Math.max(0, minX - pad)
minY = Math.max(0, minY - pad)
maxX = Math.min(W - 1, maxX + pad)
maxY = Math.min(H - 1, maxY + pad)
const cw = maxX - minX + 1
const ch = maxY - minY + 1

// 4. downscale (box average) to a square canvas of side = min(MAX, longest)
const side = Math.max(cw, ch)
const scale = side > MAX ? MAX / side : 1
const ow = Math.max(1, Math.round(cw * scale))
const oh = Math.max(1, Math.round(ch * scale))
const out = new PNG({ width: ow, height: oh })
for (let oy = 0; oy < oh; oy++) {
  for (let ox = 0; ox < ow; ox++) {
    const sx0 = minX + Math.floor((ox / ow) * cw)
    const sx1 = minX + Math.floor(((ox + 1) / ow) * cw)
    const sy0 = minY + Math.floor((oy / oh) * ch)
    const sy1 = minY + Math.floor(((oy + 1) / oh) * ch)
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    let n = 0
    for (let sy = sy0; sy <= sy1 && sy <= maxY; sy++) {
      for (let sx = sx0; sx <= sx1 && sx <= maxX; sx++) {
        const i = idx(sx, sy)
        const al = data[i + 3]
        r += data[i] * al
        g += data[i + 1] * al
        b += data[i + 2] * al
        a += al
        n++
      }
    }
    const oi = (oy * ow + ox) * 4
    if (a > 0) {
      out.data[oi] = Math.round(r / a)
      out.data[oi + 1] = Math.round(g / a)
      out.data[oi + 2] = Math.round(b / a)
    }
    out.data[oi + 3] = Math.round(a / Math.max(1, n))
  }
}
fs.writeFileSync(outPath, PNG.sync.write(out))
console.log(`${outPath}  ${ow}x${oh}  (from ${cw}x${ch})`)
