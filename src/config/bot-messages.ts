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
  onboarding_fallback_greeting: 'Привет! Я — Moonvit, твой AI-нутрициолог. Анализирую фото еды, считаю калории и подбираю витамины — всё за секунды.',

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
    '5 бесплатных фото-анализов на сегодня использованы!',
    '',
    'Поделись номером телефона - и получи 30 дней без ограничений:',
    '- 15 фото-анализов в день',
    '- Разбор анализов крови',
    '- Глубокие консультации 4 AI-агентов',
    '- Персональные рекомендации moonvit',
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

  // --- Callback messages ---
  msg_deep_custom_prompt: 'Напиши, что хочешь узнать — я подготовлю консультацию именно по этому вопросу:',
  msg_promo_prompt: 'Введи промо-код: /promo ТВОЙ_КОД',
  msg_webapp_open: '📱 Открой мини-приложение по кнопке ниже — там графики, AI-чат, рецепты и план питания в красивом дизайне.',
  msg_edit_name_prompt: 'Введи новое имя:',
  msg_edit_birth_prompt: 'Введи дату рождения (например, 15.03.1990) или возраст:',
  msg_edit_height_prompt: 'Введи рост в см (100-250):',
  msg_edit_weight_prompt: 'Введи вес в кг (30-300):',
  msg_edit_goal_prompt: 'Выбери цель:',
  msg_edit_goal_text_prompt: 'Напиши свою цель — например: «похудеть на 5 кг к лету» или «набрать мышечную массу»:',
  msg_nothing_to_save: 'Нечего сохранять.',
  msg_nothing_to_edit: 'Нечего редактировать.',
  msg_cancelled: 'Отменено.',
  msg_data_deleted: 'Все данные удалены. Напиши /start чтобы начать заново.',
  msg_delete_cancelled: 'Удаление отменено.',
  msg_record_not_found: 'Запись не найдена.',
  msg_recipe_photo_prompt: 'Сфотографируй продукты, которые у тебя есть — я предложу рецепты из них!',
  msg_recipe_custom_prompt: 'Напиши, какие продукты есть или что хочется приготовить:',
  msg_mealplan_custom_prompt: 'Напиши, что тебе нужно — например: «план на 3 дня без глютена» или «лёгкий ужин на двоих»:',
  msg_unknown_command: 'Неизвестная команда. Напиши /help для списка команд.',
  msg_no_week_records: 'За неделю нет записей.',
  msg_no_today_records: 'Сегодня нет записей для удаления.',

  // --- Onboarding hardcoded ---
  msg_phone_explain: 'Я пока не могу ответить — мне нужен твой номер телефона для активации. Нажми кнопку ниже:',
  msg_not_a_name: 'Это не похоже на имя 😄 Как тебя зовут?',
  msg_ask_name_again: 'Привет! Как тебя зовут? Напиши своё имя:',
  msg_goal_custom_prompt: 'Напиши, чего ты хочешь от Moonvit — любую цель или пожелание:',
  msg_goal_more_detail: 'Напиши цель подробнее:',

  // --- Chat and error ---
  msg_chat_error: 'Произошла ошибка. Попробуй ещё раз.',
  msg_food_text_error: 'Не удалось оценить КБЖУ. Попробуй описать подробнее или отправь фото.',
  msg_addfood_prompt: 'Опиши, что ты ел — например: «два яйца, тост с маслом, кофе с молоком». Или отправь фото.',
  msg_webapp_full: '📱 Открой мини-приложение для удобного визуального интерфейса — графики, AI-чат, рецепты и план питания в красивом дизайне.',
  msg_delete_confirm: 'Ты уверен? Все данные (профиль, история, анализы) будут удалены безвозвратно.',
  msg_history_cleared: 'История сообщений очищена.',
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
