// ─────────────────────────────────────────────────────────────────────────────
// Procedural maze generator (pure JS — no Phaser, so it's unit-testable).
//
// A fresh maze every play = replayability. We guarantee a fully-connected,
// chase-friendly layout by construction:
//   1. Recursive-backtracker spanning tree  → every cell reachable.
//   2. Braiding (knock out dead-ends)        → loops, the Pac-Man feel.
//   3. A carved central "nave" + a side tunnel + an open bug pen.
//   4. A final flood-fill so runes are ONLY placed on reachable tiles — the
//      win condition can never become unsatisfiable.
// ─────────────────────────────────────────────────────────────────────────────

export const WALL = '#'
export const PATH = '.'

const NEI = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

// braid: 0 → keep all dead-ends (harder, mazier); 1 → remove them all (loopy, easier)
export function generateMaze({ cols, rows, braid = 0.6, rng = Math.random } = {}) {
  const g = Array.from({ length: rows }, () => Array(cols).fill(WALL))
  const inCells = (r, c) => r > 0 && r < rows - 1 && c > 0 && c < cols - 1
  const key = (r, c) => r * cols + c

  // 1 ── recursive backtracker over odd cells ───────────────────────────────
  const visited = new Set()
  const stack = [[1, 1]]
  g[1][1] = PATH
  visited.add(key(1, 1))
  const STEP = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ]
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const opts = []
    for (const [dr, dc] of STEP) {
      const nr = r + dr
      const nc = c + dc
      if (inCells(nr, nc) && !visited.has(key(nr, nc))) opts.push([nr, nc, dr, dc])
    }
    if (opts.length) {
      const [nr, nc, dr, dc] = opts[(rng() * opts.length) | 0]
      g[r + dr / 2][c + dc / 2] = PATH
      g[nr][nc] = PATH
      visited.add(key(nr, nc))
      stack.push([nr, nc])
    } else {
      stack.pop()
    }
  }

  // 2 ── braid: open dead-ends into loops ───────────────────────────────────
  for (let r = 1; r < rows - 1; r += 2) {
    for (let c = 1; c < cols - 1; c += 2) {
      const open = NEI.filter(([dr, dc]) => g[r + dr][c + dc] === PATH)
      if (open.length <= 1 && rng() < braid) {
        const walls = NEI.filter(
          ([dr, dc]) => g[r + dr][c + dc] === WALL && inCells(r + 2 * dr, c + 2 * dc),
        )
        if (walls.length) {
          const [dr, dc] = walls[(rng() * walls.length) | 0]
          g[r + dr][c + dc] = PATH
        }
      }
    }
  }

  const midR = Math.floor(rows / 2)
  const midC = Math.floor(cols / 2)

  // 3a ── central vertical "nave": guarantees top↔bottom + pen connectivity ──
  for (let r = 1; r < rows - 1; r++) g[r][midC] = PATH

  // 3b ── open bug pen (3 rows × 5 cols) around the centre ───────────────────
  for (let r = midR - 1; r <= midR + 1; r++) {
    for (let c = midC - 2; c <= midC + 2; c++) {
      if (inCells(r, c)) g[r][c] = PATH
    }
  }

  // 3c ── side tunnel on the middle row (wraps left↔right) ────────────────────
  const tunnelRow = midR
  for (let c = 0; c < cols; c++) g[tunnelRow][c] = PATH
  g[tunnelRow][0] = PATH
  g[tunnelRow][cols - 1] = PATH

  // ── spawns ────────────────────────────────────────────────────────────────
  const player = { r: rows - 2, c: midC }
  g[player.r][player.c] = PATH

  // four bug pen tiles (kept dot-free)
  const bugSpawns = [
    { r: midR, c: midC },
    { r: midR, c: midC - 1 },
    { r: midR, c: midC + 1 },
    { r: midR - 1, c: midC },
  ]

  // 4 ── flood fill from the player; runes only on reachable tiles ───────────
  const reachable = new Set()
  const q = [[player.r, player.c]]
  reachable.add(key(player.r, player.c))
  while (q.length) {
    const [r, c] = q.shift()
    for (const [dr, dc] of NEI) {
      let nr = r + dr
      let nc = c + dc
      // honour the wrap tunnel during reachability
      if (c === 0 && dc === -1) nc = cols - 1
      if (c === cols - 1 && dc === 1) nc = 0
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (g[nr][nc] !== PATH) continue
      if (reachable.has(key(nr, nc))) continue
      reachable.add(key(nr, nc))
      q.push([nr, nc])
    }
  }

  // potions: the reachable path tile nearest each corner
  const corners = [
    [1, 1],
    [1, cols - 2],
    [rows - 2, 1],
    [rows - 2, cols - 2],
  ]
  const potions = corners.map(([cr, cc]) => nearestReachable(cr, cc, reachable, cols, rows))

  // reserved (no rune) tiles
  const reserved = new Set()
  reserved.add(key(player.r, player.c))
  bugSpawns.forEach((b) => reserved.add(key(b.r, b.c)))
  potions.forEach((p) => p && reserved.add(key(p.r, p.c)))
  for (let c = 0; c < cols; c++) reserved.add(key(tunnelRow, c)) // tunnel kept clear

  const dots = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (g[r][c] !== PATH) continue
      if (!reachable.has(key(r, c))) continue
      if (reserved.has(key(r, c))) continue
      dots.push({ r, c })
    }
  }

  return {
    grid: g,
    cols,
    rows,
    tunnelRow,
    player,
    pen: { r: midR, c: midC },
    bugSpawns,
    potions: potions.filter(Boolean),
    dots,
  }
}

function nearestReachable(cr, cc, reachable, cols, rows) {
  let best = null
  let bestD = Infinity
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!reachable.has(r * cols + c)) continue
      const d = (r - cr) ** 2 + (c - cc) ** 2
      if (d < bestD) {
        bestD = d
        best = { r, c }
      }
    }
  }
  return best
}

export function isWall(grid, r, c) {
  if (r < 0 || r >= grid.length) return true
  if (c < 0 || c >= grid[0].length) return true
  return grid[r][c] === WALL
}
