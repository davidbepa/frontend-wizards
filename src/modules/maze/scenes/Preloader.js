import Phaser from 'phaser'
import { VIEW, C, FONT_LABEL } from '../config.js'
import { START_LIVES } from '../levels.js'
import { buildProceduralTextures, OVERRIDES } from '../textures.js'

// Loads any user-supplied override art listed in the manifest, then fills in the
// rest procedurally. With no assets present the loader has nothing to fetch, so
// the console stays clean — the game is fully playable on procedural art alone.
export default class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader')
  }

  preload() {
    const w = VIEW.W
    const h = VIEW.H
    this.add.rectangle(0, 0, w, h, C.bg2).setOrigin(0)
    this.add
      .text(w / 2, h / 2 - 18, 'Summoning the dungeon…', {
        fontFamily: FONT_LABEL,
        fontSize: '18px',
        color: '#e0bd6b',
      })
      .setOrigin(0.5)

    const barBg = this.add.rectangle(w / 2, h / 2 + 16, 240, 6, C.surface).setOrigin(0.5)
    const bar = this.add.rectangle(w / 2 - 120, h / 2 + 16, 2, 6, C.gold).setOrigin(0, 0.5)
    this.load.on('progress', (p) => {
      bar.width = 2 + 236 * p
    })
    // Missing override files must never break the boot — swallow load errors.
    this.load.on('loaderror', () => {})

    const manifest = this.registry.get('manifest') || []
    for (const name of manifest) {
      const o = OVERRIDES[name]
      if (!o) continue
      const path = `assets/maze/${name}.png`
      if (o.type === 'spritesheet') {
        this.load.spritesheet(name, path, { frameWidth: 64, frameHeight: 64 })
      } else {
        this.load.image(name, path)
      }
    }
    // keep the loader from finishing in the same tick (so the bar is visible)
    if (manifest.length === 0) barBg.setVisible(false), bar.setVisible(false)
  }

  create() {
    buildProceduralTextures(this)

    // The procedural hero is a 2-frame chomp sheet (frame '1' exists); a custom
    // hero override is a single image. Only animate the sheet.
    const animated = this.textures.get('hero').has('1')
    this.registry.set('heroAnimated', animated)
    if (animated) {
      this.anims.create({
        key: 'chomp',
        frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 1 }),
        frameRate: 10,
        repeat: -1,
      })
    }

    const go = () =>
      this.scene.start('Game', { level: 0, score: 0, lives: START_LIVES, fresh: true })

    // wait for the page web-fonts so canvas text uses Cinzel/Playfair
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(go).catch(go)
    } else {
      go()
    }
  }
}
