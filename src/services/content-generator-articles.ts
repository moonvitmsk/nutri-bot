import { chatCompletion } from '../ai/client.js';

const ARTICLE_TOPICS = [
  'Почему белок важнее калорий',
  'Топ-10 продуктов с витамином D (доступных в России)',
  'Почему ты устаёшь после обеда',
  'Магний: главный дефицит россиян',
  'Как читать этикетки за 10 секунд',
  '5 перекусов до 200 ккал',
  'Почему вода — это не только 8 стаканов',
  'Белок для женщин: сколько на самом деле нужно',
  'Витамин B12: веганам и не только',
  'Сезонные продукты: что покупать весной',
];

export async function generateArticle(topic?: string): Promise<{ title: string; body: string; tags: string[] }> {
  const selectedTopic = topic || ARTICLE_TOPICS[Math.floor(Math.random() * ARTICLE_TOPICS.length)];

  const prompt = `Напиши короткую образовательную статью о питании.
Тема: "${selectedTopic}"

Формат:
- Заголовок: цепляющий, до 60 символов
- Текст: 150-200 слов, 3-4 абзаца
- Стиль: как пост в Telegram-канале — живо, с фактами, без воды
- В конце: один практический совет
- Тон: дружеский, не менторский
- 1-2 эмодзи на абзац

Ответь JSON: {"title": "...", "body": "...", "tags": ["питание", "здоровье"]}`;

  const { text } = await chatCompletion([
    { role: 'system', content: 'Ты — контент-редактор Moonvit. Пишешь короткие полезные статьи о питании.' },
    { role: 'user', content: prompt },
  ], 'gpt-4.1-mini');

  try {
    return JSON.parse(text);
  } catch {
    return { title: selectedTopic, body: text, tags: ['питание'] };
  }
}
