// I-1: Broadcast message templates for scheduled content

export interface BroadcastTemplate {
  id: string;
  topic: 'vitamin_fact' | 'recipe' | 'lifestyle' | 'promo';
  template: string;
  cta_button?: { text: string; payload: string };
}

export const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  // Факты о витаминах (10)
  {
    id: 'vf_01',
    topic: 'vitamin_fact',
    template: 'Знал(а) ли ты? Витамин D усваивается лучше с жирами. Добавь авокадо или оливковое масло к приёму.',
    cta_button: { text: '🔬 Проверить свой D', payload: 'action_today' },
  },
  {
    id: 'vf_02',
    topic: 'vitamin_fact',
    template: 'Факт: Железо из мяса усваивается в 2-3 раза лучше, чем из растений. Витамин C помогает усвоению растительного железа.',
  },
  {
    id: 'vf_03',
    topic: 'vitamin_fact',
    template: 'B12 — витамин энергии. Его дефицит вызывает усталость, раздражительность и проблемы с памятью. Вегетарианцам особенно важен.',
    cta_button: { text: '⚡ Moonvit Энергия', payload: 'action_qr' },
  },
  {
    id: 'vf_04',
    topic: 'vitamin_fact',
    template: 'Магний — минерал спокойствия. 70% россиян получают его недостаточно. Лучшие источники: орехи, шпинат, тёмный шоколад.',
  },
  {
    id: 'vf_05',
    topic: 'vitamin_fact',
    template: 'Коллаген начинает снижаться после 25 лет. Витамин C необходим для его синтеза — ешь больше шиповника и перца.',
    cta_button: { text: '✨ Moonvit Коллаген', payload: 'action_qr' },
  },
  {
    id: 'vf_06',
    topic: 'vitamin_fact',
    template: 'Цинк — главный минерал для иммунитета. Больше всего его в устрицах, но тыквенные семечки тоже отличный источник.',
  },
  {
    id: 'vf_07',
    topic: 'vitamin_fact',
    template: 'Биотин (B7) — витамин красоты. Нужен для волос, кожи и ногтей. Есть в яйцах, печени и грибах.',
  },
  {
    id: 'vf_08',
    topic: 'vitamin_fact',
    template: 'Витамин E — антиоксидант номер один. Защищает клетки от старения. Источники: подсолнечное масло, миндаль, авокадо.',
  },
  {
    id: 'vf_09',
    topic: 'vitamin_fact',
    template: 'Фолиевая кислота (B9) нужна не только беременным! Она участвует в синтезе ДНК и обновлении клеток.',
  },
  {
    id: 'vf_10',
    topic: 'vitamin_fact',
    template: 'Селен — минерал-антиоксидант. 2 бразильских ореха в день покрывают суточную норму. Но не больше — избыток вреден!',
    cta_button: { text: '💪 Moonvit Мужское', payload: 'action_qr' },
  },

  // Рецепты и еда (10)
  {
    id: 'rc_01',
    topic: 'recipe',
    template: 'Быстрый завтрак: овсянка + банан + корица + 1 ст.л. арахисовой пасты. ~350 ккал, сытость на 4 часа.',
    cta_button: { text: '🍳 Больше рецептов', payload: 'action_recipes' },
  },
  {
    id: 'rc_02',
    topic: 'recipe',
    template: 'Суперперекус: горсть миндаля (30г) + яблоко. ~250 ккал, идеальный баланс белка, жиров и клетчатки.',
  },
  {
    id: 'rc_03',
    topic: 'recipe',
    template: 'Совет: добавь семена чиа (1 ст.л.) в йогурт или смузи. Это +5г клетчатки и Омега-3 жирные кислоты.',
  },
  {
    id: 'rc_04',
    topic: 'recipe',
    template: 'Быстрый ужин: куриная грудка + гречка + салат из огурцов. ~450 ккал, 40г белка. Готовится за 20 минут.',
    cta_button: { text: '📋 Мой план питания', payload: 'action_mealplan' },
  },
  {
    id: 'rc_05',
    topic: 'recipe',
    template: 'Антистресс-напиток: тёплое молоко + 1 ч.л. мёда + куркума. Магний из молока + антиоксиданты куркумы.',
  },
  {
    id: 'rc_06',
    topic: 'recipe',
    template: 'Лайфхак: замени обычную соль на йодированную — так ты автоматически получишь дневную норму йода.',
  },
  {
    id: 'rc_07',
    topic: 'recipe',
    template: 'Белковый перекус без готовки: 100г творога + ложка мёда + горсть ягод. ~180 ккал, 18г белка.',
  },
  {
    id: 'rc_08',
    topic: 'recipe',
    template: 'Зелёный смузи: шпинат + банан + апельсиновый сок + семена льна. Железо, витамин C и Омега-3 в одном стакане.',
  },
  {
    id: 'rc_09',
    topic: 'recipe',
    template: 'Правило тарелки: 1/2 овощи, 1/4 белок, 1/4 сложные углеводы. Самый простой способ не переедать.',
  },
  {
    id: 'rc_10',
    topic: 'recipe',
    template: 'Совет на ужин: ешь за 2-3 часа до сна. Лёгкий ужин = лучший сон. Отправь фото ужина — проверим!',
    cta_button: { text: '📸 Сфоткать ужин', payload: 'action_food' },
  },

  // Лайфхаки (5)
  {
    id: 'lh_01',
    topic: 'lifestyle',
    template: 'Лайфхак: выпей стакан воды перед едой. Это поможет не переесть и улучшит пищеварение.',
    cta_button: { text: '💧 Записать воду', payload: 'action_water' },
  },
  {
    id: 'lh_02',
    topic: 'lifestyle',
    template: 'Совет: гуляй 20 минут после обеда. Это снижает уровень сахара в крови на 30% эффективнее, чем сидение.',
  },
  {
    id: 'lh_03',
    topic: 'lifestyle',
    template: 'Сон и питание связаны: при недосыпе растёт грелин (гормон голода) и падает лептин (сытости). Спи 7-8 часов!',
    cta_button: { text: '😴 Moonvit Сон', payload: 'action_qr' },
  },
  {
    id: 'lh_04',
    topic: 'lifestyle',
    template: 'Стресс-еда — не враг. Просто замени чипсы на орехи или тёмный шоколад. Магний снижает тревожность.',
  },
  {
    id: 'lh_05',
    topic: 'lifestyle',
    template: 'Пей чай с лимоном после еды — витамин C улучшает усвоение железа из пищи. Особенно важно вегетарианцам.',
  },

  // Промо (3)
  {
    id: 'pr_01',
    topic: 'promo',
    template: 'Новинка от Moonvit! Жевательные витамины с натуральными вкусами. Найди QR-код под крышкой — получи Premium!',
    cta_button: { text: '🎁 Сканировать QR', payload: 'action_qr' },
  },
  {
    id: 'pr_02',
    topic: 'promo',
    template: 'Пригласи друга в NutriBot — вы оба получите +7 дней Premium! Команда /invite',
    cta_button: { text: '🤝 Пригласить', payload: 'action_invite' },
  },
  {
    id: 'pr_03',
    topic: 'promo',
    template: 'С Premium ты получаешь: безлимит фото, разбор анализов крови, deepcheck от 4 AI-агентов. Активируй QR Moonvit!',
    cta_button: { text: '⭐ Подробнее', payload: 'action_subscribe' },
  },
];

export function getRandomTemplate(topic?: BroadcastTemplate['topic']): BroadcastTemplate {
  const pool = topic ? BROADCAST_TEMPLATES.filter(t => t.topic === topic) : BROADCAST_TEMPLATES;
  return pool[Math.floor(Math.random() * pool.length)];
}
