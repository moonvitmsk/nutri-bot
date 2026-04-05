// Animated GIF report generator for daily KBJU summary
// Renders SVG frames with circular progress rings → converts to animated GIF via gifenc

import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

interface MacroData {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  fat: { current: number; target: number };
  carbs: { current: number; target: number };
}

interface ReportOptions {
  userName: string;
  macros: MacroData;
  date?: string;
}

const WIDTH = 800;
const HEIGHT = 520;
const TOTAL_FRAMES = 24;
const HOLD_FRAMES = 8;
const FRAME_DELAY = 70; // ms

const COLORS = {
  bg1: '#0a0a1e',
  bg2: '#141432',
  calories: '#FF9500',
  protein: '#00D4FF',
  fat: '#FF3B7F',
  carbs: '#00FF88',
  textMain: '#FFFFFF',
  textSub: '#8888AA',
  brand: '#B366FF',
};

function pct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(current / target, 1.5); // allow up to 150% for overshoot visual
}

function circleProgress(
  cx: number, cy: number, r: number,
  progress: number, color: string, label: string, value: string, unit: string,
): string {
  const circumference = 2 * Math.PI * r;
  const clampedProgress = Math.min(progress, 1);
  const offset = circumference * (1 - clampedProgress);
  const displayPct = Math.round(progress * 100);
  const pctColor = progress >= 0.9 ? '#00FF88' : progress >= 0.5 ? '#FFD700' : '#FF4444';

  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#222244" stroke-width="10" opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"
      opacity="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"
      filter="url(#glow)" opacity="0.4"/>
    <text x="${cx}" y="${cy - 14}" text-anchor="middle" fill="${COLORS.textMain}" font-size="26" font-weight="700" font-family="Arial,sans-serif">${value}</text>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle" fill="${COLORS.textSub}" font-size="13" font-family="Arial,sans-serif">${unit}</text>
    <text x="${cx}" y="${cy + 28}" text-anchor="middle" fill="${pctColor}" font-size="14" font-weight="600" font-family="Arial,sans-serif">${displayPct}%</text>
    <text x="${cx}" y="${cy + r + 28}" text-anchor="middle" fill="${color}" font-size="15" font-weight="600" font-family="Arial,sans-serif">${label}</text>
  `;
}

function renderFrame(opts: ReportOptions, animProgress: number): string {
  const { userName, macros, date } = opts;
  const dateStr = date || new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const calPct = pct(macros.calories.current, macros.calories.target) * animProgress;
  const proPct = pct(macros.protein.current, macros.protein.target) * animProgress;
  const fatPct = pct(macros.fat.current, macros.fat.target) * animProgress;
  const carbPct = pct(macros.carbs.current, macros.carbs.target) * animProgress;

  const calVal = Math.round(macros.calories.current * animProgress);
  const proVal = Math.round(macros.protein.current * animProgress);
  const fatVal = Math.round(macros.fat.current * animProgress);
  const carbVal = Math.round(macros.carbs.current * animProgress);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.bg1}"/>
      <stop offset="100%" stop-color="${COLORS.bg2}"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="${COLORS.brand}"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)" rx="20"/>

  <!-- Decorative dots -->
  <circle cx="50" cy="50" r="1.5" fill="${COLORS.brand}" opacity="0.3"/>
  <circle cx="750" cy="50" r="1.5" fill="${COLORS.brand}" opacity="0.3"/>
  <circle cx="50" cy="470" r="1.5" fill="${COLORS.brand}" opacity="0.3"/>
  <circle cx="750" cy="470" r="1.5" fill="${COLORS.brand}" opacity="0.3"/>

  <!-- Title -->
  <text x="400" y="52" text-anchor="middle" fill="url(#titleGrad)" font-size="28" font-weight="700" font-family="Arial,sans-serif">Итоги дня</text>
  <text x="400" y="78" text-anchor="middle" fill="${COLORS.textSub}" font-size="15" font-family="Arial,sans-serif">${userName} · ${dateStr}</text>

  <!-- Divider -->
  <line x1="100" y1="95" x2="700" y2="95" stroke="${COLORS.brand}" stroke-width="1" opacity="0.2"/>

  <!-- Circles -->
  ${circleProgress(130, 240, 72, calPct, COLORS.calories, 'Калории', String(calVal), 'ккал')}
  ${circleProgress(330, 240, 72, proPct, COLORS.protein, 'Белок', String(proVal), 'г')}
  ${circleProgress(530, 240, 72, fatPct, COLORS.fat, 'Жиры', String(fatVal), 'г')}
  ${circleProgress(710, 240, 72, carbPct, COLORS.carbs, 'Углеводы', String(carbVal), 'г')}

  <!-- Targets row -->
  <text x="130" y="395" text-anchor="middle" fill="${COLORS.textSub}" font-size="12" font-family="Arial,sans-serif">из ${macros.calories.target}</text>
  <text x="330" y="395" text-anchor="middle" fill="${COLORS.textSub}" font-size="12" font-family="Arial,sans-serif">из ${macros.protein.target}г</text>
  <text x="530" y="395" text-anchor="middle" fill="${COLORS.textSub}" font-size="12" font-family="Arial,sans-serif">из ${macros.fat.target}г</text>
  <text x="710" y="395" text-anchor="middle" fill="${COLORS.textSub}" font-size="12" font-family="Arial,sans-serif">из ${macros.carbs.target}г</text>

  <!-- Bottom divider -->
  <line x1="100" y1="420" x2="700" y2="420" stroke="${COLORS.brand}" stroke-width="1" opacity="0.2"/>

  <!-- Summary bar -->
  <text x="400" y="452" text-anchor="middle" fill="${COLORS.textMain}" font-size="16" font-weight="600" font-family="Arial,sans-serif">${calVal} / ${macros.calories.target} ккал · Б${proVal} Ж${fatVal} У${carbVal}</text>

  <!-- Brand -->
  <text x="400" y="495" text-anchor="middle" fill="${COLORS.brand}" font-size="14" font-weight="600" font-family="Arial,sans-serif" opacity="0.7">NutriBot by Moonvit</text>
</svg>`;
}

export async function generateReportGif(opts: ReportOptions): Promise<Buffer> {
  const gif = GIFEncoder();

  // Easing function for smooth animation
  const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const allFrames = TOTAL_FRAMES + HOLD_FRAMES;

  for (let i = 0; i < allFrames; i++) {
    const animProgress = i < TOTAL_FRAMES
      ? ease(Math.min(i / (TOTAL_FRAMES - 1), 1))
      : 1; // hold frames at 100%

    const svg = renderFrame(opts, animProgress);

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
    const rendered = resvg.render();
    const rgbaData = rendered.pixels; // Uint8Array RGBA
    const w = rendered.width;
    const h = rendered.height;

    // Convert RGBA to RGB for gifenc
    const rgbData = new Uint8Array(w * h * 3);
    for (let p = 0; p < w * h; p++) {
      rgbData[p * 3] = rgbaData[p * 4];
      rgbData[p * 3 + 1] = rgbaData[p * 4 + 1];
      rgbData[p * 3 + 2] = rgbaData[p * 4 + 2];
    }

    const palette = quantize(rgbData, 256, { format: 'rgb444' });
    const index = applyPalette(rgbData, palette, 'rgb444');

    gif.writeFrame(index, w, h, {
      palette,
      delay: FRAME_DELAY,
    });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

// Quick static PNG for lightweight contexts (fallback)
export async function generateReportPng(opts: ReportOptions): Promise<Buffer> {
  const svg = renderFrame(opts, 1);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
  return Buffer.from(resvg.render().asPng());
}
