import { supabase } from '../db/supabase.js';
import { chatCompletion } from '../ai/client.js';
import { getSetting } from '../db/settings.js';

export interface UserInsight {
  id: string;
  user_id: string;
  category: string;
  insight: string;
  confidence: number;
  created_at: string;
  expires_at: string | null;
}

const INSIGHT_CATEGORIES = [
  'mood',        // настроение: "счастливый", "устал", "мотивирован"
  'preference',  // предпочтения: "любит острое", "не ест мясо"
  'health',      // здоровье: "аллергия на орехи", "диабет 2 типа"
  'goal',        // цели: "хочет похудеть на 5 кг", "набирает массу"
  'allergy',     // аллергии/непереносимости
  'habit',       // привычки: "ест поздно ночью", "пропускает завтрак"
  'milestone',   // достижения: "сбросил 2 кг", "неделю без сахара"
  'complaint',   // жалобы: "постоянная усталость", "плохой сон"
] as const;

const EXTRACT_PROMPT = `Ты анализируешь диалог AI-нутрициолога с пользователем. Извлеки ТОЛЬКО важные факты о пользователе.

Категории:
- mood: текущее настроение/эмоции
- preference: пищевые предпочтения
- health: здоровье, болезни, симптомы
- goal: цели (похудеть, набрать, здоровье)
- allergy: аллергии и непереносимости
- habit: пищевые привычки
- milestone: достижения, прогресс
- complaint: жалобы на здоровье/самочувствие

Правила:
- Только НОВЫЕ факты, которых раньше не было
- Краткие формулировки (5-15 слов)
- Если ничего важного нет — верни пустой массив
- Confidence: 0.5-1.0 (насколько уверен)
- Для mood ставь expires_days: 7 (настроение временное)
- Для allergy/health ставь expires_days: null (бессрочно)

Ответ строго в JSON:
[{"category": "mood", "insight": "сегодня в отличном настроении", "confidence": 0.9, "expires_days": 7}]

Если ничего важного: []`;

/**
 * Извлекает ключевые факты из последних сообщений пользователя.
 * Вызывается после каждого ответа бота (async, не блокирует).
 */
export async function extractInsights(
  userId: string,
  userMessage: string,
  botResponse: string,
): Promise<void> {
  try {
    // Получаем существующие инсайты чтобы не дублировать
    const existing = await getInsights(userId, 20);
    const existingText = existing.map(i => `[${i.category}] ${i.insight}`).join('\n');

    const model = await getSetting('ai_model_quality') || 'gpt-4.1-nano';
    const { text } = await chatCompletion([
      { role: 'system', content: EXTRACT_PROMPT },
      {
        role: 'user',
        content: [
          'Уже известно о пользователе:',
          existingText || '(ничего)',
          '',
          'Новый диалог:',
          `Пользователь: ${userMessage}`,
          `Бот: ${botResponse.slice(0, 500)}`,
          '',
          'Извлеки ТОЛЬКО НОВЫЕ факты (JSON):',
        ].join('\n'),
      },
    ], model, userId);

    // Парсим JSON из ответа
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const insights: {
      category: string;
      insight: string;
      confidence: number;
      expires_days?: number | null;
    }[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(insights) || insights.length === 0) return;

    // Сохраняем
    for (const ins of insights.slice(0, 5)) { // макс 5 инсайтов за раз
      if (!INSIGHT_CATEGORIES.includes(ins.category as any)) continue;
      if (!ins.insight || ins.insight.length < 3) continue;

      const expiresAt = ins.expires_days
        ? new Date(Date.now() + ins.expires_days * 86400000).toISOString()
        : null;

      await supabase.from('nutri_user_insights').insert({
        user_id: userId,
        category: ins.category,
        insight: ins.insight.slice(0, 200),
        confidence: Math.min(1, Math.max(0, ins.confidence || 0.8)),
        expires_at: expiresAt,
      });
    }
  } catch {
    // Не блокируем основной flow при ошибках извлечения
  }
}

/** Получить инсайты пользователя (актуальные, не просроченные) */
export async function getInsights(userId: string, limit = 30): Promise<UserInsight[]> {
  const { data } = await supabase
    .from('nutri_user_insights')
    .select('*')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as UserInsight[];
}

/** Форматирует инсайты для включения в системный промпт AI */
export async function getInsightsForPrompt(userId: string): Promise<string> {
  const insights = await getInsights(userId, 15);
  if (insights.length === 0) return '';

  const grouped: Record<string, string[]> = {};
  for (const ins of insights) {
    if (!grouped[ins.category]) grouped[ins.category] = [];
    grouped[ins.category].push(ins.insight);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    mood: 'Настроение',
    preference: 'Предпочтения',
    health: 'Здоровье',
    goal: 'Цели',
    allergy: 'Аллергии',
    habit: 'Привычки',
    milestone: 'Достижения',
    complaint: 'Жалобы',
  };

  const lines = Object.entries(grouped).map(([cat, items]) =>
    `- ${CATEGORY_LABELS[cat] || cat}: ${items.join('; ')}`
  );

  return [
    '',
    'Известно о пользователе (учитывай в ответах):',
    ...lines,
  ].join('\n');
}

/** Удалить устаревшие инсайты (для cron) */
export async function cleanExpiredInsights(): Promise<number> {
  const { data } = await supabase
    .from('nutri_user_insights')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .not('expires_at', 'is', null)
    .select('id');
  return data?.length || 0;
}
