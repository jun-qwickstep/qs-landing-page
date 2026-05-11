import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || 'mobile';

const dir = path.join(__dirname, 'temporary screenshots');
const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-'));
let num = 1;
for (const f of existing) {
  const match = f.match(/^screenshot-(\d+)/);
  if (match) num = Math.max(num, parseInt(match[1]) + 1);
}
const filepath = path.join(dir, `screenshot-${num}-${label}.png`);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 1000));
await page.screenshot({ path: filepath, fullPage: true });
await browser.close();
console.log(`Screenshot saved: ${filepath}`);
