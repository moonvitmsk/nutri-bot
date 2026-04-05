// C-6: Маппинг дефицитов витаминов/минералов → продукты Moonvit
// Если moonvit не покрывает нутриент — честно говорим

export interface MoonvitRecommendation {
  product: string;
  slug: string;
  reason: string;
  nutrients: string[];
  purchase_url?: string;
}

// Ссылки на Wildberries для каждого SKU
const WB_URLS: Record<string, string> = {
  'collagen-beauty': 'https://www.wildberries.ru/catalog/moonvit-collagen',
  'womens-health': 'https://www.wildberries.ru/catalog/moonvit-womens',
  'skin-hair-nails': 'https://www.wildberries.ru/catalog/moonvit-skin',
  'energy-immunity': 'https://www.wildberries.ru/catalog/moonvit-energy',
  'mens-health': 'https://www.wildberries.ru/catalog/moonvit-mens',
  'sleep-relax': 'https://www.wildberries.ru/catalog/moonvit-sleep',
};

// Маппинг: ключ дефицита → рекомендация moonvit
export const MOONVIT_MAP: Record<string, MoonvitRecommendation> = {
  // Коллаген + Красота
  vitamin_b7: { product: 'Коллаген + Красота', slug: 'collagen-beauty', reason: 'Содержит биотин (B7) для кожи и волос', nutrients: ['biotin', 'vitamin_b3', 'vitamin_b6'], purchase_url: WB_URLS['collagen-beauty'] },
  biotin: { product: 'Коллаген + Красота', slug: 'collagen-beauty', reason: 'Биотин — основной компонент', nutrients: ['biotin'], purchase_url: WB_URLS['collagen-beauty'] },

  // Женское здоровье
  magnesium: { product: 'Женское здоровье', slug: 'womens-health', reason: 'Магний + коэнзим Q10 + K2', nutrients: ['magnesium', 'zinc', 'vitamin_k'], purchase_url: WB_URLS['womens-health'] },
  zinc: { product: 'Женское здоровье', slug: 'womens-health', reason: 'Цинк для иммунитета и гормонов', nutrients: ['zinc', 'magnesium'], purchase_url: WB_URLS['womens-health'] },

  // Кожа, волосы, ногти
  vitamin_a: { product: 'Кожа, волосы, ногти', slug: 'skin-hair-nails', reason: 'Витамины A + D + B для кожи', nutrients: ['vitamin_a', 'vitamin_d', 'biotin'], purchase_url: WB_URLS['skin-hair-nails'] },

  // Энергия и иммунитет
  vitamin_d: { product: 'Энергия и иммунитет', slug: 'energy-immunity', reason: 'Витамин D + E + B для энергии', nutrients: ['vitamin_d', 'vitamin_e', 'vitamin_b12'], purchase_url: WB_URLS['energy-immunity'] },
  vitamin_e: { product: 'Энергия и иммунитет', slug: 'energy-immunity', reason: 'Содержит PQQ + витамин E', nutrients: ['vitamin_e', 'vitamin_d'], purchase_url: WB_URLS['energy-immunity'] },
  vitamin_b12: { product: 'Энергия и иммунитет', slug: 'energy-immunity', reason: 'B12 для энергии и нервной системы', nutrients: ['vitamin_b12'], purchase_url: WB_URLS['energy-immunity'] },

  // Мужское здоровье
  selenium: { product: 'Мужское здоровье', slug: 'mens-health', reason: 'Селен + Q10 + карнитин', nutrients: ['selenium', 'zinc'], purchase_url: WB_URLS['mens-health'] },

  // Сон и расслабление
  vitamin_b6: { product: 'Сон и расслабление', slug: 'sleep-relax', reason: '5-HTP + глицин + B6 для сна', nutrients: ['vitamin_b6'], purchase_url: WB_URLS['sleep-relax'] },
};

// Нутриенты, которые moonvit НЕ покрывает — рекомендуем еду
export const FOOD_RECOMMENDATIONS: Record<string, string> = {
  iron: 'Для железа: красное мясо, печень, гречка, шпинат. Витамин C улучшает усвоение.',
  calcium: 'Для кальция: молочные продукты, кунжут, капуста, миндаль.',
  vitamin_c: 'Для витамина C: шиповник, смородина, болгарский перец, цитрусовые.',
  vitamin_b1: 'Для B1: свинина, овсянка, гречка, семечки подсолнечника.',
  vitamin_b2: 'Для B2: печень, яйца, творог, миндаль.',
  vitamin_b9: 'Для фолиевой кислоты: зелёные листовые овощи, печень, бобовые.',
  iodine: 'Для йода: морская капуста, рыба, йодированная соль.',
  potassium: 'Для калия: бананы, картофель, авокадо, курага.',
  fiber: 'Для клетчатки: овощи, фрукты, цельнозерновые, бобовые.',
  phosphorus: 'Для фосфора: рыба, мясо, молочные продукты, орехи.',
};

export function getRecommendation(deficiencyKey: string): { moonvit?: MoonvitRecommendation; food?: string } {
  return {
    moonvit: MOONVIT_MAP[deficiencyKey],
    food: FOOD_RECOMMENDATIONS[deficiencyKey],
  };
}
