import Phaser from 'phaser'
import { VIEW, DPR } from './config.js'
import Preloader from './scenes/Preloader.js'
import Game from './scenes/Game.js'
import UI from './scenes/UI.js'
import Results from './scenes/Results.js'

// Factory: the single dynamic-import target for arcade.js. Builds a Phaser game
// into `parent` and returns it. Everything is authored in logical VIEW units;
// the canvas renders at VIEW × DPR physical pixels and each scene zooms the
// camera back by DPR, so it's crisp on Retina and scaled to fit the cabinet.
export async function createMazeGame(parent, opts = {}) {
  let manifest = []
  try {
    const base = (import.meta.env && import.meta.env.BASE_URL) || '/'
    const res = await fetch(base + 'assets/maze/manifest.json', { cache: 'no-cache' })
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json)) manifest = json
      else if (Array.isArray(json.assets)) manifest = json.assets
    }
  } catch {
    /* no manifest → fully procedural art */
  }

  const config = {
    type: Phaser.AUTO,
    parent,
    width: VIEW.W * DPR,
    height: VIEW.H * DPR,
    backgroundColor: '#0f1c22',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true },
    banner: false,
    scene: [Preloader, Game, UI, Results],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('reduced', !!opts.reduced)
        game.registry.set('onExit', opts.onExit || (() => {}))
        game.registry.set('manifest', manifest)
      },
    },
  }

  return new Phaser.Game(config)
}
