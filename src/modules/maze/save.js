// Tiny localStorage wrapper for high score + furthest level reached.
import { SAVE_KEY } from './config.js'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}
  } catch {
    return {}
  }
}
const write = (d) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(d))
  } catch {
    /* storage may be unavailable (private mode) — fail silently */
  }
}

export const Save = {
  data: read(),
  get high() {
    return this.data.high ?? 0
  },
  get maxLevel() {
    return this.data.maxLevel ?? 0
  },
  setHigh(score) {
    if (score > this.high) {
      this.data.high = score
      write(this.data)
      return true
    }
    return false
  },
  reachLevel(idx) {
    this.data.maxLevel = Math.max(this.maxLevel, idx)
    write(this.data)
  },
}
