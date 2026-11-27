// Screenshot a page with Playwright's Chromium. Usage: node scripts/screenshot.mjs <url> <WIDTHxHEIGHT> <output.png> [--full-page]
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium } from 'playwright'

const [url, size, out, ...flags] = process.argv.slice(2)
const match = /^([1-9]\d*)x([1-9]\d*)$/.exec(size ?? '')
if (!url || !match || !out) {
  console.error('usage: screenshot.mjs <url> <WIDTHxHEIGHT> <output.png> [--full-page]')
  process.exit(2)
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: +match[1], height: +match[2] } })
  await page.goto(url, { waitUntil: 'networkidle' })
  // Pages show a spinner while their data loads; wait for it so the shot is not of the loading state.
  await page
    .locator('.ant-spin')
    .first()
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => undefined)
  // Horizontal overflow is the usual phone problem and invisible in a screenshot of the visible area: report it.
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
  if (scrollWidth > innerWidth) console.warn(`warning: page is ${scrollWidth}px wide in a ${innerWidth}px viewport (horizontal overflow)`)
  mkdirSync(dirname(out), { recursive: true })
  await page.screenshot({ path: out, fullPage: flags.includes('--full-page') })
  console.log(`Wrote ${out}`)
} finally {
  await browser.close()
}
