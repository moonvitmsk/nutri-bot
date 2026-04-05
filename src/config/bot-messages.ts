// Configurable bot messages — all text the bot sends to users.
// Each key maps to a nutri_settings row (key = `msg_${key}`).
// Admin can override any message via Settings → "Тексты бота".
// Supports {placeholder} templates replaced at runtime.

import { getSetting } from '../db/settings.js';

/** Default messages — used when no override in nutri_settings */
export const MSG_DEFAULTS: Record<string, string> = {
  // --- Onboarding steps ---
  onboarding_step_1: 'Как тебя зовут?',
  onboarding_step_2: 'Укажи свой пол:',
  onboarding_step_3: 'Когда ты родился? (дата рождения, например 15.03.1990)',
  onboarding_step_4: 'Какой у тебя рост в см?',
  onboarding_step_5: 'Какой у тебя вес в кг?',
  onboarding_step_6: 'Что тебе важнее всего? Я умею отслеживать питание, витамины, анализы, подбирать рецепты и составлять планы. Выбери главную цель или напиши свою:',

  // --- Onboarding validation ---
  onboarding_sex_error: 'Выбери пол кнопкой выше или напиши М/Ж:',
  onboarding_date_error: 'Не распознал дату. Введи дату рождения (например, 15.03.1990) или возраст числом:',
  onboarding_height_error: 'Введи рост числом в см (100-250):',
  onboarding_weight_error: 'Введи вес числом в кг (30-300):',

  // --- Onboarding flow ---
  onboarding_phone_activated: 'Спасибо! Пробный период активирован на 30 дней.',
  onboarding_phone_request: 'Поделись номером телефона — активирую пробный период на 30 дней.',
  onboarding_phone_button: 'Нажми кнопку ниже, чтобы поделиться номером телефона — это быстро:',
  onboarding_phone_retry: 'Не удалось получить номер. Нажми кнопку ещё раз:',
  onboarding_phone_before_photo: 'Круто, что хочешь отправить фото! Но сначала поделись номером телефона — это займёт секунду:',
  onboarding_consent_yes: 'Отлично! Давай познакомимся. Как тебя зовут?',
  onboarding_consent_no: 'Понимаю. Без обработки данных я не смогу давать персональные рекомендации, но ты можешь задавать общие вопросы о питании. Напиши /start если передумаешь.',
  onboarding_profile_choice: 'Круто, да? Чтобы я мог давать персональные рекомендации, давай быстро познакомимся.\n\nВыбери режим:',
  onboarding_skip_to_profile: 'Отлично! Давай настроим профиль для персональных рекомендаций.\n\nВыбери режим:',
  onboarding_fallback_greeting: 'Привет! Я — NutriBot, AI-нутрициолог от Moonvit. Анализирую фото еды, считаю калории и подбираю витамины — всё за секунды.',

  // --- Service messages ---
  msg_analyzing_photo: 'Анализирую фото...',
  msg_analyzing_menu: 'Анализирую меню ресторана...',
  msg_send_food_photo: 'Отправь фото еды — я проанализирую состав и КБЖУ!',
  msg_send_lab_photo: 'Отправь фото анализов крови, биохимии или гормонов. МРТ и снимки тоже можешь — скажу, что с ними делать.',
  msg_send_qr_photo: 'Сфотографируй QR-код под крышкой продукта Moonvit и отправь фото в чат:',
  msg_photo_error: 'Не удалось проанализировать фото. Попробуй ещё раз или отправь фото получше.',
  msg_weight_hint: '\nВес другой? Нажми «Изменить вес»',
  msg_deep_consult_start: 'Запускаю глубокую консультацию (4 AI-агента)... Подожди 20-30 секунд.',
  msg_restaurant_prompt: 'Сфотографируй меню ресторана — я посчитаю калории каждого блюда! Выбирай осознанно.',
  msg_choose_action: 'Выбери действие:',
  msg_more_functions: 'Дополнительные функции:',
  msg_intent_food: 'Отправь мне фото еды — я посчитаю калории!',

  // --- Attachment responses ---
  msg_file_unsupported: 'Я работаю с фото еды и анализами. Отправь мне фотографию — текстовые файлы пока не мой профиль.',
  msg_video_unsupported: 'Видео пока не умею анализировать. Сфотографируй еду или анализы — и отправь фото!',
  msg_sticker_response: 'Классный стикер, но в нём ноль калорий. Отправь фото еды — посчитаю настоящие!',
  msg_share_response: 'Спасибо за ссылку! Но я лучше работаю с фото еды и анализами. Отправь фотку — разберу.',

  // --- Trial / subscription ---
  msg_trial_activated: 'Спасибо! Активирован пробный период на 30 дней — глубокие консультации и разбор анализов крови. Отправь фото еды!',
  msg_trial_expired: 'Пробный период закончился. Чтобы продолжить пользоваться всеми функциями, найди QR-код под крышкой любого продукта Moonvit и отправь фото в чат!',

  // --- Feature-lock messages ---
  feature_photo: 'Распознавание фото еды недоступно на бесплатном тарифе. Активируй QR-код Moonvit для доступа!',
  feature_lab: 'Анализ лабораторных результатов доступен только на Premium. Активируй QR-код Moonvit!',
  feature_deepcheck: 'Глубокая консультация доступна на Trial и Premium тарифах.',
  feature_chat_limit: 'Достигнут лимит сообщений на сегодня. Активируй QR-код Moonvit для безлимитного доступа!',
  feature_photo_limit: 'Достигнут лимит фото на сегодня. Попробуй завтра или активируй Premium!',

  // --- Free analyses exhausted (phone-sharing CTA) ---
  msg_free_exhausted: [
    'Бесплатные анализы закончились!',
    '',
    'Поделись номером телефона — и получи месяц без ограничений:',
    '- Безлимитные анализы фото еды',
    '- Разбор анализов крови',
    '- Глубокие консультации 4 AI-агентов',
    '- Персональные скидки на витамины Moonvit',
    '',
    'Зачем нужен номер?',
    '- Идентификация для скидок в магазинах Moonvit',
    '- Персонализация рекомендаций',
    '- Восстановление аккаунта при смене устройства',
    '',
    'Нажми кнопку ниже:',
  ].join('\n'),
  msg_free_exhausted_button: 'Поделись номером для активации:',

  // --- Disclaimers ---
  disclaimer: 'Бот не заменяет консультацию врача или диетолога.',
  lab_disclaimer: 'Интерпретация носит информационный характер. При серьезных отклонениях обратитесь к врачу.',
  vitamin_disclaimer: 'Перед приемом БАД проконсультируйтесь со специалистом.',

  // --- Misc ---
  msg_nothing_today: 'Сегодня ещё нет записей. Отправь фото еды!',
  msg_vitamins_empty: 'Сегодня ещё нет записей — витаминный баланс пока пуст. Отправь фото еды!',
  msg_welcome_back: 'С возвращением, {name}! Выбери действие:',
  msg_fill_profile_first: 'Сначала заполни профиль! Напиши /start',
  msg_weight_nothing: 'Нечего редактировать. Отправь фото еды.',
  msg_send_lab_command: 'Отправь фото результатов анализов (скриншот или фото бумажного бланка):',
};

/** All known message keys (for admin listing) */
export const MSG_KEYS = Object.keys(MSG_DEFAULTS);

/**
 * Get a bot message by key. Checks nutri_settings first (key = `msg_${key}`),
 * falls back to hardcoded default. Supports {placeholder} replacement.
 */
export async function getMsg(key: string, vars?: Record<string, string | number>): Promise<string> {
  const dbValue = await getSetting(key);
  let text = dbValue || MSG_DEFAULTS[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
