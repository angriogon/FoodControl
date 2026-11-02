// Regenera los PNG de iconos a partir de los SVG de icons-src/ con Playwright/Chromium.
// Uso: npm run icons
//   icons-src/icon.svg          → icono normal (esquinas redondeadas) y favicon
//   icons-src/icon-maskable.svg → icono a sangre (iOS y Android “maskable”)
import { readFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(root, 'icons-src', f), 'utf8');
const normal = src('icon.svg');
const fullBleed = src('icon-maskable.svg');

// [archivo, tamaño, svg, fondo opaco]
// iOS exige el apple-touch-icon sin transparencia: él mismo redondea las esquinas.
const outputs = [
  ['apple-touch-icon.png', 180, fullBleed, true],
  ['icon-192.png', 192, normal, false],
  ['icon-512.png', 512, normal, false],
  ['icon-maskable-512.png', 512, fullBleed, true],
  ['favicon-32.png', 32, normal, false]
];

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
for (const [name, size, svg, opaque] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  const sized = svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
  await page.screenshot({ path: join(root, 'public', name), omitBackground: !opaque });
  console.log('✔', name);
}
await browser.close();
copyFileSync(join(root, 'icons-src', 'icon.svg'), join(root, 'public', 'favicon.svg'));
console.log('✔ favicon.svg');
