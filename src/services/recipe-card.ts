// Recipe infographic card generator — SVG → PNG via resvg (WASM, works on Vercel)
// Renders beautiful dark-themed recipe cards with Cyrillic support

import { Resvg } from '@resvg/resvg-js';

export interface RecipeCardData {
  name: string;
  time_min: number;
  cost_rub: number;
  why: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  kbju: { calories: number; protein: number; fat: number; carbs: number };
  covers: string;
}

const W = 800;
const H = 900;
const F = "'DejaVu Sans', Arial, Helvetica, sans-serif";

const C = {
  bg1: '#0a0a1e', bg2: '#141432',
  accent: '#B366FF', orange: '#FF9500', cyan: '#00D4FF',
  pink: '#FF3B7F', green: '#00FF88', white: '#FFFFFF',
  gray: '#8888AA', dim: '#222244',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function wrapText(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (test.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function renderSvg(r: RecipeCardData): string {
  const name = esc(clip(r.name, 38));
  const why = esc(clip(r.why, 75));

  // Ingredients (max 8)
  const ings = r.ingredients.slice(0, 8).map((ing, i) => {
    const y = 300 + i * 30;
    return `<text x="60" y="${y}" fill="${C.white}" font-size="15" font-family="${F}"><tspan fill="${C.cyan}" font-size="10">\u25CF </tspan>${esc(clip(ing.name, 22))} \u2014 ${esc(clip(ing.amount, 10))}</text>`;
  }).join('\n  ');

  // Steps with text wrapping
  let stepY = 300;
  const stepSvg: string[] = [];
  for (let i = 0; i < Math.min(r.steps.length, 5); i++) {
    const wrapped = wrapText(r.steps[i], 28);
    for (let li = 0; li < wrapped.length; li++) {
      const prefix = li === 0 ? `${i + 1}.` : '   ';
      const fill = li === 0 ? C.white : C.gray;
      stepSvg.push(`<text x="430" y="${stepY}" fill="${fill}" font-size="14" font-family="${F}">${esc(prefix)} ${esc(wrapped[li])}</text>`);
      stepY += 20;
    }
    stepY += 8;
  }

  // KBJU bar — proportional by caloric contribution
  const macroKcal = r.kbju.protein * 4 + r.kbju.fat * 9 + r.kbju.carbs * 4;
  const barW = 580;
  const pW = macroKcal > 0 ? Math.round((r.kbju.protein * 4 / macroKcal) * barW) : 193;
  const fW = macroKcal > 0 ? Math.round((r.kbju.fat * 9 / macroKcal) * barW) : 194;
  const cW = Math.max(0, barW - pW - fW);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${C.bg1}"/><stop offset="100%" stop-color="${C.bg2}"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.white}"/><stop offset="100%" stop-color="${C.accent}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" rx="24"/>

  <!-- Decorative dots -->
  <circle cx="40" cy="40" r="2" fill="${C.accent}" opacity="0.3"/>
  <circle cx="${W - 40}" cy="40" r="2" fill="${C.accent}" opacity="0.3"/>
  <circle cx="40" cy="${H - 40}" r="2" fill="${C.accent}" opacity="0.3"/>
  <circle cx="${W - 40}" cy="${H - 40}" r="2" fill="${C.accent}" opacity="0.3"/>

  <!-- Top badge -->
  <rect x="265" y="22" width="270" height="28" rx="14" fill="${C.accent}" opacity="0.15"/>
  <text x="400" y="42" text-anchor="middle" fill="${C.accent}" font-size="12" font-weight="700" font-family="${F}" letter-spacing="2">РЕЦЕПТ ОТ NUTRIBOT</text>

  <!-- Recipe name -->
  <text x="400" y="95" text-anchor="middle" fill="url(#tg)" font-size="28" font-weight="700" font-family="${F}">${name}</text>

  <!-- Time + cost badges -->
  <rect x="230" y="115" width="125" height="30" rx="15" fill="${C.orange}" opacity="0.12"/>
  <text x="293" y="135" text-anchor="middle" fill="${C.orange}" font-size="14" font-weight="600" font-family="${F}">${r.time_min} \u043C\u0438\u043D</text>

  <rect x="370" y="115" width="130" height="30" rx="15" fill="${C.green}" opacity="0.12"/>
  <text x="435" y="135" text-anchor="middle" fill="${C.green}" font-size="14" font-weight="600" font-family="${F}">~${r.cost_rub} \u0440\u0443\u0431</text>

  <!-- Why -->
  <text x="400" y="178" text-anchor="middle" fill="${C.gray}" font-size="13" font-style="italic" font-family="${F}">${why}</text>

  <!-- Divider -->
  <line x1="60" y1="200" x2="${W - 60}" y2="200" stroke="${C.accent}" stroke-width="1" opacity="0.2"/>

  <!-- Section headers -->
  <text x="60" y="240" fill="${C.cyan}" font-size="16" font-weight="700" font-family="${F}" letter-spacing="1">\u0418\u041D\u0413\u0420\u0415\u0414\u0418\u0415\u041D\u0422\u042B</text>
  <line x1="60" y1="252" x2="220" y2="252" stroke="${C.cyan}" stroke-width="2" opacity="0.4"/>

  <text x="430" y="240" fill="${C.pink}" font-size="16" font-weight="700" font-family="${F}" letter-spacing="1">\u041F\u0420\u0418\u0413\u041E\u0422\u041E\u0412\u041B\u0415\u041D\u0418\u0415</text>
  <line x1="430" y1="252" x2="620" y2="252" stroke="${C.pink}" stroke-width="2" opacity="0.4"/>

  <!-- Vertical divider -->
  <line x1="400" y1="215" x2="400" y2="580" stroke="${C.dim}" stroke-width="1" opacity="0.5"/>

  ${ings}
  ${stepSvg.join('\n  ')}

  <!-- Bottom divider -->
  <line x1="60" y1="600" x2="${W - 60}" y2="600" stroke="${C.accent}" stroke-width="1" opacity="0.2"/>

  <!-- Calories -->
  <text x="400" y="648" text-anchor="middle" fill="${C.white}" font-size="36" font-weight="700" font-family="${F}">${r.kbju.calories}</text>
  <text x="400" y="670" text-anchor="middle" fill="${C.gray}" font-size="13" font-family="${F}">\u043A\u043A\u0430\u043B \u043D\u0430 \u043F\u043E\u0440\u0446\u0438\u044E</text>

  <!-- KBJU bar -->
  <rect x="110" y="692" width="${barW}" height="14" rx="7" fill="${C.dim}"/>
  <rect x="110" y="692" width="${pW}" height="14" rx="7" fill="${C.cyan}"/>
  <rect x="${110 + pW}" y="692" width="${fW}" height="14" fill="${C.pink}"/>
  <rect x="${110 + pW + fW}" y="692" width="${cW}" height="14" rx="7" fill="${C.green}"/>

  <!-- KBJU labels -->
  <circle cx="195" cy="733" r="5" fill="${C.cyan}"/>
  <text x="207" y="738" fill="${C.white}" font-size="14" font-weight="600" font-family="${F}">\u0411 ${r.kbju.protein}\u0433</text>
  <circle cx="365" cy="733" r="5" fill="${C.pink}"/>
  <text x="377" y="738" fill="${C.white}" font-size="14" font-weight="600" font-family="${F}">\u0416 ${r.kbju.fat}\u0433</text>
  <circle cx="525" cy="733" r="5" fill="${C.green}"/>
  <text x="537" y="738" fill="${C.white}" font-size="14" font-weight="600" font-family="${F}">\u0423 ${r.kbju.carbs}\u0433</text>

  <!-- Covers -->
  ${r.covers ? `<rect x="140" y="762" width="520" height="34" rx="17" fill="${C.green}" opacity="0.08"/>
  <text x="400" y="784" text-anchor="middle" fill="${C.green}" font-size="14" font-weight="600" font-family="${F}">${esc(clip(r.covers, 55))}</text>` : ''}

  <!-- Brand -->
  <line x1="200" y1="822" x2="${W - 200}" y2="822" stroke="${C.accent}" stroke-width="1" opacity="0.15"/>
  <text x="400" y="858" text-anchor="middle" fill="${C.accent}" font-size="14" font-weight="600" font-family="${F}" opacity="0.6">Moonvit</text>
</svg>`;
}

export async function generateRecipeCardPng(recipe: RecipeCardData): Promise<Buffer> {
  const svg = renderSvg(recipe);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
  const png = resvg.render();
  return Buffer.from(png.asPng());
}
