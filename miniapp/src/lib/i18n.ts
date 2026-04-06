type Locale = 'ru' | 'en';

const translations: Record<Locale, Record<string, string>> = {
  ru: {
    'tab.today': 'Сегодня',
    'tab.diary': 'Дневник',
    'tab.ai': 'moonvit',
    'tab.vitamins': 'Витамины',
    'tab.profile': 'Профиль',
    'btn.add_food': 'Записать приём пищи',
    'btn.add_water': '+1 стакан воды',
    'label.remaining': 'Осталось',
    'label.kcal': 'ккал',
    'label.protein': 'Белки',
    'label.fat': 'Жиры',
    'label.carbs': 'Углеводы',
    'label.streak': 'дней',
    'label.entries': 'записей',
    'label.meals': 'Приёмы пищи',
    'empty.no_data': 'Нет данных',
    'error.load_failed': 'Не удалось загрузить',
    'btn.retry': 'Попробовать снова',
  },
  en: {
    'tab.today': 'Today',
    'tab.diary': 'Diary',
    'tab.ai': 'moonvit',
    'tab.vitamins': 'Vitamins',
    'tab.profile': 'Profile',
    'btn.add_food': 'Log meal',
    'btn.add_water': '+1 glass of water',
    'label.remaining': 'Remaining',
    'label.kcal': 'kcal',
    'label.protein': 'Protein',
    'label.fat': 'Fat',
    'label.carbs': 'Carbs',
    'label.streak': 'days',
    'label.entries': 'entries',
    'label.meals': 'Meals',
    'empty.no_data': 'No data',
    'error.load_failed': 'Failed to load',
    'btn.retry': 'Try again',
  },
};

let currentLocale: Locale = 'ru';

export function setLocale(locale: Locale) { currentLocale = locale; }
export function getLocale(): Locale { return currentLocale; }
export function t(key: string): string {
  return translations[currentLocale]?.[key] || translations.ru[key] || key;
}
