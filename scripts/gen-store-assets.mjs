// Generates every brand/store PNG from code (SVG -> PNG via @resvg/resvg-js).
//
//   pnpm assets:generate
//
// Outputs:
//   assets/images/*                          — app icon, adaptive icon (fg/bg/mono), splash, favicon
//   fastlane/metadata/android/en-US/images/* — 512 store icon, 1024x500 feature graphic
//
// NOTE: Play Store screenshots are NOT generated here — they are real device captures of the app
// (fastlane/.../{phone,sevenInch,tenInch}Screenshots). This script must never write into those
// folders or it would clobber the real screenshots. Re-run only after a branding change.
//
// The LinkVault mark is a minimal white bookmark on a blue field. Tweak PALETTE / the builders below
// to re-brand, then re-run. No design tool required.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const APP = join(ROOT, 'assets', 'images');
const STORE = join(ROOT, 'fastlane', 'metadata', 'android', 'en-US', 'images');

const PALETTE = {
  blue: '#2563eb',
  blueDark: '#1d4ed8',
  blueLite: '#e6f4fe',
  ink: '#18181b',
  muted: '#71717a',
  border: '#e7e7ea',
  surface: '#f5f6f8',
  white: '#ffffff',
  amber: '#d97706',
  violet: '#7c3aed',
  green: '#16a34a',
  pink: '#db2777',
};

const FONT = 'Segoe UI, Roboto, Arial, sans-serif';

// --- primitives ------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rect = (x, y, w, h, r, fill, opts = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"` +
  (opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw ?? 2}"` : '') +
  (opts.opacity != null ? ` opacity="${opts.opacity}"` : '') +
  ` />`;

const text = (x, y, size, fill, weight, content, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}"` +
  ` fill="${fill}" text-anchor="${anchor}">${esc(content)}</text>`;

/** Bookmark path centered at (cx,cy) with body w×h, corner r, and bottom notch depth. */
function bookmark(cx, cy, w, h, r, notch, fill) {
  const lx = cx - w / 2;
  const rx = cx + w / 2;
  const ty = cy - h / 2;
  const by = cy + h / 2;
  const d = [
    `M ${lx + r} ${ty}`,
    `H ${rx - r}`,
    `Q ${rx} ${ty} ${rx} ${ty + r}`,
    `V ${by}`,
    `L ${cx} ${by - notch}`,
    `L ${lx} ${by}`,
    `V ${ty + r}`,
    `Q ${lx} ${ty} ${lx + r} ${ty}`,
    'Z',
  ].join(' ');
  return `<path d="${d}" fill="${fill}" />`;
}

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`;

const blueGradient = (id) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${PALETTE.blue}"/><stop offset="1" stop-color="${PALETTE.blueDark}"/>` +
  `</linearGradient></defs>`;

// --- icon variants ---------------------------------------------------------

// Full-bleed square (no transparency): valid for iOS (Apple forbids alpha) and preferred by Play,
// which applies its own corner mask. The launcher/store rounds the corners for us.
const iconFull = () =>
  svg(
    1024,
    1024,
    rect(0, 0, 1024, 1024, 0, 'url(#g)') + bookmark(512, 520, 380, 470, 44, 150, PALETTE.white),
    blueGradient('g'),
  );

// Adaptive foreground: white mark on transparent, sized within the safe zone (Android masks it).
const iconForeground = () =>
  svg(1024, 1024, bookmark(512, 512, 300, 380, 40, 120, PALETTE.white));

// Adaptive background: solid brand blue so the launcher icon matches the store icon.
const iconBackground = () => svg(1024, 1024, rect(0, 0, 1024, 1024, 0, PALETTE.blue));

const iconMonochrome = () =>
  svg(1024, 1024, bookmark(512, 512, 300, 380, 40, 120, '#000000'));

// White mark on transparent for the splash (shown on the blue splash background).
const splashMark = () => svg(512, 512, bookmark(256, 262, 210, 260, 26, 82, PALETTE.white));

// --- feature graphic (1024x500) -------------------------------------------

function featureGraphic() {
  const cards = [0, 1, 2]
    .map((i) => rect(690, 120 + i * 96, 260, 74, 16, PALETTE.white, { opacity: 0.14 - i * 0.03 }))
    .join('');
  const body =
    rect(0, 0, 1024, 500, 0, 'url(#g)') +
    cards +
    rect(96, 190, 120, 120, 30, PALETTE.white, { opacity: 0.12 }) +
    bookmark(156, 250, 66, 82, 10, 26, PALETTE.white) +
    text(250, 232, 76, PALETTE.white, 800, 'LinkVault') +
    text(252, 292, 30, 'rgba(255,255,255,0.9)', 500, 'Save everything. Find anything.');
  return svg(1024, 500, body, blueGradient('g'));
}

// --- render + write --------------------------------------------------------

function write(outPath, svgStr, width) {
  mkdirSync(dirname(outPath), { recursive: true });
  const resvg = new Resvg(svgStr, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log('✓', outPath.replace(ROOT + '\\', '').replace(ROOT + '/', ''), width ? `(${width}px)` : '');
}

const iconFullSvg = iconFull();

// App assets
write(join(APP, 'icon.png'), iconFullSvg, 1024);
write(join(APP, 'favicon.png'), iconFullSvg, 48);
write(join(APP, 'android-icon-foreground.png'), iconForeground(), 1024);
write(join(APP, 'android-icon-background.png'), iconBackground(), 1024);
write(join(APP, 'android-icon-monochrome.png'), iconMonochrome(), 1024);
write(join(APP, 'splash-icon.png'), splashMark(), 512);

// Store assets (icon + feature graphic only — screenshots are real captures, see note at top).
write(join(STORE, 'icon.png'), iconFullSvg, 512);
write(join(STORE, 'featureGraphic.png'), featureGraphic(), 1024);

console.log('\nDone. Review the PNGs, then commit them (app icon + store graphics).');
