import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Full-page screenshot that scrolls through the page first so IntersectionObserver
// scroll-reveal animations fire before capture. Same calling convention as screenshot.mjs.
// Optional 4th arg = viewport width (default 1440). Pass "mobile" to use 390px.
const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const widthArg = process.argv[4] || '1440';
const width = widthArg === 'mobile' ? 390 : parseInt(widthArg, 10);

const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-'));
let num = 1;
for (const f of existing) { const m = f.match(/^screenshot-(\d+)/); if (m) num = Math.max(num, parseInt(m[1]) + 1); }
const filename = label ? `screenshot-${num}-${label}.png` : `screenshot-${num}.png`;
const filepath = path.join(dir, filename);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width, height: 900, isMobile: width <= 430, deviceScaleFactor: width <= 430 ? 2 : 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// scroll down in steps to trigger reveals, then back to top
await page.evaluate(async () => {
  await new Promise(resolve => {
    let y = 0;
    const step = window.innerHeight * 0.8;
    const timer = setInterval(() => {
      window.scrollTo(0, y);
      y += step;
      if (y > document.body.scrollHeight) { clearInterval(timer); resolve(); }
    }, 120);
  });
});
await new Promise(r => setTimeout(r, 600));
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 800));

await page.screenshot({ path: filepath, fullPage: true });
await browser.close();
console.log(`Screenshot saved: ${filepath}`);
