import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || 'section';
const scrollY = parseInt(process.argv[4] || '0', 10);

const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-'));
let num = 1;
for (const f of existing) {
  const match = f.match(/^screenshot-(\d+)/);
  if (match) num = Math.max(num, parseInt(match[1]) + 1);
}
const filename = `screenshot-${num}-${label}.png`;
const filepath = path.join(dir, filename);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(y => window.scrollTo(0, y), scrollY);
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: filepath, fullPage: false });
await browser.close();
console.log(`Screenshot saved: ${filepath}`);
