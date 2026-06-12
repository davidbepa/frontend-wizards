import Phaser from 'phaser'
import { VIEW, DPR, C, FONT_LABEL, FONT_DISPLAY, FONT_BODY } from '../config.js'
import { START_LIVES } from '../levels.js'
import { Save } from '../save.js'

// Win + lose share one results screen. Buttons make the visible rectangle
// interactive (never the Container) to avoid Phaser's offset hit-area bug.
export default class Results extends Phaser.Scene {
  constructor() {
    super('Results')
  }

  init(data) {
    this.won = !!data.won
    this.finalScore = data.score ?? 0
    this.reduced = this.registry.get('reduced') || false
  }

  create() {
    this.cameras.main.setZoom(DPR)
    this.cameras.main.centerOn(VIEW.W / 2, VIEW.H / 2)
    this.cameras.main.setBackgroundColor(C.bg2)
    this.cameras.main.fadeIn(450, 15, 28, 34)

    const cx = VIEW.W / 2
    const newBest = this.finalScore > 0 && this.finalScore >= Save.high

    // ambient sparks for the win screen
    if (this.won && !this.reduced) {
      this.add
        .particles(0, 0, 'spark', {
          x: { min: 0, max: VIEW.W },
          y: -10,
          lifespan: 4000,
          speedY: { min: 30, max: 80 },
          scale: { start: 0.4, end: 0 },
          alpha: { start: 0.7, end: 0 },
          frequency: 180,
          blendMode: 'ADD',
        })
        .setDepth(0)
    }

    this.add
      .text(cx, VIEW.H * 0.26, this.won ? '✶' : '✕', {
        fontFamily: FONT_DISPLAY,
        fontSize: '52px',
        color: this.won ? '#e0bd6b' : '#cf5b6b',
      })
      .setOrigin(0.5)

    this.add
      .text(cx, VIEW.H * 0.36, this.won ? 'Dungeon Cleared' : 'Caught by a Bug', {
        fontFamily: FONT_DISPLAY,
        fontSize: '34px',
        color: '#f3ead4',
      })
      .setOrigin(0.5)

    this.add
      .text(
        cx,
        VIEW.H * 0.44,
        this.won
          ? 'Every bug banished. The grimoire is yours, Archmage.'
          : 'The bugs got the better of you this time.',
        {
          fontFamily: FONT_BODY,
          fontSize: '15px',
          color: '#9fb2b3',
          align: 'center',
          wordWrap: { width: VIEW.W * 0.78 },
        },
      )
      .setOrigin(0.5)

    this.add
      .text(cx, VIEW.H * 0.53, 'SCORE', {
        fontFamily: FONT_LABEL,
        fontSize: '11px',
        color: '#c9a24b',
      })
      .setOrigin(0.5)
    this.add
      .text(cx, VIEW.H * 0.585, String(this.finalScore), {
        fontFamily: FONT_DISPLAY,
        fontSize: '40px',
        color: '#e0bd6b',
      })
      .setOrigin(0.5)
    this.add
      .text(cx, VIEW.H * 0.645, newBest ? '★ New best!' : 'Best ' + Save.high, {
        fontFamily: FONT_LABEL,
        fontSize: '12px',
        color: newBest ? '#7a9c8d' : '#6f8186',
      })
      .setOrigin(0.5)

    this.button(cx, VIEW.H * 0.76, this.won ? 'Play Again' : 'Try Again', true, () => {
      this.cameras.main.fadeOut(300, 15, 28, 34)
      this.cameras.main.once('camerafadeoutcomplete', () =>
        this.scene.start('Game', { level: 0, score: 0, lives: START_LIVES, fresh: true }),
      )
    })
    this.button(cx, VIEW.H * 0.85, 'Leave the Dungeon', false, () => {
      const onExit = this.registry.get('onExit')
      if (onExit) onExit()
    })

    this.input.keyboard.once('keydown-ENTER', () =>
      this.scene.start('Game', { level: 0, score: 0, lives: START_LIVES, fresh: true }),
    )
  }

  button(x, y, label, primary, onClick) {
    const w = 220
    const h = 46
    const bg = this.add
      .rectangle(0, 0, w, h, primary ? C.sage : C.surface, primary ? 1 : 0.5)
      .setStrokeStyle(1.5, primary ? C.sageDeep : C.gold, primary ? 1 : 0.6)
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: FONT_LABEL,
        fontSize: '15px',
        color: primary ? '#102018' : '#f3ead4',
      })
      .setOrigin(0.5)
    const box = this.add.container(x, y, [bg, txt])
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () =>
      this.tweens.add({ targets: box, scale: 1.06, duration: 120, ease: 'Quad.easeOut' }),
    )
    bg.on('pointerout', () =>
      this.tweens.add({ targets: box, scale: 1, duration: 120, ease: 'Quad.easeOut' }),
    )
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: box, scale: 0.95, duration: 80, yoyo: true })
      onClick()
    })
    return box
  }
}
