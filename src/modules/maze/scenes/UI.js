import Phaser from 'phaser'
import { VIEW, HUD_H, DPR, C, FONT_LABEL, FONT_DISPLAY } from '../config.js'

// Persistent HUD, launched in parallel with Game so it survives level restarts.
// Reads the shared registry the Game scene writes to.
export default class UI extends Phaser.Scene {
  constructor() {
    super('UI')
  }

  create() {
    this.cameras.main.setZoom(DPR)
    this.cameras.main.centerOn(VIEW.W / 2, VIEW.H / 2)
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)')

    // band
    this.add.rectangle(0, 0, VIEW.W, HUD_H, C.bg2, 0.92).setOrigin(0)
    this.add.rectangle(0, HUD_H, VIEW.W, 2, C.gold, 0.4).setOrigin(0)

    // score (centre)
    this.scoreText = this.add
      .text(VIEW.W / 2, 16, '0', {
        fontFamily: FONT_DISPLAY,
        fontSize: '26px',
        color: '#f3ead4',
      })
      .setOrigin(0.5, 0)
    this.add
      .text(VIEW.W / 2, 4, 'SCORE', {
        fontFamily: FONT_LABEL,
        fontSize: '9px',
        color: '#c9a24b',
      })
      .setOrigin(0.5, 0)

    // level (top-left) — short tag only; the full name shows in the start banner
    this.levelText = this.add
      .text(14, 7, '', {
        fontFamily: FONT_LABEL,
        fontSize: '10px',
        color: '#e0bd6b',
      })
      .setOrigin(0, 0)

    // best (right) — sits BELOW the HTML "Leave" button that overlays the corner
    this.bestText = this.add
      .text(VIEW.W - 12, 38, 'BEST 0', {
        fontFamily: FONT_LABEL,
        fontSize: '11px',
        color: '#9fb2b3',
        align: 'right',
      })
      .setOrigin(1, 0)

    // lives (lower-left) — a row of hat icons
    this.livesIcons = []
    for (let i = 0; i < 6; i++) {
      const icon = this.add.image(22 + i * 20, 38, 'life').setVisible(false)
      const ar = icon.width / icon.height
      icon.setDisplaySize(18 * ar, 18)
      this.livesIcons.push(icon)
    }

    // subscribe to registry changes
    const reg = this.registry
    this.refresh()
    reg.events.on('changedata-score', (p, v) => this.setScore(v))
    reg.events.on('changedata-lives', () => this.setLives())
    reg.events.on('changedata-levelName', () => this.refresh())
    reg.events.on('changedata-high', () => this.refresh())

    this.events.once('shutdown', () => {
      reg.events.off('changedata-score')
      reg.events.off('changedata-lives')
      reg.events.off('changedata-levelName')
      reg.events.off('changedata-high')
    })
  }

  refresh() {
    this.setScore(this.registry.get('score') || 0)
    this.setLives()
    const num = this.registry.get('levelNum') || 1
    this.levelText.setText(`LVL ${num}`)
    this.bestText.setText('BEST ' + (this.registry.get('high') || 0))
  }

  setScore(v) {
    this.scoreText.setText(String(v))
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.18, to: 1 },
      duration: 180,
      ease: 'Quad.easeOut',
    })
  }

  setLives() {
    const lives = this.registry.get('lives') || 0
    this.livesIcons.forEach((icon, i) => icon.setVisible(i < lives))
  }
}
