// Generates every brand/store PNG from code (SVG -> PNG via @resvg/resvg-js).
//
//   pnpm assets:generate
//
// Outputs:
//   assets/images/*                          — app icon, adaptive icon (fg/bg/mono), splash, favicon
//   fastlane/metadata/android/en-US/images/* — 512 store icon, 1024x500 feature graphic, screenshots
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

// --- screenshot scaffold (1080x1920) --------------------------------------

const W = 1080;
const H = 1920;
const PAD = 72;

function screenshot(headline, sub, bodyEls) {
  const band =
    rect(0, 0, W, 430, 0, 'url(#g)') +
    text(PAD, 190, 66, PALETTE.white, 800, headline) +
    text(PAD, 250, 34, 'rgba(255,255,255,0.9)', 500, sub);
  return svg(W, H, rect(0, 0, W, H, 0, PALETTE.surface) + band + bodyEls, blueGradient('g'));
}

function card(x, y, w, h) {
  return rect(x, y, w, h, 28, PALETTE.white, { stroke: PALETTE.border, sw: 2 });
}

function favicon(x, y, s, color) {
  return rect(x, y, s, s, 14, color, { opacity: 0.18 }) + rect(x + s / 2 - 3, y + s / 2 - 3, 6, 6, 3, color);
}

function linkRow(x, y, w, color, title, host, highlight) {
  const fx = x + 24;
  const fy = y + 24;
  let t;
  if (highlight) {
    const before = title.slice(0, title.toLowerCase().indexOf(highlight.toLowerCase()));
    const rest = title.slice(before.length);
    const hi = rest.slice(0, highlight.length);
    const after = rest.slice(highlight.length);
    t =
      `<text x="${fx + 96}" y="${y + 62}" font-family="${FONT}" font-size="34" font-weight="600" fill="${PALETTE.ink}">` +
      `${esc(before)}<tspan fill="${PALETTE.blue}" font-weight="700">${esc(hi)}</tspan>${esc(after)}</text>`;
  } else {
    t = text(fx + 96, y + 62, 34, PALETTE.ink, 600, title);
  }
  return (
    card(x, y, w, 132) +
    favicon(fx, fy, 72, color) +
    t +
    text(fx + 96, y + 104, 26, PALETTE.muted, 500, host)
  );
}

function quickTile(x, y, w, color, label, count) {
  return (
    card(x, y, w, 150) +
    rect(x + 22, y + 22, 54, 54, 16, color, { opacity: 0.18 }) +
    text(x + 26, y + 118, 40, PALETTE.ink, 700, count) +
    text(x + 90, y + 118, 26, PALETTE.muted, 500, label)
  );
}

// Screenshot 1 — Add link
function shotAdd() {
  const x = PAD;
  const w = W - PAD * 2;
  let y = 520;
  let els = '';
  els += text(x, y, 30, PALETTE.muted, 600, 'URL');
  y += 26;
  els += card(x, y, w, 96) + text(x + 28, y + 60, 32, PALETTE.ink, 500, 'https://docs.expo.dev');
  y += 140;
  // preview card
  els += card(x, y, w, 320);
  els += rect(x + 24, y + 24, w - 48, 170, 18, PALETTE.surface);
  els += bookmark(x + w / 2, y + 108, 54, 66, 8, 20, PALETTE.blue);
  els += text(x + 28, y + 244, 34, PALETTE.ink, 700, 'Expo Documentation');
  els += text(x + 28, y + 288, 26, PALETTE.muted, 500, 'docs.expo.dev');
  y += 360;
  // chips
  const chips = ['Development', 'react-native', 'docs'];
  let cx = x;
  chips.forEach((c, i) => {
    const cw = 60 + c.length * 17;
    els += rect(cx, y, cw, 60, 30, i === 0 ? PALETTE.blue : PALETTE.white, {
      stroke: i === 0 ? PALETTE.blue : PALETTE.border,
      sw: 2,
    });
    els += text(cx + cw / 2, y + 40, 27, i === 0 ? PALETTE.white : PALETTE.ink, 600, c, 'middle');
    cx += cw + 18;
  });
  y += 120;
  els += rect(x, y, w, 104, 26, PALETTE.blue);
  els += text(W / 2, y + 66, 34, PALETTE.white, 700, 'Save', 'middle');
  return screenshot('Save any link', 'Auto-fetched preview, folders, tags, and notes.', els);
}

// Screenshot 2 — Search
function shotSearch() {
  const x = PAD;
  const w = W - PAD * 2;
  let y = 520;
  let els = card(x, y, w, 96);
  els += text(x + 34, y + 60, 32, PALETTE.muted, 500, 'react');
  y += 150;
  els += linkRow(x, y, w, PALETTE.blue, 'React — Learn', 'react.dev', 'React');
  y += 156;
  els += linkRow(x, y, w, PALETTE.green, 'React Native docs', 'reactnative.dev', 'React');
  y += 156;
  els += linkRow(x, y, w, PALETTE.violet, 'Awesome React', 'github.com', 'React');
  y += 156;
  els += linkRow(x, y, w, PALETTE.amber, 'React patterns', 'reactpatterns.com', 'React');
  return screenshot('Find anything', 'Instant search with highlighted matches.', els);
}

// Screenshot 3 — Home / organize
function shotHome() {
  const x = PAD;
  const w = W - PAD * 2;
  const tw = (w - 44) / 3;
  let y = 520;
  let els = '';
  els += quickTile(x, y, tw, PALETTE.amber, 'Favorites', '18');
  els += quickTile(x + tw + 22, y, tw, PALETTE.blue, 'Read Later', '7');
  els += quickTile(x + (tw + 22) * 2, y, tw, PALETTE.green, 'Archive', '3');
  y += 200;
  els += text(x, y, 38, PALETTE.ink, 700, 'Folders');
  y += 30;
  const folders = [
    ['Development', PALETTE.green],
    ['Design', PALETTE.pink],
    ['Reading List', PALETTE.blue],
  ];
  folders.forEach(([name, color]) => {
    els += card(x, y, w, 118);
    els += rect(x + 24, y + 26, 66, 66, 18, color, { opacity: 0.18 });
    els += bookmark(x + 57, y + 59, 26, 32, 5, 10, color);
    els += text(x + 116, y + 58, 34, PALETTE.ink, 600, name);
    els += text(x + 116, y + 96, 26, PALETTE.muted, 500, '12 links');
    y += 138;
  });
  return screenshot('Organized your way', 'Folders, tags, favorites, and pins.', els);
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

// Store assets
write(join(STORE, 'icon.png'), iconFullSvg, 512);
write(join(STORE, 'featureGraphic.png'), featureGraphic(), 1024);
write(join(STORE, 'phoneScreenshots', '1.png'), shotAdd());
write(join(STORE, 'phoneScreenshots', '2.png'), shotSearch());
write(join(STORE, 'phoneScreenshots', '3.png'), shotHome());

console.log('\nDone. Review the PNGs, then commit them (the app icon + store graphics).');
