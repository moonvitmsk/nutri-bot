// Welcome branded card for onboarding — SVG → PNG via resvg (WASM, works on Vercel)

import { Resvg } from '@resvg/resvg-js';

const W = 800;
const H = 520;
const F = "'DejaVu Sans', Arial, Helvetica, sans-serif";

const C = {
  bg1: '#0a0a1e', bg2: '#141432',
  accent: '#B366FF', orange: '#FF9500', cyan: '#00D4FF',
  pink: '#FF3B7F', green: '#00FF88', white: '#FFFFFF',
  gray: '#8888AA',
};

const FEATURES: { color: string; text: string; desc: string }[] = [
  { color: C.orange, text: '\u0410\u043D\u0430\u043B\u0438\u0437 \u0444\u043E\u0442\u043E \u0435\u0434\u044B', desc: '\u041A\u0411\u0416\u0423 \u0437\u0430 \u0441\u0435\u043A\u0443\u043D\u0434\u0443' },
  { color: C.cyan, text: '\u0414\u043D\u0435\u0432\u043D\u0438\u043A \u043A\u0430\u043B\u043E\u0440\u0438\u0439', desc: '\u0422\u0440\u0435\u043A\u0438\u043D\u0433 \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C' },
  { color: C.green, text: '\u0412\u0438\u0442\u0430\u043C\u0438\u043D\u043D\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441', desc: '\u0427\u0442\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0440\u0430\u0446\u0438\u043E\u043D' },
  { color: C.pink, text: '\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u044B', desc: '\u041F\u043E\u0434 \u0442\u0432\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C' },
  { color: '#FFD700', text: '\u0410\u043D\u0430\u043B\u0438\u0437\u044B \u043A\u0440\u043E\u0432\u0438', desc: '\u0420\u0430\u0437\u0431\u043E\u0440 \u043C\u0430\u0440\u043A\u0435\u0440\u043E\u0432 AI' },
  { color: C.accent, text: '\u0413\u043B\u0443\u0431\u043E\u043A\u0430\u044F \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044F', desc: '4 AI-\u0430\u0433\u0435\u043D\u0442\u0430' },
];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderSvg(userName?: string): string {
  const safeName = userName ? esc(userName.slice(0, 30)) : '';

  const featuresSvg = FEATURES.map((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 80 : 430;
    const y = 235 + row * 70;
    return `<circle cx="${x}" cy="${y}" r="8" fill="${f.color}" opacity="0.85"/>
    <text x="${x + 20}" y="${y + 5}" fill="${C.white}" font-size="16" font-weight="600" font-family="${F}">${f.text}</text>
    <text x="${x + 20}" y="${y + 23}" fill="${C.gray}" font-size="12" font-family="${F}">${f.desc}</text>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${C.bg1}"/><stop offset="100%" stop-color="${C.bg2}"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.white}"/><stop offset="100%" stop-color="${C.accent}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" rx="20"/>

  <!-- Decorative -->
  <circle cx="40" cy="40" r="2" fill="${C.accent}" opacity="0.3"/>
  <circle cx="${W - 40}" cy="40" r="2" fill="${C.accent}" opacity="0.3"/>
  <circle cx="40" cy="${H - 40}" r="2" fill="${C.accent}" opacity="0.3"/>
  <circle cx="${W - 40}" cy="${H - 40}" r="2" fill="${C.accent}" opacity="0.3"/>
  <circle cx="400" cy="75" r="45" fill="${C.accent}" opacity="0.06" filter="url(#glow)"/>

  <!-- Title -->
  <text x="400" y="82" text-anchor="middle" fill="url(#tg)" font-size="38" font-weight="700" font-family="${F}">Moonvit</text>
  <text x="400" y="112" text-anchor="middle" fill="${C.gray}" font-size="16" font-family="${F}">AI-\u043D\u0443\u0442\u0440\u0438\u0446\u0438\u043E\u043B\u043E\u0433</text>

  ${safeName ? `<text x="400" y="148" text-anchor="middle" fill="${C.accent}" font-size="18" font-weight="600" font-family="${F}">\u041F\u0440\u0438\u0432\u0435\u0442, ${safeName}!</text>` : ''}

  <!-- Divider -->
  <line x1="100" y1="172" x2="${W - 100}" y2="172" stroke="${C.accent}" stroke-width="1" opacity="0.2"/>

  <text x="400" y="205" text-anchor="middle" fill="${C.white}" font-size="18" font-weight="600" font-family="${F}">\u0427\u0442\u043E \u044F \u0443\u043C\u0435\u044E:</text>

  <!-- Features grid -->
  ${featuresSvg}

  <!-- Bottom divider -->
  <line x1="100" y1="455" x2="${W - 100}" y2="455" stroke="${C.accent}" stroke-width="1" opacity="0.15"/>

  <!-- Brand -->
  <text x="400" y="490" text-anchor="middle" fill="${C.accent}" font-size="14" font-weight="600" font-family="${F}" opacity="0.6">Moonvit</text>
</svg>`;
}

export async function generateWelcomeCardPng(userName?: string): Promise<Buffer> {
  const svg = renderSvg(userName);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
  const png = resvg.render();
  return Buffer.from(png.asPng());
}
