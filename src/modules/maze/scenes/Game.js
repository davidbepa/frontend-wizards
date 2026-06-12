import Phaser from 'phaser'
import {
  TILE,
  COLS,
  ROWS,
  HUD_H,
  VIEW,
  DPR,
  C,
  FONT_LABEL,
  FONT_DISPLAY,
  tileToX,
  tileToY,
  xToCol,
  yToRow,
} from '../config.js'
import { generateMaze, isWall } from '../generate.js'
import { LEVELS, PERSONALITIES, POINTS, START_LIVES } from '../levels.js'
import { Save } from '../save.js'
import { Sfx, resumeAudio } from '../audio.js'

const V = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
  none: [0, 0],
}
const OPP = { left: 'right', right: 'left', up: 'down', down: 'up', none: 'none' }
const DIRS = ['up', 'down', 'left', 'right']

export default class Game extends Phaser.Scene {
  constructor() {
    super('Game')
  }

  init(data) {
    this.levelIndex = data.level ?? 0
    this.score = data.score ?? 0
    this.lives = data.lives ?? START_LIVES
    this.cfg = LEVELS[this.levelIndex]
    this.reduced = this.registry.get('reduced') || false
    this.nextExtraLife = POINTS.extraLifeEvery * (Math.floor(this.score / POINTS.extraLifeEvery) + 1)
  }

  create() {
    // crisp on HiDPI: render at physical px, zoom the camera back to logical
    this.cameras.main.setZoom(DPR)
    this.cameras.main.centerOn(VIEW.W / 2, VIEW.H / 2)
    this.cameras.main.setBackgroundColor(C.bg2)
    this.cameras.main.fadeIn(350, 15, 28, 34)

    // ── build the maze ───────────────────────────────────────────────────────
    const maze = generateMaze({ cols: COLS, rows: ROWS, braid: this.cfg.braid })
    this.grid = maze.grid
    this.tunnelRow = maze.tunnelRow
    this.pen = maze.pen

    this.drawMaze()

    // ── pickups ──────────────────────────────────────────────────────────────
    this.dotsRemaining = 0
    this.totalDots = maze.dots.length
    this.runes = this.add.group()
    maze.dots.forEach((d) => {
      const r = this.add.image(tileToX(d.c), tileToY(d.r), 'rune').setDepth(2)
      this.fit(r, TILE * 0.5)
      r.tileKey = d.r * COLS + d.c
      this.runes.add(r)
      this.dotsRemaining++
    })
    if (!this.reduced) {
      this.tweens.add({
        targets: this.runes.getChildren(),
        alpha: { from: 0.55, to: 1 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: (target, key, value, index) => index * 8,
      })
    }

    this.potions = this.add.group()
    maze.potions.forEach((p) => {
      const s = this.add.image(tileToX(p.c), tileToY(p.r), 'potion').setDepth(2)
      this.fit(s, TILE * 1.05)
      this.potions.add(s)
      if (!this.reduced) {
        this.tweens.add({
          targets: s,
          scaleX: s.scaleX * 1.12,
          scaleY: s.scaleY * 1.12,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    })

    this.bonus = null
    this.bonusSpawned = false

    // ── particle bursts (reused) ─────────────────────────────────────────────
    this.burst = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 60, max: 180 },
        lifespan: 480,
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(8)

    // ── entities ─────────────────────────────────────────────────────────────
    this.createPlayer(maze.player)
    this.createBugs(maze.bugSpawns)

    // ── mode / frightened state ──────────────────────────────────────────────
    this.mode = 'scatter'
    this.modeTimer = this.cfg.scatterMs
    this.frightened = false
    this.frightenedTimer = 0
    this.combo = 0
    this.dying = false
    this.won = false

    // ── input ────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
    })
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE')
    this.input.keyboard.once('keydown', resumeAudio)
    this.setupSwipe()

    // ── HUD scene ────────────────────────────────────────────────────────────
    this.publish()
    this.scene.launch('UI')
    this.scene.bringToTop('UI')
    this.flashLevelBanner()

    Save.reachLevel(this.levelIndex)
  }

  // ───────────────────────────────────────────────────────────── maze visuals
  drawMaze() {
    // floor wash + subtle vignette
    this.add.rectangle(0, HUD_H, VIEW.W, VIEW.H - HUD_H, C.bg2).setOrigin(0).setDepth(-2)
    const g = this.add.graphics().setDepth(-1)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] !== '#') continue
        const x = c * TILE
        const y = HUD_H + r * TILE
        g.fillStyle(C.wall, 1)
        g.fillRoundedRect(x + 2, y + 2, TILE - 4, TILE - 4, 7)
        g.lineStyle(1.5, C.wallEdge, 0.9)
        g.strokeRoundedRect(x + 2, y + 2, TILE - 4, TILE - 4, 7)
      }
    }
    // a soft inner glow line around the whole board
    const board = this.add.graphics().setDepth(-1)
    board.lineStyle(2, C.gold, 0.18)
    board.strokeRect(2, HUD_H + 2, VIEW.W - 4, VIEW.H - HUD_H - 4)

    // pen marker (a faint gold gate line on top of the pen)
    const px = tileToX(this.pen.c)
    const py = tileToY(this.pen.r) - TILE * 1.5
    const gate = this.add.graphics().setDepth(0)
    gate.lineStyle(3, C.goldBright, 0.5)
    gate.lineBetween(px - TILE * 0.9, py, px + TILE * 0.9, py)
  }

  // ───────────────────────────────────────────────────────────────── entities
  // size an image to a target height, preserving its aspect ratio
  fit(img, targetH) {
    const ar = img.width / img.height
    img.setDisplaySize(targetH * ar, targetH)
    return img
  }

  sizeHero(spr) {
    if (this.heroAnimated) {
      spr.setDisplaySize(TILE * 1.18, TILE * 1.18)
    } else {
      // custom single-image hero (e.g. a tall hatted wizard) — keep aspect ratio
      const h = TILE * 1.5
      const ar = spr.width / spr.height
      spr.setDisplaySize(h * ar, h)
    }
  }

  createPlayer(spawn) {
    this.heroAnimated = this.registry.get('heroAnimated')
    const spr = this.add.sprite(tileToX(spawn.c), tileToY(spawn.r), 'hero', 0).setDepth(7)
    this.sizeHero(spr)
    if (this.heroAnimated) spr.play('chomp')
    this.player = {
      sprite: spr,
      x: spr.x,
      y: spr.y,
      spawn: { ...spawn },
      dir: 'left',
      desired: 'none',
      speed: this.cfg.playerSpeed,
    }
    this.setFacing(this.player)
  }

  createBugs(spawns) {
    const corners = [
      { c: 1, r: 1 },
      { c: COLS - 2, r: 1 },
      { c: 1, r: ROWS - 2 },
      { c: COLS - 2, r: ROWS - 2 },
    ]
    this.bugs = []
    for (let i = 0; i < this.cfg.bugCount; i++) {
      const spawn = spawns[i % spawns.length]
      const custom = this.textures.exists('bug' + i)
      const texKey = custom ? 'bug' + i : 'bugBase'
      const body = this.add.image(0, 0, texKey)
      if (custom) this.fit(body, TILE * 1.3)
      else body.setDisplaySize(TILE * 1.05, TILE * 1.05)
      body.setTint(custom ? 0xffffff : C.bug[i])
      const parts = [body]
      let eyes = null
      if (!custom) {
        eyes = this.add.graphics()
        parts.push(eyes)
      }
      const container = this.add.container(tileToX(spawn.c), tileToY(spawn.r), parts).setDepth(6)
      const bug = {
        i,
        container,
        body,
        eyes,
        custom,
        color: C.bug[i],
        x: container.x,
        y: container.y,
        spawn: { ...spawn },
        dir: 'up',
        desired: 'none',
        speed: this.cfg.bugSpeed,
        personality: PERSONALITIES[i % PERSONALITIES.length],
        home: corners[i % corners.length],
        eaten: false,
        frightImmune: false,
        released: i === 0,
      }
      this.bugs.push(bug)
      this.updateEyes(bug)
      // stagger their release from the pen
      if (i !== 0) {
        this.time.delayedCall(900 * i, () => {
          bug.released = true
        })
      }
      // cosmetic bob
      if (!this.reduced) {
        this.tweens.add({
          targets: body,
          y: -2,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: i * 120,
        })
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────── update
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000
    if (this.dying || this.won) return

    this.readInput()
    this.step(this.player, dt, true)
    this.setFacing(this.player)

    // mode timer (scatter ↔ chase), suspended while frightened
    if (!this.frightened) {
      this.modeTimer -= delta
      if (this.modeTimer <= 0) {
        this.mode = this.mode === 'scatter' ? 'chase' : 'scatter'
        this.modeTimer = this.mode === 'scatter' ? this.cfg.scatterMs : this.cfg.chaseMs
        this.reverseBugs()
      }
    } else {
      this.frightenedTimer -= delta
      this.updateFrightenedLook()
      if (this.frightenedTimer <= 0) this.endFrightened()
    }

    for (const bug of this.bugs) {
      if (!bug.released) continue
      bug.speed = bug.eaten
        ? this.cfg.bugSpeed * 1.9
        : this.isEdible(bug)
          ? this.cfg.bugSpeed * 0.55
          : this.cfg.bugSpeed
      this.step(bug, dt, false)
      this.syncContainer(bug)
    }

    this.checkCollisions()
  }

  readInput() {
    const c = this.cursors
    const w = this.wasd
    let d = null
    if (c.left.isDown || w.left.isDown) d = 'left'
    else if (c.right.isDown || w.right.isDown) d = 'right'
    else if (c.up.isDown || w.up.isDown) d = 'up'
    else if (c.down.isDown || w.down.isDown) d = 'down'
    if (d) this.player.desired = d
  }

  // grid-locked movement with turn-at-centre + tunnel wrap
  step(ent, dt, isPlayer) {
    const sp = ent.speed * dt
    const col = xToCol(ent.x)
    const row = yToRow(ent.y)
    const ccx = tileToX(col)
    const ccy = tileToY(row)
    const atCenter = Math.abs(ent.x - ccx) <= sp && Math.abs(ent.y - ccy) <= sp

    if (atCenter) {
      ent.x = ccx
      ent.y = ccy
      if (!isPlayer) this.chooseBugDir(ent, col, row)
      if (ent.desired !== 'none' && !this.wallAt(col, row, ent.desired)) {
        ent.dir = ent.desired
      }
      if (ent.dir !== 'none' && this.wallAt(col, row, ent.dir)) {
        ent.dir = 'none'
      }
      // bug reached pen while eaten → revive
      if (!isPlayer && ent.eaten && col === this.pen.c && Math.abs(row - this.pen.r) <= 1) {
        ent.eaten = false
        ent.frightImmune = true
        ent.body.clearTint()
        if (!ent.custom) ent.body.setTint(ent.color)
        else ent.body.setTint(0xffffff)
      }
    }

    const v = V[ent.dir]
    ent.x += v[0] * sp
    ent.y += v[1] * sp

    // tunnel wrap on the tunnel row
    if (row === this.tunnelRow) {
      if (ent.x < -TILE * 0.5) ent.x = (COLS - 0.5) * TILE
      else if (ent.x > (COLS - 0.5) * TILE) ent.x = -TILE * 0.5
    }

    if (isPlayer) {
      ent.sprite.x = ent.x
      ent.sprite.y = ent.y
      // pause the chomp animation when stopped (procedural hero only)
      if (this.heroAnimated) {
        if (ent.dir === 'none') ent.sprite.anims.pause()
        else if (ent.sprite.anims.isPaused) ent.sprite.anims.resume()
      }
    }
  }

  wallAt(col, row, dir) {
    let nc = col + V[dir][0]
    let nr = row + V[dir][1]
    if (nr === this.tunnelRow) {
      if (nc < 0) nc = COLS - 1
      else if (nc >= COLS) nc = 0
    }
    return isWall(this.grid, nr, nc)
  }

  chooseBugDir(bug, col, row) {
    let cands = DIRS.filter((d) => !this.wallAt(col, row, d) && d !== OPP[bug.dir])
    if (cands.length === 0) cands = DIRS.filter((d) => !this.wallAt(col, row, d))
    if (cands.length === 0) {
      bug.desired = 'none'
      return
    }
    if (this.isEdible(bug)) {
      bug.desired = cands[(Math.random() * cands.length) | 0]
      return
    }
    const target = this.bugTarget(bug, col, row)
    let best = cands[0]
    let bestD = Infinity
    for (const d of cands) {
      const nc = col + V[d][0]
      const nr = row + V[d][1]
      const dd = (nc - target.c) ** 2 + (nr - target.r) ** 2
      if (dd < bestD) {
        bestD = dd
        best = d
      }
    }
    bug.desired = best
  }

  bugTarget(bug, col, row) {
    if (bug.eaten) return this.pen
    const p = this.player
    const pc = xToCol(p.x)
    const pr = yToRow(p.y)
    const ahead = (n) => ({ c: pc + V[p.dir][0] * n, r: pr + V[p.dir][1] * n })
    if (this.mode === 'scatter') return bug.home
    switch (bug.personality) {
      case 'chaser':
        return { c: pc, r: pr }
      case 'ambusher':
        return ahead(4)
      case 'flanker': {
        const near = (col - pc) ** 2 + (row - pr) ** 2 < 25
        return near ? bug.home : ahead(2)
      }
      case 'wanderer': {
        const far = (col - pc) ** 2 + (row - pr) ** 2 > 36
        return far ? { c: pc, r: pr } : bug.home
      }
      default:
        return { c: pc, r: pr }
    }
  }

  reverseBugs() {
    for (const bug of this.bugs) {
      if (bug.eaten) continue
      if (!this.wallAt(xToCol(bug.x), yToRow(bug.y), OPP[bug.dir])) bug.dir = OPP[bug.dir]
    }
  }

  isEdible(bug) {
    return this.frightened && !bug.eaten && !bug.frightImmune
  }

  // ───────────────────────────────────────────────────────────────── frighten
  startFrightened() {
    this.frightened = true
    this.frightenedTimer = this.cfg.frightenedMs
    this.combo = 0
    for (const bug of this.bugs) {
      bug.frightImmune = false
      if (!bug.eaten) {
        if (!this.wallAt(xToCol(bug.x), yToRow(bug.y), OPP[bug.dir])) bug.dir = OPP[bug.dir]
        bug.body.setTint(C.frightened)
      }
    }
  }

  updateFrightenedLook() {
    const blink = this.frightenedTimer < 1600 && Math.floor(this.frightenedTimer / 200) % 2 === 0
    for (const bug of this.bugs) {
      if (this.isEdible(bug)) bug.body.setTint(blink ? C.frightenedEnd : C.frightened)
    }
  }

  endFrightened() {
    this.frightened = false
    for (const bug of this.bugs) {
      if (!bug.eaten) bug.body.setTint(bug.custom ? 0xffffff : bug.color)
    }
  }

  // ───────────────────────────────────────────────────────────────── eyes/face
  setFacing(p) {
    const s = p.sprite
    if (!this.heroAnimated) {
      // single-image hero (e.g. a hatted wizard): only mirror L/R, never rotate
      if (p.dir === 'left') s.setFlipX(true)
      else if (p.dir === 'right') s.setFlipX(false)
      return
    }
    s.setFlipX(false)
    if (p.dir === 'right') s.setAngle(0)
    else if (p.dir === 'left') {
      s.setAngle(0)
      s.setFlipX(true)
    } else if (p.dir === 'up') s.setAngle(-90)
    else if (p.dir === 'down') s.setAngle(90)
  }

  syncContainer(bug) {
    bug.container.x = bug.x
    bug.container.y = bug.y
    this.updateEyes(bug)
  }

  updateEyes(bug) {
    if (!bug.eyes) return
    if (bug.dir === bug._eyeDir && bug.eaten === bug._eyeEaten) return
    bug._eyeDir = bug.dir
    bug._eyeEaten = bug.eaten
    const g = bug.eyes
    g.clear()
    const off = V[bug.dir === 'none' ? 'left' : bug.dir]
    const ex = 4.5
    const ey = -3
    for (const sx of [-1, 1]) {
      const cx = sx * ex
      g.fillStyle(0xffffff, 1)
      g.fillCircle(cx, ey, 3.6)
      g.fillStyle(0x16262e, 1)
      g.fillCircle(cx + off[0] * 1.6, ey + off[1] * 1.6, 1.9)
    }
  }

  // ──────────────────────────────────────────────────────────── collisions
  checkCollisions() {
    const p = this.player
    const pc = xToCol(p.x)
    const pr = yToRow(p.y)
    const pk = pr * COLS + pc

    // runes
    this.runes.getChildren().forEach((r) => {
      if (r.active && r.tileKey === pk) this.eatRune(r)
    })
    // potions
    this.potions.getChildren().forEach((s) => {
      if (s.active && xToCol(s.x) === pc && yToRow(s.y) === pr) this.eatPotion(s)
    })
    // bonus
    if (this.bonus && this.bonus.active && xToCol(this.bonus.x) === pc && yToRow(this.bonus.y) === pr) {
      this.eatBonus()
    }

    // bugs
    for (const bug of this.bugs) {
      if (!bug.released) continue
      const dx = bug.x - p.x
      const dy = bug.y - p.y
      if (dx * dx + dy * dy > (TILE * 0.55) ** 2) continue
      if (bug.eaten) continue
      if (this.isEdible(bug)) this.banishBug(bug)
      else this.loseLife()
    }
  }

  eatRune(r) {
    r.destroy()
    this.dotsRemaining--
    this.addScore(POINTS.rune)
    Sfx.chomp()
    if (!this.reduced) this.burst.explode(3, r.x, r.y)
    this.maybeSpawnBonus()
    if (this.dotsRemaining <= 0) this.winLevel()
  }

  eatPotion(s) {
    s.destroy()
    this.addScore(POINTS.potion)
    Sfx.potion()
    if (!this.reduced) {
      this.burst.explode(18, s.x, s.y)
      this.cameras.main.flash(160, 122, 156, 141)
    }
    this.startFrightened()
  }

  maybeSpawnBonus() {
    if (this.bonusSpawned) return
    if (this.dotsRemaining > this.totalDots * 0.5) return
    this.bonusSpawned = true
    const x = tileToX(this.pen.c)
    const y = tileToY(this.pen.r + 2)
    this.bonus = this.add.image(x, y, 'bonus').setDepth(3)
    this.fit(this.bonus, TILE * 1.05)
    if (!this.reduced) {
      this.tweens.add({
        targets: this.bonus,
        scaleX: this.bonus.scaleX * 1.15,
        scaleY: this.bonus.scaleY * 1.15,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
    this.time.delayedCall(9000, () => {
      if (this.bonus && this.bonus.active) {
        this.bonus.destroy()
        this.bonus = null
      }
    })
  }

  eatBonus() {
    const x = this.bonus.x
    const y = this.bonus.y
    this.bonus.destroy()
    this.bonus = null
    this.addScore(this.cfg.bonus)
    Sfx.bonus()
    this.floatText(x, y, '+' + this.cfg.bonus, C.ember)
    if (!this.reduced) this.burst.explode(14, x, y)
  }

  banishBug(bug) {
    const pts = POINTS.bugChain[Math.min(this.combo, POINTS.bugChain.length - 1)]
    this.combo++
    this.addScore(pts)
    Sfx.eat()
    this.floatText(bug.x, bug.y, '+' + pts, C.goldBright)
    if (!this.reduced) {
      this.burst.explode(20, bug.x, bug.y)
      this.cameras.main.flash(90, 224, 189, 107)
    }
    bug.eaten = true
    bug.body.setTint(0x3c6471)
    this.updateEyes(bug)
  }

  loseLife() {
    this.dying = true
    this.lives--
    this.publish()
    Sfx.caught()
    if (!this.reduced) {
      this.cameras.main.shake(260, 0.012)
      this.cameras.main.flash(220, 207, 91, 107)
    }
    const s = this.player.sprite
    if (this.heroAnimated) s.anims.pause()
    this.tweens.add({
      targets: s,
      angle: s.angle + 540,
      scale: 0,
      duration: 900,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (this.lives <= 0) this.gameOver()
        else this.resetPositions()
      },
    })
  }

  resetPositions() {
    this.frightened = false
    this.combo = 0
    this.mode = 'scatter'
    this.modeTimer = this.cfg.scatterMs
    const p = this.player
    p.x = tileToX(p.spawn.c)
    p.y = tileToY(p.spawn.r)
    p.dir = 'left'
    p.desired = 'none'
    p.sprite.setScale(1).setAngle(0).setFlipX(false)
    this.sizeHero(p.sprite)
    p.sprite.x = p.x
    p.sprite.y = p.y
    if (this.heroAnimated) p.sprite.anims.resume()
    this.setFacing(p)
    for (const bug of this.bugs) {
      bug.x = tileToX(bug.spawn.c)
      bug.y = tileToY(bug.spawn.r)
      bug.dir = 'up'
      bug.desired = 'none'
      bug.eaten = false
      bug.frightImmune = false
      bug.body.setTint(bug.custom ? 0xffffff : bug.color)
      this.syncContainer(bug)
    }
    this.dying = false
    this.flashLevelBanner(true)
  }

  // ─────────────────────────────────────────────────────────────── end states
  winLevel() {
    this.won = true
    this.addScore(POINTS.levelClear)
    Sfx.win()
    this.cameras.main.fadeOut(600, 15, 28, 34)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const next = this.levelIndex + 1
      this.scene.stop('UI')
      if (next < LEVELS.length) {
        this.scene.start('Game', { level: next, score: this.score, lives: this.lives })
      } else {
        Save.setHigh(this.score)
        this.scene.start('Results', { won: true, score: this.score, level: this.levelIndex })
      }
    })
  }

  gameOver() {
    Sfx.lose()
    Save.setHigh(this.score)
    this.cameras.main.fadeOut(600, 15, 28, 34)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UI')
      this.scene.start('Results', { won: false, score: this.score, level: this.levelIndex })
    })
  }

  // ───────────────────────────────────────────────────────────────── helpers
  addScore(n) {
    this.score += n
    if (this.score >= this.nextExtraLife) {
      this.lives++
      this.nextExtraLife += POINTS.extraLifeEvery
      this.floatText(this.player.x, this.player.y - 16, '+1 LIFE', C.sage)
    }
    this.publish()
  }

  publish() {
    this.registry.set('score', this.score)
    this.registry.set('lives', this.lives)
    this.registry.set('high', Math.max(Save.high, this.score))
    this.registry.set('levelName', this.cfg.name)
    this.registry.set('levelNum', this.levelIndex + 1)
  }

  floatText(x, y, str, color) {
    const t = this.add
      .text(x, y, str, {
        fontFamily: FONT_DISPLAY,
        fontSize: '20px',
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
      })
      .setOrigin(0.5)
      .setDepth(9)
    this.tweens.add({
      targets: t,
      y: y - 26,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    })
  }

  flashLevelBanner(short) {
    const banner = this.add
      .text(VIEW.W / 2, VIEW.H / 2, short ? 'Ready…' : this.cfg.name, {
        fontFamily: FONT_DISPLAY,
        fontSize: short ? '26px' : '30px',
        color: '#f3ead4',
        stroke: '#0f1c22',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(11)
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.85, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: short ? 500 : 1100,
      onComplete: () => banner.destroy(),
    })
  }

  setupSwipe() {
    let sx = 0
    let sy = 0
    let active = false
    this.input.on('pointerdown', (pt) => {
      resumeAudio()
      sx = pt.x
      sy = pt.y
      active = true
    })
    const release = (pt) => {
      if (!active) return
      active = false
      const dx = pt.x - sx
      const dy = pt.y - sy
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return
      if (Math.abs(dx) > Math.abs(dy)) this.player.desired = dx > 0 ? 'right' : 'left'
      else this.player.desired = dy > 0 ? 'down' : 'up'
    }
    this.input.on('pointerup', release)
  }
}
