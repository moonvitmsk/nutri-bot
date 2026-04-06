/**
 * Moonvit UX Simulation — 90 synthetic users across 3 groups
 * Standalone script — calls OpenAI directly, no app dependencies.
 */

import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Get API key from .env files or env ──
function getApiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

  // Try reading .env / .env.local files
  for (const envFile of ['.env.local', '.env']) {
    try {
      const content = readFileSync(resolve(process.cwd(), envFile), 'utf-8');
      const match = content.match(/OPENAI_API_KEY=["']?([^"'\n\r]+)["']?/);
      if (match?.[1]) return match[1];
    } catch {}
  }

  throw new Error('OPENAI_API_KEY not found. Create .env file with OPENAI_API_KEY=sk-...');
}

async function chatCompletion(
  client: OpenAI,
  messages: { role: 'system' | 'user'; content: string }[],
  model = 'gpt-4.1',
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    messages,
    max_completion_tokens: 8000,
    temperature: 0.8,
  });
  return res.choices[0]?.message?.content || '';
}

// ── Persona Generator ──

interface Persona {
  id: number;
  name: string;
  age: number;
  sex: 'male' | 'female';
  city: string;
  goal: string;
  tech_level: 'low' | 'medium' | 'high';
  motivation: string;
  lifestyle: string;
  pain_points: string;
}

const NAMES_F = ['Анна', 'Мария', 'Екатерина', 'Ольга', 'Наталья', 'Елена', 'Татьяна', 'Ирина', 'Дарья', 'Юлия', 'Алина', 'Софья', 'Полина', 'Виктория', 'Ксения'];
const NAMES_M = ['Александр', 'Дмитрий', 'Максим', 'Артём', 'Иван', 'Михаил', 'Андрей', 'Сергей', 'Никита', 'Павел', 'Кирилл', 'Евгений', 'Роман', 'Владимир', 'Тимур'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Самара', 'Ростов-на-Дону', 'Краснодар', 'Воронеж'];
const GOALS = ['Похудеть на 5-10 кг', 'Набрать мышечную массу', 'Поддержать здоровый вес', 'Улучшить питание', 'Контролировать диабет', 'Набрать вес', 'Спортивное питание', 'Правильное питание для семьи'];
const LIFESTYLES = ['Офисная работа, мало движения', 'Спорт 3-5 раз/нед', 'Молодая мама дома', 'Студент', 'Фрилансер', 'Физическая работа', 'Пенсионер', 'Бизнесмен в разъездах'];
const MOTIVATIONS = ['Хочу влезть в одежду', 'Врач рекомендовал', 'Хочу больше энергии', 'Готовлюсь к соревнованиям', 'Пример для детей', 'Восстановление после болезни', 'Интересно попробовать AI', 'Устал считать калории вручную'];
const PAIN_POINTS = ['Не знаю что готовить', 'Срываюсь на сладкое', 'Нет времени на готовку', 'Не понимаю этикетки', 'Ем фастфуд', 'Не знаю дефициты витаминов', 'Хочу разнообразие', 'Не контролирую порции'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generatePersonas(count: number, startId: number): Persona[] {
  const personas: Persona[] = [];
  for (let i = 0; i < count; i++) {
    const sex = Math.random() > 0.45 ? 'female' : 'male';
    const names = sex === 'female' ? NAMES_F : NAMES_M;
    const age = 18 + Math.floor(Math.random() * 52);
    const techLevels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const tech = age > 55 ? pick(['low', 'medium'] as const) : age < 30 ? pick(['medium', 'high'] as const) : pick(techLevels);

    personas.push({
      id: startId + i, name: names[i % names.length], age, sex,
      city: pick(CITIES), goal: pick(GOALS), tech_level: tech,
      motivation: pick(MOTIVATIONS), lifestyle: pick(LIFESTYLES), pain_points: pick(PAIN_POINTS),
    });
  }
  return personas;
}

// ── Feature Maps ──

const BOT_FEATURES = `ФУНКЦИИ ЧАТА-БОТА (группа A):
1. Онбординг: пол, возраст, рост, вес, цель → расчёт КБЖУ
2. Фото еды → AI анализ Vision (КБЖУ + витамины + комментарий)
3. Текстовое описание еды → AI анализ
4. Голосовые сообщения → STT → анализ
5. Фото анализов крови → AI разбор маркеров
6. Сканирование этикеток БАДов → OCR
7. Фото меню ресторана → оценка калорий
8. Рецепты: 3 под дефициты с инфографикой
9. План питания: день/неделя/месяц
10. Глубокая консультация: 4 AI-агента
11. AI-чат: свободное общение с нутрициологом
12. Вечерний итог дня с GIF-отчётом
13. Утренние напоминания
14. Трекер воды (через команды)
15. Стрик (последовательность дней)
16. Реферальная программа

ОГРАНИЧЕНИЯ БОТА:
- Нет визуального дашборда / графиков прогресса
- Нет интерактивного редактирования порций
- Линейный интерфейс (сообщение за сообщением)
- Нужно помнить команды / кнопки меню
- Сложно листать историю питания`;

const MINIAPP_FEATURES = `ФУНКЦИИ МИНИ-ПРИЛОЖЕНИЯ (группа B):
1. Дашборд "Сегодня": солнечная система КБЖУ, прогресс-бары Б/Ж/У, "Осталось X ккал"
2. Список приёмов с категориями (Завтрак/Обед/Ужин/Перекус)
3. Фото еды → AI анализ с редактированием порций
4. Текстовое описание → AI анализ
5. Пропорциональный пересчёт КБЖУ при изменении веса порции
6. Распознавание воды/напитков по фото
7. Быстрые кнопки (частые блюда), кнопка "Повторить"
8. Дневник: все записи по дням с мини-барами прогресса
9. Детали блюда: состав, витамины, комментарий, удаление
10. "Moonvit AI": чат, рецепты, план питания, недельный отчёт
11. Витамины: круговые диаграммы по нутриентам
12. Рекомендации "Что добавить сегодня" + продукты Moonvit
13. Трекер воды (интерактивный ±)
14. Трекер веса: SVG-график с линией тренда
15. 8 бейджей/достижений с прогресс-барами
16. Заморозка стрика, профиль с параметрами

ОГРАНИЧЕНИЯ:
- Нет голосового ввода
- Нет анализа анализов крови
- Нет сканирования БАДов
- Нет фото меню ресторана
- Нет пуш-напоминаний
- Нет реферальной программы`;

const BOTH_FEATURES = `ФУНКЦИИ ПРИ ИСПОЛЬЗОВАНИИ БОТА + МИНИ-ПРИЛОЖЕНИЯ (группа C):
Все функции бота + все мини-приложения + синергия:
- Записи из бота видны в мини-приложении (общая БД)
- Визуальный контроль в приложении + быстрый ввод через бот
- Анализы крови через бот → дефициты видны в витаминных графиках
- Голосовой ввод через бот + визуальный контроль в приложении
- Утренние напоминания бота мотивируют открыть приложение
- Рецепты и план питания доступны в обоих каналах`;

// ── Simulation Prompt ──

const SIMULATION_PROMPT = `Ты UX-исследователь. Проводишь тестирование AI-нутрициолога "Moonvit" (Россия, мессенджер MAX).

Тебе даны 30 персон и доступные функции. Симулируй 14-дневный опыт КАЖДОГО.

На каждого:
1. scenario: как именно пользовался (2-3 предложения)
2. rating: 1-10
3. liked: 1-3 конкретных плюса
4. disliked: 1-3 конкретных проблемы
5. wish: 1 предложение

РЕАЛИЗМ:
- Учитывай возраст/tech_level: пожилые путаются, молодёжь хочет скорость
- ~20% забросят за 3 дня, ~30% станут активными
- Конкретика: "не нашла кнопку воды", а не "плохой UX"
- Российские реалии: рублёвые цены, продукты из Пятёрочки

СВОДКА в конце:
- avg_rating
- top_liked: [{feature, pct}] топ-5
- top_problems: [{problem, pct}] топ-5
- top_wishes: [{wish, pct}] топ-5
- retention_14d: сколько из 30 остались
- nps_promoters/nps_detractors/nps_score

JSON без markdown:
{"users":[{"id":1,"name":"...","scenario":"...","rating":8,"liked":["..."],"disliked":["..."],"wish":"..."}],"summary":{...}}`;

// ── Main ──

async function main() {
  const apiKey = getApiKey();
  const client = new OpenAI({ apiKey });

  console.log('═══════════════════════════════════════════════════');
  console.log('  MOONVIT UX SIMULATION — 90 пользователей');
  console.log('  3 группы × 30 человек × 14 дней');
  console.log('═══════════════════════════════════════════════════');

  const groupA = generatePersonas(30, 1);
  const groupB = generatePersonas(30, 31);
  const groupC = generatePersonas(30, 61);

  async function runGroup(name: string, personas: Persona[], features: string) {
    const list = personas.map(p =>
      `#${p.id} ${p.name}, ${p.sex === 'female' ? 'Ж' : 'М'}${p.age}, ${p.city}, цель:${p.goal}, tech:${p.tech_level}, мотив:${p.motivation}, жизнь:${p.lifestyle}, боль:${p.pain_points}`
    ).join('\n');

    console.log(`\n🚀 Группа ${name} — запуск...`);
    const raw = await chatCompletion(client, [
      { role: 'system', content: SIMULATION_PROMPT },
      { role: 'user', content: `ГРУППА: ${name}\n\nФУНКЦИИ:\n${features}\n\nПЕРСОНЫ:\n${list}\n\nСимулируй и дай JSON.` },
    ], 'gpt-4.1');

    console.log(`✅ Группа ${name} — готово (${raw.length} символов)`);
    try {
      return JSON.parse(raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim());
    } catch {
      // Try to extract JSON from response
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      return { raw: raw.slice(0, 500), parse_error: true };
    }
  }

  // Run all 3 in parallel
  const [rA, rB, rC] = await Promise.all([
    runGroup('A — Только чат-бот', groupA, BOT_FEATURES),
    runGroup('B — Только мини-приложение', groupB, MINIAPP_FEATURES),
    runGroup('C — Бот + мини-приложение', groupC, BOTH_FEATURES),
  ]);

  // Save full report
  const report = {
    date: new Date().toISOString(),
    groups: { A_bot: rA, B_miniapp: rB, C_both: rC },
  };

  const fs = await import('fs');
  fs.writeFileSync('scripts/simulation-report.json', JSON.stringify(report, null, 2), 'utf-8');
  console.log('\n📊 Отчёт: scripts/simulation-report.json');

  // ── Print Summary ──
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  СРАВНИТЕЛЬНАЯ ТАБЛИЦА');
  console.log('═══════════════════════════════════════════════════');

  for (const [label, r] of [['A (бот)', rA], ['B (мини-апп)', rB], ['C (всё)', rC]] as const) {
    const s = (r as any)?.summary;
    if (!s) { console.log(`\n${label}: ⚠️ ошибка парсинга`); continue; }
    console.log(`\n── Группа ${label} ──`);
    console.log(`  ⭐ Оценка: ${s.avg_rating}/10`);
    console.log(`  📈 Retention: ${s.retention_14d}/30 (${Math.round((s.retention_14d / 30) * 100)}%)`);
    console.log(`  💯 NPS: ${s.nps_score} (👍${s.nps_promoters} 👎${s.nps_detractors})`);
    console.log(`  ✅ Понравилось:`);
    (s.top_liked || []).slice(0, 5).forEach((f: any) => console.log(`     ${f.feature} — ${f.pct}%`));
    console.log(`  ❌ Проблемы:`);
    (s.top_problems || []).slice(0, 5).forEach((f: any) => console.log(`     ${f.problem} — ${f.pct}%`));
    console.log(`  💡 Пожелания:`);
    (s.top_wishes || []).slice(0, 5).forEach((f: any) => console.log(`     ${f.wish} — ${f.pct}%`));
  }

  // Cross-group
  const sA = (rA as any)?.summary;
  const sB = (rB as any)?.summary;
  const sC = (rC as any)?.summary;
  if (sA && sB && sC) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  КРОСС-ГРУППОВЫЕ ВЫВОДЫ');
    console.log('═══════════════════════════════════════════════════');
    const rows = [
      { g: 'A (бот)', r: sA.avg_rating, ret: sA.retention_14d, nps: sA.nps_score },
      { g: 'B (мини-апп)', r: sB.avg_rating, ret: sB.retention_14d, nps: sB.nps_score },
      { g: 'C (всё)', r: sC.avg_rating, ret: sC.retention_14d, nps: sC.nps_score },
    ];
    console.log(`\n  Оценка:    ${rows.sort((a,b) => b.r - a.r).map(x => `${x.g}=${x.r}`).join(' > ')}`);
    console.log(`  Retention: ${rows.sort((a,b) => b.ret - a.ret).map(x => `${x.g}=${x.ret}/30`).join(' > ')}`);
    console.log(`  NPS:       ${rows.sort((a,b) => b.nps - a.nps).map(x => `${x.g}=${x.nps}`).join(' > ')}`);
  }

  console.log('\n✅ Симуляция завершена.');
}

main().catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
