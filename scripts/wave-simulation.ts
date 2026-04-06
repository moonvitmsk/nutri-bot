/**
 * Moonvit Wave-Based UX Simulation — 8 итеративных волн
 * Каждая волна: 50-100 синтетических персон × 3-5 дней использования
 * Standalone — только OpenAI, без зависимостей от приложения.
 *
 * Запуск: npx tsx scripts/wave-simulation.ts
 */

import OpenAI from 'openai';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ── Types ──

interface WaveReport {
  wave: number;
  timestamp: string;
  personas_count: number;
  groups: { bot: number; miniapp: number; both: number };
  nps: { score: number; promoters: number; passives: number; detractors: number };
  avg_satisfaction: number;
  retention_7d: number;
  retention_30d: number;
  top_complaints: { issue: string; frequency: number; severity: 'high' | 'medium' | 'low' }[];
  top_requests: { feature: string; frequency: number; impact: 'high' | 'medium' | 'low' }[];
  actionable_fixes: string[];
  raw_feedback: { persona: string; age: number; group: string; nps: number; comment: string }[];
}

interface WaveSummary {
  total_waves: number;
  started_at: string;
  finished_at: string;
  nps_trend: { wave: number; nps: number }[];
  satisfaction_trend: { wave: number; score: number }[];
  retention_7d_trend: { wave: number; pct: number }[];
  retention_30d_trend: { wave: number; pct: number }[];
  all_fixes_applied: string[];
  final_nps: number;
  final_satisfaction: number;
  final_retention_7d: number;
  final_retention_30d: number;
  biggest_improvements: string[];
  remaining_issues: string[];
}

interface Persona {
  id: number;
  name: string;
  age: number;
  sex: 'male' | 'female';
  city: string;
  archetype: string;
  goal: string;
  tech_level: 'low' | 'medium' | 'high';
  motivation: string;
  lifestyle: string;
  pain_points: string;
  group: 'bot' | 'miniapp' | 'both';
}

// ── Config ──

const TOTAL_WAVES_DEFAULT = 8;
const PERSONAS_PER_WAVE = 75; // 50-100 range, middle ground
const SIMULATION_DAYS = 4;    // 3-5 range, middle ground
const MODEL = 'gpt-4.1';
const REPORTS_DIR = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'wave-reports');

// ── API Key ──

function getApiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

  for (const envFile of ['.env.local', '.env']) {
    try {
      const content = readFileSync(resolve(process.cwd(), envFile), 'utf-8');
      const match = content.match(/OPENAI_API_KEY=["']?([^"'\n\r]+)["']?/);
      if (match?.[1]) return match[1];
    } catch {}
  }

  throw new Error('OPENAI_API_KEY not found. Create .env file with OPENAI_API_KEY=sk-...');
}

// ── OpenAI Helper ──

async function chatCompletion(
  client: OpenAI,
  messages: { role: 'system' | 'user'; content: string }[],
  maxTokens = 12000,
): Promise<string> {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages,
    max_completion_tokens: maxTokens,
    temperature: 0.85,
  });
  return res.choices[0]?.message?.content || '';
}

function parseJSON(raw: string): any {
  // Strip markdown code fences
  let cleaned = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try extracting the outermost { ... }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}

    // Try truncating at last valid closing brace
    const s = match[0];
    for (let i = s.length - 1; i > 100; i--) {
      if (s[i] === '}') {
        try { return JSON.parse(s.slice(0, i + 1)); } catch {}
      }
    }
  }

  // Last resort: build a minimal valid response
  console.warn(`  [WARN] Could not parse JSON (${raw.length} chars), using fallback`);
  return {
    feedback: [],
    aggregated: {
      avg_nps: 5, promoters: 2, passives: 15, detractors: 8,
      avg_satisfaction: 6.0, retention_7d: 50, retention_30d: 28,
      top_complaints: [{ issue: 'JSON parse error — данные неполные', frequency: 100, severity: 'medium' }],
      top_requests: [{ feature: 'Требуется повторный запуск волны', frequency: 100, impact: 'medium' }],
      actionable_fixes: ['Повторить волну с меньшим батчем'],
    },
  };
}

// ── Persona Data ──

const NAMES_F = [
  'Анна', 'Мария', 'Екатерина', 'Ольга', 'Наталья', 'Елена', 'Татьяна',
  'Ирина', 'Дарья', 'Юлия', 'Алина', 'Софья', 'Полина', 'Виктория',
  'Ксения', 'Светлана', 'Людмила', 'Валентина', 'Галина', 'Марина',
];
const NAMES_M = [
  'Александр', 'Дмитрий', 'Максим', 'Артём', 'Иван', 'Михаил', 'Андрей',
  'Сергей', 'Никита', 'Павел', 'Кирилл', 'Евгений', 'Роман', 'Владимир',
  'Тимур', 'Олег', 'Борис', 'Геннадий', 'Виктор', 'Николай',
];
const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Самара', 'Ростов-на-Дону', 'Краснодар', 'Воронеж',
  'Уфа', 'Красноярск', 'Пермь', 'Волгоград', 'Тюмень',
];

// Реалистичные архетипы русскоязычных пользователей
const ARCHETYPES: { name: string; ageRange: [number, number]; sex: 'female' | 'male' | 'any'; techBias: 'low' | 'medium' | 'high'; groupBias: 'bot' | 'miniapp' | 'both' | 'any' }[] = [
  { name: 'Мама в декрете', ageRange: [24, 38], sex: 'female', techBias: 'medium', groupBias: 'both' },
  { name: 'Офисный работник', ageRange: [25, 45], sex: 'any', techBias: 'medium', groupBias: 'miniapp' },
  { name: 'Спортсмен/фитнес', ageRange: [20, 40], sex: 'any', techBias: 'high', groupBias: 'both' },
  { name: 'Пенсионер', ageRange: [58, 75], sex: 'any', techBias: 'low', groupBias: 'bot' },
  { name: 'Студент', ageRange: [18, 25], sex: 'any', techBias: 'high', groupBias: 'miniapp' },
  { name: 'Молодая девушка на диете', ageRange: [18, 30], sex: 'female', techBias: 'high', groupBias: 'miniapp' },
  { name: 'Мужчина с лишним весом', ageRange: [30, 55], sex: 'male', techBias: 'medium', groupBias: 'bot' },
  { name: 'Бизнесмен в разъездах', ageRange: [30, 50], sex: 'male', techBias: 'high', groupBias: 'bot' },
  { name: 'Домохозяйка 45+', ageRange: [45, 60], sex: 'female', techBias: 'low', groupBias: 'bot' },
  { name: 'IT-специалист', ageRange: [22, 40], sex: 'any', techBias: 'high', groupBias: 'both' },
  { name: 'Диабетик', ageRange: [35, 70], sex: 'any', techBias: 'medium', groupBias: 'both' },
  { name: 'Веган/вегетарианец', ageRange: [20, 40], sex: 'any', techBias: 'high', groupBias: 'miniapp' },
  { name: 'Многодетная мать', ageRange: [28, 42], sex: 'female', techBias: 'medium', groupBias: 'bot' },
  { name: 'Водитель/курьер', ageRange: [25, 50], sex: 'male', techBias: 'low', groupBias: 'bot' },
  { name: 'Фрилансер-дизайнер', ageRange: [22, 38], sex: 'any', techBias: 'high', groupBias: 'miniapp' },
];

const GOALS = [
  'Похудеть на 5-10 кг', 'Набрать мышечную массу', 'Поддержать здоровый вес',
  'Улучшить питание семьи', 'Контролировать сахар (диабет)', 'Набрать вес',
  'Спортивное питание', 'Правильное питание для детей', 'Снизить холестерин',
  'Восстановиться после болезни', 'Питание при беременности',
];
const MOTIVATIONS = [
  'Хочу влезть в одежду', 'Врач рекомендовал', 'Хочу больше энергии',
  'Готовлюсь к соревнованиям', 'Пример для детей', 'Устал считать калории вручную',
  'Интересно попробовать AI', 'Подруга рекомендовала', 'Увидел рекламу в Telegram',
  'Хочу понять свои дефициты витаминов',
];
const PAIN_POINTS = [
  'Не знаю что готовить', 'Срываюсь на сладкое', 'Нет времени на готовку',
  'Не понимаю этикетки', 'Ем фастфуд', 'Не знаю дефициты витаминов',
  'Хочу разнообразие', 'Не контролирую порции', 'Не понимаю КБЖУ',
  'Забываю пить воду', 'Ем поздно вечером',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function generatePersonas(count: number): Persona[] {
  const personas: Persona[] = [];

  for (let i = 0; i < count; i++) {
    const archetype = pick(ARCHETYPES);
    const sex: 'male' | 'female' = archetype.sex === 'any'
      ? (Math.random() > 0.45 ? 'female' : 'male')
      : archetype.sex;
    const names = sex === 'female' ? NAMES_F : NAMES_M;
    const age = randInt(archetype.ageRange[0], archetype.ageRange[1]);

    let tech_level: 'low' | 'medium' | 'high';
    if (archetype.techBias === 'low') {
      tech_level = pick(['low', 'low', 'medium'] as const);
    } else if (archetype.techBias === 'high') {
      tech_level = pick(['medium', 'high', 'high'] as const);
    } else {
      tech_level = pick(['low', 'medium', 'high'] as const);
    }

    let group: 'bot' | 'miniapp' | 'both';
    if (archetype.groupBias === 'any') {
      group = pick(['bot', 'miniapp', 'both'] as const);
    } else {
      // 60% bias toward archetype preference, 40% random
      group = Math.random() < 0.6
        ? archetype.groupBias
        : pick(['bot', 'miniapp', 'both'] as const);
    }

    personas.push({
      id: i + 1,
      name: pick(names),
      age,
      sex,
      city: pick(CITIES),
      archetype: archetype.name,
      goal: pick(GOALS),
      tech_level,
      motivation: pick(MOTIVATIONS),
      lifestyle: archetype.name,
      pain_points: pick(PAIN_POINTS),
      group,
    });
  }

  return personas;
}

// ── Wave 1 Product Description ──

const WAVE_1_PRODUCT = `Moonvit — AI-нутрициолог для мессенджера MAX.
Бот: текстовый ввод еды, фото еды → КБЖУ, голосовой ввод, рецепты, план питания, глубокая консультация (4 AI-агента), анализы крови по фото, меню ресторана по фото.
Мини-приложение (Web App): табы Сегодня/Дневник/AI Hub/Витамины/Профиль. Solar system макросы, прогресс-бары витаминов, рецепты, AI-чат, план питания, глубокая консультация, анализ ресторанного меню, анализы крови, вес-трекер, бейджи, промо-коды, аллергии, реферальная программа.
Синергия: бот для быстрого ввода, приложение для визуализации и AI-функций.
Текущие проблемы: нет push-уведомлений, нет онбординг-тултипов, тон бота слишком дерзкий для 50+, нет кнопки воды на главной, мало российских блюд в базе.`;

// ── Simulation Prompt ──

function buildSimulationPrompt(
  waveNumber: number,
  productDescription: string,
  personas: Persona[],
  previousFixes?: string[],
): { system: string; user: string } {
  const fixesContext = previousFixes?.length
    ? `\n\nИЗМЕНЕНИЯ С ПРОШЛОЙ ВОЛНЫ (уже внедрены):\n${previousFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
    : '';

  const system = `Ты старший UX-исследователь. Проводишь волну ${waveNumber} тестирования AI-нутрициолога "Moonvit" (Россия, мессенджер MAX).

ОПИСАНИЕ ПРОДУКТА:
${productDescription}
${fixesContext}

Тебе даны ${personas.length} персон (российские пользователи). Симулируй ${SIMULATION_DAYS}-дневный опыт КАЖДОГО.

ПРАВИЛА РЕАЛИЗМА:
- Учитывай архетип, возраст, tech_level: пенсионеры путаются в навигации, студенты ценят скорость
- ~15-25% забросят за 2 дня, ~30-40% станут активными
- Конкретика: "не нашла кнопку воды на главном экране", а не "плохой UX"
- Российские реалии: продукты из Пятёрочки/Магнита, борщ, каша, пельмени
- Группа "bot" — только чат-бот, "miniapp" — только мини-приложение, "both" — оба
- Низкий tech_level → проблемы с навигацией, путаница в табах
- NPS: 0-6 detractor, 7-8 passive, 9-10 promoter
- Если исправления внедрены — они должны ПОЗИТИВНО влиять на оценки в этой волне
- НО не все проблемы решаются за раз, появляются новые (после фиксов)

ФОРМАТ ОТВЕТА — СТРОГО JSON, без markdown-обёрток:

{
  "feedback": [
    {
      "persona": "Имя, архетип",
      "age": 35,
      "group": "bot",
      "nps": 7,
      "satisfaction": 6,
      "days_active": 3,
      "scenario": "Описание опыта за ${SIMULATION_DAYS} дней (2-3 предложения)",
      "liked": ["конкретный плюс"],
      "disliked": ["конкретная проблема"],
      "wish": "одно пожелание",
      "comment": "Общий комментарий от лица пользователя"
    }
  ],
  "aggregated": {
    "avg_nps": 6.5,
    "promoters_count": 10,
    "passives_count": 25,
    "detractors_count": 40,
    "avg_satisfaction": 5.8,
    "retention_7d_pct": 55,
    "retention_30d_pct": 30,
    "top_complaints": [
      { "issue": "описание проблемы", "frequency_pct": 45, "severity": "high" }
    ],
    "top_requests": [
      { "feature": "описание фичи", "frequency_pct": 35, "impact": "high" }
    ],
    "actionable_fixes": [
      "Конкретный фикс для следующей волны"
    ]
  }
}

ВАЖНО:
- top_complaints: ровно 5 штук, отсортированы по frequency_pct DESC
- top_requests: ровно 5 штук, отсортированы по frequency_pct DESC
- actionable_fixes: 3-5 конкретных, приоритизированных действий
- NPS score = % promoters - % detractors (от общего числа)
- feedback: по каждой из ${personas.length} персон`;

  const personaList = personas.map(p =>
    `#${p.id} ${p.name}, ${p.sex === 'female' ? 'Ж' : 'М'}${p.age}, ${p.city}, [${p.archetype}], цель: ${p.goal}, tech: ${p.tech_level}, группа: ${p.group}, мотив: ${p.motivation}, боль: ${p.pain_points}`
  ).join('\n');

  const user = `ВОЛНА ${waveNumber} — ПЕРСОНЫ:\n${personaList}\n\nСимулируй ${SIMULATION_DAYS}-дневный опыт и дай JSON.`;

  return { system, user };
}

// ── Run Single Wave ──

export async function runWave(
  client: OpenAI,
  waveNumber: number,
  productDescription: string,
  previousFixes?: string[],
): Promise<WaveReport> {
  const personas = generatePersonas(PERSONAS_PER_WAVE);

  const groupCounts = {
    bot: personas.filter(p => p.group === 'bot').length,
    miniapp: personas.filter(p => p.group === 'miniapp').length,
    both: personas.filter(p => p.group === 'both').length,
  };

  console.log(`\n  Волна ${waveNumber}: ${personas.length} персон (бот: ${groupCounts.bot}, мини-апп: ${groupCounts.miniapp}, оба: ${groupCounts.both})`);

  // Split personas into chunks to stay within token limits
  // Process in 3 batches of ~25 each
  const chunkSize = Math.ceil(personas.length / 3);
  const chunks = [
    personas.slice(0, chunkSize),
    personas.slice(chunkSize, chunkSize * 2),
    personas.slice(chunkSize * 2),
  ];

  const allFeedback: any[] = [];
  const aggregatedResults: any[] = [];

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    if (chunk.length === 0) continue;

    console.log(`    Батч ${ci + 1}/${chunks.length} (${chunk.length} персон)...`);

    try {
      const { system, user } = buildSimulationPrompt(waveNumber, productDescription, chunk, previousFixes);
      const raw = await chatCompletion(client, [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], 16000);

      const parsed = parseJSON(raw);
      if (parsed.feedback) allFeedback.push(...parsed.feedback);
      if (parsed.aggregated) aggregatedResults.push(parsed.aggregated);
    } catch (batchErr: any) {
      console.warn(`    [WARN] Батч ${ci + 1} ошибка: ${batchErr.message}. Пропускаем.`);
    }
  }

  // Merge aggregated results from all chunks
  const merged = mergeAggregated(aggregatedResults, allFeedback, personas.length);

  const report: WaveReport = {
    wave: waveNumber,
    timestamp: new Date().toISOString(),
    personas_count: personas.length,
    groups: groupCounts,
    nps: {
      score: merged.nps_score,
      promoters: merged.promoters,
      passives: merged.passives,
      detractors: merged.detractors,
    },
    avg_satisfaction: merged.avg_satisfaction,
    retention_7d: merged.retention_7d,
    retention_30d: merged.retention_30d,
    top_complaints: merged.top_complaints,
    top_requests: merged.top_requests,
    actionable_fixes: merged.actionable_fixes,
    raw_feedback: allFeedback.map(f => ({
      persona: f.persona || 'unknown',
      age: f.age || 0,
      group: f.group || 'unknown',
      nps: f.nps || 0,
      comment: f.comment || f.scenario || '',
    })),
  };

  // Save individual wave report
  const reportPath = resolve(REPORTS_DIR, `wave-${waveNumber}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`    Отчёт: ${reportPath}`);

  return report;
}

// ── Merge aggregated results from multiple chunks ──

function mergeAggregated(
  results: any[],
  allFeedback: any[],
  totalPersonas: number,
): {
  nps_score: number;
  promoters: number;
  passives: number;
  detractors: number;
  avg_satisfaction: number;
  retention_7d: number;
  retention_30d: number;
  top_complaints: WaveReport['top_complaints'];
  top_requests: WaveReport['top_requests'];
  actionable_fixes: string[];
} {
  // Calculate NPS from raw feedback if available
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let totalSatisfaction = 0;

  if (allFeedback.length > 0) {
    for (const f of allFeedback) {
      const nps = f.nps ?? 5;
      if (nps >= 9) promoters++;
      else if (nps >= 7) passives++;
      else detractors++;
      totalSatisfaction += f.satisfaction ?? f.nps ?? 5;
    }
  } else {
    // Fallback to aggregated counts
    for (const r of results) {
      promoters += r.promoters_count || 0;
      passives += r.passives_count || 0;
      detractors += r.detractors_count || 0;
    }
  }

  const total = promoters + passives + detractors || 1;
  const nps_score = Math.round(((promoters - detractors) / total) * 100);
  const avg_satisfaction = allFeedback.length > 0
    ? Math.round((totalSatisfaction / allFeedback.length) * 10) / 10
    : avg(results.map(r => r.avg_satisfaction || 5));

  // Average retention
  const retention_7d = Math.round(avg(results.map(r => r.retention_7d_pct || 50)));
  const retention_30d = Math.round(avg(results.map(r => r.retention_30d_pct || 25)));

  // Merge complaints — deduplicate by similarity, sum frequencies
  const complaintMap = new Map<string, { freq: number; severity: string }>();
  for (const r of results) {
    for (const c of (r.top_complaints || [])) {
      const key = c.issue?.toLowerCase().trim() || '';
      if (!key) continue;
      const existing = complaintMap.get(key);
      if (existing) {
        existing.freq += c.frequency_pct || 0;
        if (c.severity === 'high') existing.severity = 'high';
      } else {
        complaintMap.set(key, { freq: c.frequency_pct || 0, severity: c.severity || 'medium' });
      }
    }
  }
  const top_complaints = [...complaintMap.entries()]
    .sort((a, b) => b[1].freq - a[1].freq)
    .slice(0, 5)
    .map(([issue, { freq, severity }]) => ({
      issue,
      frequency: Math.round(freq / results.length),
      severity: severity as 'high' | 'medium' | 'low',
    }));

  // Merge requests
  const requestMap = new Map<string, { freq: number; impact: string }>();
  for (const r of results) {
    for (const req of (r.top_requests || [])) {
      const key = req.feature?.toLowerCase().trim() || '';
      if (!key) continue;
      const existing = requestMap.get(key);
      if (existing) {
        existing.freq += req.frequency_pct || 0;
        if (req.impact === 'high') existing.impact = 'high';
      } else {
        requestMap.set(key, { freq: req.frequency_pct || 0, impact: req.impact || 'medium' });
      }
    }
  }
  const top_requests = [...requestMap.entries()]
    .sort((a, b) => b[1].freq - a[1].freq)
    .slice(0, 5)
    .map(([feature, { freq, impact }]) => ({
      feature,
      frequency: Math.round(freq / results.length),
      impact: impact as 'high' | 'medium' | 'low',
    }));

  // Merge fixes — deduplicate
  const fixSet = new Set<string>();
  for (const r of results) {
    for (const fix of (r.actionable_fixes || [])) {
      fixSet.add(fix);
    }
  }
  const actionable_fixes = [...fixSet].slice(0, 5);

  return {
    nps_score,
    promoters,
    passives,
    detractors,
    avg_satisfaction,
    retention_7d,
    retention_30d,
    top_complaints,
    top_requests,
    actionable_fixes,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ── Generate "Virtual Fix" Product Description ──

function applyVirtualFixes(
  baseDescription: string,
  allFixesApplied: string[],
): string {
  if (allFixesApplied.length === 0) return baseDescription;

  return `${baseDescription}

ВНЕДРЁННЫЕ УЛУЧШЕНИЯ (всего ${allFixesApplied.length}):
${allFixesApplied.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
}

// ── Run All Waves ──

export async function runAllWaves(totalWaves: number = TOTAL_WAVES_DEFAULT): Promise<void> {
  const apiKey = getApiKey();
  const client = new OpenAI({ apiKey });
  const startedAt = new Date().toISOString();

  // Ensure reports dir exists
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  console.log('='.repeat(60));
  console.log(`  MOONVIT WAVE SIMULATION — ${totalWaves} волн`);
  console.log(`  ${PERSONAS_PER_WAVE} персон × ${SIMULATION_DAYS} дней на волну`);
  console.log('='.repeat(60));

  const reports: WaveReport[] = [];
  const allFixesApplied: string[] = [];
  let currentProduct = WAVE_1_PRODUCT;

  for (let wave = 1; wave <= totalWaves; wave++) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  ВОЛНА ${wave}/${totalWaves}`);
    console.log(`${'─'.repeat(50)}`);

    const previousFixes = wave > 1 ? reports[wave - 2].actionable_fixes : undefined;

    const report = await runWave(client, wave, currentProduct, previousFixes);
    reports.push(report);

    // Print wave results
    printWaveResults(report);

    // Apply virtual fixes for next wave
    if (wave < totalWaves && report.actionable_fixes.length > 0) {
      console.log(`\n  >>> Применяем фиксы для волны ${wave + 1}:`);
      for (const fix of report.actionable_fixes) {
        console.log(`      - ${fix}`);
        allFixesApplied.push(fix);
      }
      currentProduct = applyVirtualFixes(WAVE_1_PRODUCT, allFixesApplied);
    }
  }

  // Generate and save summary
  const summary = buildSummary(reports, allFixesApplied, startedAt);
  const summaryPath = resolve(REPORTS_DIR, 'SUMMARY.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

  // Print final summary
  printFinalSummary(summary);

  console.log(`\n  Итоговый отчёт: ${summaryPath}`);
  console.log('='.repeat(60));
  console.log('  СИМУЛЯЦИЯ ЗАВЕРШЕНА');
  console.log('='.repeat(60));
}

// ── Build Summary ──

function buildSummary(
  reports: WaveReport[],
  allFixesApplied: string[],
  startedAt: string,
): WaveSummary {
  const last = reports[reports.length - 1];
  const first = reports[0];

  const improvements: string[] = [];
  if (last.nps.score > first.nps.score) {
    improvements.push(`NPS вырос с ${first.nps.score} до ${last.nps.score} (+${last.nps.score - first.nps.score})`);
  }
  if (last.avg_satisfaction > first.avg_satisfaction) {
    improvements.push(`Удовлетворённость выросла с ${first.avg_satisfaction} до ${last.avg_satisfaction}`);
  }
  if (last.retention_7d > first.retention_7d) {
    improvements.push(`Retention 7d вырос с ${first.retention_7d}% до ${last.retention_7d}%`);
  }
  if (last.retention_30d > first.retention_30d) {
    improvements.push(`Retention 30d вырос с ${first.retention_30d}% до ${last.retention_30d}%`);
  }

  return {
    total_waves: reports.length,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    nps_trend: reports.map(r => ({ wave: r.wave, nps: r.nps.score })),
    satisfaction_trend: reports.map(r => ({ wave: r.wave, score: r.avg_satisfaction })),
    retention_7d_trend: reports.map(r => ({ wave: r.wave, pct: r.retention_7d })),
    retention_30d_trend: reports.map(r => ({ wave: r.wave, pct: r.retention_30d })),
    all_fixes_applied: allFixesApplied,
    final_nps: last.nps.score,
    final_satisfaction: last.avg_satisfaction,
    final_retention_7d: last.retention_7d,
    final_retention_30d: last.retention_30d,
    biggest_improvements: improvements,
    remaining_issues: last.top_complaints.map(c => `${c.issue} (${c.frequency}%, ${c.severity})`),
  };
}

// ── Console Output ──

function printWaveResults(report: WaveReport): void {
  console.log(`\n  NPS: ${report.nps.score} (promoters: ${report.nps.promoters}, passives: ${report.nps.passives}, detractors: ${report.nps.detractors})`);
  console.log(`  Удовлетворённость: ${report.avg_satisfaction}/10`);
  console.log(`  Retention: 7d=${report.retention_7d}%, 30d=${report.retention_30d}%`);

  console.log(`\n  Топ проблем:`);
  for (const c of report.top_complaints) {
    const icon = c.severity === 'high' ? '[!!!]' : c.severity === 'medium' ? '[!!]' : '[!]';
    console.log(`    ${icon} ${c.issue} — ${c.frequency}%`);
  }

  console.log(`\n  Топ запросов:`);
  for (const r of report.top_requests) {
    const icon = r.impact === 'high' ? '[+++]' : r.impact === 'medium' ? '[++]' : '[+]';
    console.log(`    ${icon} ${r.feature} — ${r.frequency}%`);
  }

  console.log(`\n  Рекомендуемые фиксы:`);
  for (const fix of report.actionable_fixes) {
    console.log(`    -> ${fix}`);
  }
}

function printFinalSummary(summary: WaveSummary): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('  ИТОГИ: ТРЕНДЫ ПО ВОЛНАМ');
  console.log('='.repeat(60));

  console.log('\n  NPS:');
  for (const t of summary.nps_trend) {
    const bar = barChart(t.nps, -100, 100, 30);
    console.log(`    Волна ${t.wave}: ${bar} ${t.nps}`);
  }

  console.log('\n  Удовлетворённость (1-10):');
  for (const t of summary.satisfaction_trend) {
    const bar = barChart(t.score, 0, 10, 30);
    console.log(`    Волна ${t.wave}: ${bar} ${t.score}`);
  }

  console.log('\n  Retention 7d:');
  for (const t of summary.retention_7d_trend) {
    const bar = barChart(t.pct, 0, 100, 30);
    console.log(`    Волна ${t.wave}: ${bar} ${t.pct}%`);
  }

  console.log('\n  Retention 30d:');
  for (const t of summary.retention_30d_trend) {
    const bar = barChart(t.pct, 0, 100, 30);
    console.log(`    Волна ${t.wave}: ${bar} ${t.pct}%`);
  }

  if (summary.biggest_improvements.length > 0) {
    console.log('\n  Главные улучшения за все волны:');
    for (const imp of summary.biggest_improvements) {
      console.log(`    + ${imp}`);
    }
  }

  if (summary.remaining_issues.length > 0) {
    console.log('\n  Оставшиеся проблемы:');
    for (const issue of summary.remaining_issues) {
      console.log(`    - ${issue}`);
    }
  }

  console.log(`\n  Всего применено фиксов: ${summary.all_fixes_applied.length}`);
}

function barChart(value: number, min: number, max: number, width: number): string {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const filled = Math.round(normalized * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

// ── Entry Point ──

async function main() {
  const wavesArg = process.argv.find(a => a.startsWith('--waves='));
  const totalWaves = wavesArg ? parseInt(wavesArg.split('=')[1], 10) : TOTAL_WAVES_DEFAULT;

  if (isNaN(totalWaves) || totalWaves < 1 || totalWaves > 20) {
    console.error('Usage: npx tsx scripts/wave-simulation.ts [--waves=8]');
    process.exit(1);
  }

  await runAllWaves(totalWaves);
}

main().catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
