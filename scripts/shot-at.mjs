import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Trigger reveals (scroll through), then capture a viewport screenshot at each given
// CSS selector (scrolled into view). Usage:
//   node scripts/shot-at.mjs <url> <label> <width> <selector1> [selector2] ...
const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2];
const label = process.argv[3] || 'sec';
const width = parseInt(process.argv[4] || '1440', 10);
const selectors = process.argv.slice(5);

const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
function nextNum() {
  const ex = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-'));
  let n = 1; for (const f of ex) { const m = f.match(/^screenshot-(\d+)/); if (m) n = Math.max(n, parseInt(m[1]) + 1); }
  return n;
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width, height: 900, isMobile: width <= 430, deviceScaleFactor: width <= 430 ? 2 : 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(async () => {
  await new Promise(resolve => {
    let y = 0; const step = window.innerHeight * 0.8;
    const t = setInterval(() => { window.scrollTo(0, y); y += step; if (y > document.body.scrollHeight) { clearInterval(t); resolve(); } }, 110);
  });
});
await new Promise(r => setTimeout(r, 500));

for (const sel of selectors) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) { const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - 40); }
  }, sel);
  await new Promise(r => setTimeout(r, 700));
  const num = nextNum();
  const safe = sel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 24);
  const fp = path.join(dir, `screenshot-${num}-${label}-${safe}.png`);
  await page.screenshot({ path: fp });
  console.log('Saved: ' + fp);
}
await browser.close();
