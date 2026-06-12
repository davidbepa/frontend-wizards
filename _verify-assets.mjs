import puppeteer from 'puppeteer-core'
const URL = process.argv[2] || 'http://localhost:5173/'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []
const cerr = []

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 600, height: 820, deviceScaleFactor: 1 })
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && cerr.push(m.text()))
page.on('requestfailed', (r) => !r.url().includes('favicon') && cerr.push('REQFAIL ' + r.url()))

await page.goto(URL, { waitUntil: 'networkidle2' })
await page.waitForSelector('[data-play]')

const center = async () => {
  await page.evaluate(() => {
    const el = document.querySelector('.arcade-cabinet')
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70)
  })
  await sleep(400)
}

await center()
await page.click('[data-play]')
await page.waitForSelector('.arcade-screen canvas')
await sleep(2800)
// move around to pull the hero off spawn and trigger pickups
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowRight']) {
  await page.keyboard.down(k); await sleep(450); await page.keyboard.up(k)
}
await sleep(400)
await center()
await page.screenshot({ path: '/tmp/gen/ingame.png' })

// confirm the override textures are the ones actually in use
const reqs = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('/assets/maze/')))
console.log('maze asset requests:')
reqs.forEach((r) => console.log('  ' + r.split('/').slice(-1)[0]))

await browser.close()
console.log('pageerrors:', errors.length, errors.slice(0, 8))
console.log('console/req errors:', cerr.length, cerr.slice(0, 8))
console.log(errors.length === 0 && cerr.length === 0 ? 'CLEAN ✓' : 'ISSUES ✗')
