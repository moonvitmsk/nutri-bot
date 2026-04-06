// Keyword-based intent detection from free-form text (fast, no API call).
// Returns action name or null (= forward to AI chat).

interface IntentRule {
  patterns: RegExp[];
  action: string;
}

const INTENTS: IntentRule[] = [
  // deletedata must be before profile to avoid 'удали профиль' matching 'профил'
  {
    patterns: [/удали\s+(все|мои)\s+данн/i, /забудь\s+мен/i, /удали\s+мой\s+профил/i, /^сброс$/i],
    action: 'deletedata',
  },
  {
    patterns: [/фот[о]?\s*(ед|блюд|тарел)/i, /сфот[ок]/i, /скан\w*\s*ед/i, /калори.*фото/i, /анализ.*фото/i, /посчит.*калори/i],
    action: 'food_photo',
  },
  {
    patterns: [/дневник/i, /что.*сегодня/i, /сколько.*съел/i, /итог.*дня/i, /мой.*рацион/i],
    action: 'today',
  },
  {
    patterns: [/недел/i, /за.*7.*дн/i, /статистик/i, /отчёт.*недел/i],
    action: 'week',
  },
  {
    patterns: [/deepcheck/i, /глубок.*консультац/i, /полн.*анализ/i, /провер.*здоров/i],
    action: 'deepcheck',
  },
  {
    patterns: [/результат.*крови/i, /биохими/i, /лаборатор/i, /разбор.*анализ/i],
    action: 'lab',
  },
  {
    patterns: [/профил/i, /мои.*данн/i, /моя.*информац/i, /настройк/i],
    action: 'profile',
  },
  {
    patterns: [/\bвод[ауы]\b/i, /выпи[лть].*стакан/i, /стакан.*вод/i, /попить/i, /пить.*вод/i, /водичк/i, /^вода$/i],
    action: 'water',
  },
  {
    patterns: [/qr/i, /код.*крышк/i, /сканир.*код/i],
    action: 'qr',
  },
  {
    patterns: [/подписк/i, /premium/i, /тариф/i, /оплат/i],
    action: 'subscribe',
  },
  {
    patterns: [/рецепт/i, /что.*приготов/i, /блюд[ао]/i, /готов.*обед/i, /готов.*ужин/i, /готов.*завтрак/i],
    action: 'recipes',
  },
  {
    patterns: [/план.*пита/i, /рацион.*на.*день/i, /меню.*на.*день/i, /меню.*на.*недел/i, /план.*на.*недел/i],
    action: 'mealplan',
  },
  {
    patterns: [/вчера/i, /позавчера/i, /что.*ел.*вчера/i, /что.*жрал/i, /истори/i],
    action: 'today',
  },
  {
    patterns: [/пригласи/i, /реферал/i, /приведи.*друг/i, /инвайт/i],
    action: 'invite',
  },
  {
    patterns: [/витамин/i, /дефицит/i, /нутриент/i, /микроэлемент/i, /минерал/i],
    action: 'vitamins',
  },
  {
    patterns: [/помо[гщ]/i, /что.*умеешь/i, /как.*работ/i, /функци/i, /возможност/i, /команд/i],
    action: 'help',
  },
  {
    patterns: [/начат/i, /старт/i, /заново/i, /перезапуст/i],
    action: 'start',
  },
];

export function detectIntent(text: string): string | null {
  for (const { patterns, action } of INTENTS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return action;
    }
  }
  return null;
}
