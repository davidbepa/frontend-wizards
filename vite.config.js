import { defineConfig } from 'vite'

// Single-page static site. Base is relative so the build can be opened
// from any sub-path or static host (GitHub Pages, Netlify, plain file serve).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
