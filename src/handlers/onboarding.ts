import type { NutriUser } from '../max/types.js';
import { sendMessage, sendContactRequest, uploadImage, sendMessageWithImage } from '../max/api.js';
import { updateUser, setContextState } from '../db/users.js';
import { getSetting } from '../db/settings.js';
import { chatCompletion } from '../ai/client.js';
import { onboardingSex, onboardingGoal, mainMenu } from '../max/keyboard.js';
import { calculateMacros, formatMacros } from '../utils/nutrition.js';
import { disclaimer } from '../utils/formatter.js';
import { trackFunnelEvent } from '../db/analytics.js';
import { parseBirthDate } from '../utils/date-parser.js';
import { getMsg } from '../config/bot-messages.js';

// Phone-first onboarding flow:
// Step 0: Greeting + request_contact (phone FIRST)
// Step 1: Name
// Step 2: Sex (inline keyboard)
// Step 3: Age
// Step 4: Height
// Step 5: Weight
// Step 6: Goal (inline keyboard)
// Step 7: -> finishOnboarding

export async function startOnboarding(user: NutriUser, chatId: number) {
  await updateUser(user.id, { onboarding_step: 0, onboarding_completed: false } as any);

  // Greeting: use custom from admin settings, or generate AI greeting
  let greeting: string;
  const customGreeting = await getSetting('prompt_greeting');
  if (customGreeting && customGreeting.trim().length > 10) {
    greeting = customGreeting.trim();
  } else {
    try {
      const model = await getSetting('ai_model_chat') || 'gpt-4.1-mini';
      const greetingPrompt = await getSetting('prompt_greeting_ai') ||
        'Сгенерируй уникальное короткое приветствие (3-4 предложения) для AI-бота-нутрициолога. Стиль: робот Бендер + Артемий Лебедев. Тон: дерзкий, с юмором, но дружелюбный. Главный призыв: поделиться номером телефона чтобы начать. Не повторяйся. Не используй мат. Бот называется Moonvit. Ответ — только текст приветствия.';
      const { text } = await chatCompletion([
        { role: 'system', content: greetingPrompt },
        { role: 'user', content: 'Сгенерируй приветствие' },
      ], model);
      greeting = text.trim();
    } catch {
      greeting = await getMsg('onboarding_fallback_greeting');
    }
  }

  // Send greeting as text (image cards disabled)
  await sendMessage(chatId, greeting);

  // Contact request CTA (separate message with phone button)
  const phoneReq = await getMsg('onboarding_phone_request');
  await sendContactRequest(chatId, [
    phoneReq,
    '',
    '_Продолжая, ты соглашаешься с обработкой данных. /deletedata — удалить.' + disclaimer() + '_',
  ].join('\n'));
}

/** Called when user shares phone at step 0 (phone-first flow) */
export async function handlePhoneFirst(user: NutriUser, phone: string, chatId: number) {
  await trackFunnelEvent(user.id, 'phone_shared');
  const trialStart = new Date().toISOString();
  await updateUser(user.id, {
    phone,
    subscription_type: 'trial',
    trial_started_at: trialStart,
    onboarding_step: 1,
  } as any);

  const activated = await getMsg('onboarding_phone_activated');

  // If MAX profile has a valid name, confirm it; otherwise ask
  const hasValidName = user.name && user.name.length >= 2 && user.name !== 'друг';
  if (hasValidName) {
    await sendMessage(chatId, [
      activated,
      '',
      `Тебя зовут ${user.name}?`,
    ].join('\n'), [
      [
        { type: 'callback', text: 'Да, верно', payload: 'name_confirm' },
        { type: 'callback', text: 'Ввести другое', payload: 'name_change' },
      ],
      [
        { type: 'callback', text: '📸 Скинуть фото еды', payload: 'action_food' },
      ],
    ]);
  } else {
    await sendMessage(chatId, [
      activated,
      '',
      'Как тебя зовут?',
    ].join('\n'));
  }
}

export async function handleOnboardingStep(user: NutriUser, text: string, chatId: number) {
  const step = user.onboarding_step;
  const updates: Record<string, any> = {};

  switch (step) {
    case 0:
      // Step 0 = phone-first. User sent text instead of sharing phone — explain gently
      await sendMessage(chatId, await getMsg('msg_phone_explain'));
      await sendContactRequest(chatId, await getMsg('onboarding_phone_button'));
      return;

    case 1: { // got name — validate
      const nameTrim = text.trim();
      const lower = nameTrim.toLowerCase();
      const NOT_NAMES = ['спасибо', 'привет', 'здравствуйте', 'ок', 'окей', 'да', 'нет', 'хорошо', 'ладно', 'понял', 'понятно', 'давай', 'пока', 'помощь', 'help', 'start', 'меню', 'стоп', 'отмена', 'hi', 'hello', 'хай', 'ку', 'здрасте', 'добрый', 'ghbdtn', 'privet'];
      const isNotName = NOT_NAMES.some(w => lower === w);
      const isGreetingPrefix = ['привет', 'здравствуйте', 'добрый'].some(g => lower.startsWith(g) && lower !== g);
      const isCommand = nameTrim.startsWith('/');
      const isTooShort = nameTrim.length < 2;
      const isNumber = /^\d+$/.test(nameTrim);

      if (isNotName) {
        await sendMessage(chatId, await getMsg('msg_not_a_name'));
        return;
      }
      if (isGreetingPrefix || isCommand || isTooShort || isNumber) {
        // Not a valid name — re-ask
        await sendMessage(chatId, await getMsg('msg_ask_name_again'));
        return;
      }
      updates.name = nameTrim.slice(0, 100);
      break;
    }

    case 2: // sex — handled via callback, but fallback for text
      {
        const lower = text.toLowerCase().trim();
        if (lower === 'м' || lower === 'муж' || lower === 'мужской' || lower === 'мужчина') {
          updates.sex = 'male';
        } else if (lower === 'ж' || lower === 'жен' || lower === 'женский' || lower === 'женщина') {
          updates.sex = 'female';
        } else {
          await sendMessage(chatId, await getMsg('onboarding_sex_error'), onboardingSex());
          return;
        }
      }
      break;

    case 3: { // got birth date or age
      // BUG-E: Parse Russian number words (шестьдесят → 60)
      const RUSSIAN_NUMBERS: Record<string, number> = {
        'десять': 10, 'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13,
        'четырнадцать': 14, 'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17,
        'восемнадцать': 18, 'девятнадцать': 19, 'двадцать': 20, 'тридцать': 30,
        'сорок': 40, 'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70,
        'восемьдесят': 80, 'девяносто': 90, 'сто': 100,
      };
      const lower = text.trim().toLowerCase();
      const wordAge = RUSSIAN_NUMBERS[lower];
      const num = wordAge || parseInt(text);
      if (!isNaN(num) && num >= 10 && num <= 120 && (wordAge || text.trim().length <= 3)) {
        // Plain age number or Russian word (backward compat)
        updates.age = num;
      } else {
        const parsed = parseBirthDate(text);
        if (!parsed) {
          await sendMessage(chatId, await getMsg('onboarding_date_error'));
          return;
        }
        updates.birth_date = parsed.date;
        updates.age = parsed.age;
      }
      break;
    }

    case 4: { // got height
      const h = parseInt(text);
      if (isNaN(h) || h < 100 || h > 250) {
        await sendMessage(chatId, await getMsg('onboarding_height_error'));
        return;
      }
      updates.height_cm = h;
      break;
    }

    case 5: { // got weight
      const w = parseFloat(text);
      if (isNaN(w) || w < 30 || w > 250) {
        await sendMessage(chatId, await getMsg('onboarding_weight_error'));
        return;
      }
      updates.weight_kg = w;
      break;
    }

    case 6: { // goal — usually via callback, but also accept free text
      const goalText = text.trim();
      if (goalText.length < 2) {
        await sendMessage(chatId, await getStepPrompt(6), onboardingGoal());
        return;
      }
      // Save custom goal — DB-safe value + text separately
      updates.goal = 'maintain'; // DB-safe default
      updates.onboarding_step = 7;
      await updateUser(user.id, updates);
      try { await updateUser(user.id, { goal_text: goalText } as any); } catch { /* column may not exist */ }
      await finishOnboarding({ ...user, ...updates, goal_text: goalText }, {}, chatId);
      return;
    }

  }

  let nextStep = step + 1;

  // Short profile: after age (3) skip height (4) and weight (5), go to goal (6)
  if (step === 3 && user.context_state === 'onboarding_short') {
    nextStep = 6;
  }

  updates.onboarding_step = nextStep;
  const updated = await updateUser(user.id, updates);

  if (nextStep > 6) {
    await finishOnboarding(updated, {}, chatId);
    return;
  }

  const prompt = await getStepPrompt(nextStep);
  const kb = getStepKeyboard(nextStep);
  await sendMessage(chatId, prompt, kb);
}

async function getStepPrompt(step: number): Promise<string> {
  return getMsg(`onboarding_step_${step}`);
}

function getStepKeyboard(step: number) {
  if (step === 2) return onboardingSex();
  if (step === 6) return onboardingGoal();
  return undefined;
}

/** Called from router after wow food-photo at step 0 */
export async function transitionAfterWow(user: NutriUser, chatId: number) {
  // A-1: If we already have a name from MAX bot_started, ask to confirm
  const hasName = !!user.name;
  const nameMsg = hasName
    ? `Тебя зовут ${user.name}?`
    : await getMsg('onboarding_step_1');

  // A-2: Three profile modes
  await trackFunnelEvent(user.id, 'wow_photo_sent');
  await updateUser(user.id, { onboarding_step: 1 } as any);
  await sendMessage(chatId, await getMsg('onboarding_profile_choice'), [
    [
      { type: 'callback', text: 'Подробный профиль', payload: 'profile_full' },
    ],
    [
      { type: 'callback', text: 'Быстрый (пол, возраст, цель)', payload: 'profile_short' },
    ],
    [
      { type: 'callback', text: 'Просто протестировать', payload: 'profile_skip' },
    ],
  ]);
}

async function finishOnboarding(user: NutriUser, extraUpdates: Record<string, any>, chatId: number) {
  const u = { ...user, ...extraUpdates };
  const activityLevel = u.activity_level || 'moderate';
  // Use defaults for short mode (missing height/weight)
  const sex = u.sex || 'male';
  const age = u.age || 30;
  const height = u.height_cm || 170;
  const weight = u.weight_kg || 70;
  const goal = u.goal || 'maintain';

  if (goal) {
    const macros = calculateMacros({
      sex,
      age,
      height_cm: height,
      weight_kg: weight,
      activity_level: activityLevel,
      goal,
    });
    await updateUser(user.id, {
      ...extraUpdates,
      activity_level: activityLevel,
      daily_calories: macros.calories,
      daily_protein: macros.protein,
      daily_fat: macros.fat,
      daily_carbs: macros.carbs,
      onboarding_completed: true,
      onboarding_step: 8,
      context_state: 'idle',
    } as any);

    await trackFunnelEvent(user.id, 'onboarding_completed');

    const goalDisplay = u.goal_text || { lose: 'Похудеть', maintain: 'Поддержать вес', gain: 'Набрать массу' }[u.goal as string] || u.goal;

    const msg = [
      `Отлично, ${u.name || 'друг'}! Профиль заполнен.`,
      `Твоя дневная норма: ${formatMacros(macros)}`,
      goalDisplay ? `Цель: ${goalDisplay}` : '',
      '',
      'Вот что я умею — пользуйся на полную:',
      '',
      '📸 Фото еды → КБЖУ за секунду (просто отправь фото)',
      '✍️ Описание еды текстом → /addfood (если нет фото)',
      '📊 Дневник питания → /today (калории, белки, жиры, углеводы)',
      '📈 Статистика за неделю → /week (тренды, сравнение)',
      '💧 Трекер воды → /water (норма по весу)',
      '💊 Витаминный баланс → /vitamins (что добавить в рацион)',
      '🍳 Рецепты под тебя → /recipes (по ингредиентам или приёму пищи)',
      '📋 План питания → /mealplan (на день, неделю или месяц)',
      '🔬 Глубокая консультация → /deepcheck (4 AI-агента)',
      '🏥 Разбор анализов крови → /lab (фото результатов)',
      '🍽️ Меню ресторана → сфоткай и отправь',
      '📱 QR-коды Moonvit → сканируй для Premium',
      '',
      'Ты можешь писать мне что угодно — не только кнопки! Спроси про любой продукт, рецепт или витамин.',
      'Скажи "зови меня Андрей" или "вешу 75" — я запомню.',
      '',
      'Выбери действие:',
    ].join('\n');
    await sendMessage(chatId, msg, await mainMenu());
  }
}

/** Called from router when user shares contact at onboarding step 7 */
export async function handlePhoneContact(user: NutriUser, phone: string, chatId: number) {
  await trackFunnelEvent(user.id, 'phone_shared');
  const trialStart = new Date().toISOString();
  const updated = await updateUser(user.id, {
    phone,
    subscription_type: 'trial',
    trial_started_at: trialStart,
    onboarding_step: 8,
  } as any);
  await finishOnboarding(updated, {}, chatId);
}

export async function handleOnboardingCallback(user: NutriUser, payload: string, chatId: number) {
  const updates: Record<string, any> = {};

  // 152-FZ consent — kept as fallback for old users who still see consent buttons
  if (payload === 'consent_yes') {
    await updateUser(user.id, { onboarding_step: 1 } as any);
    await sendMessage(chatId, await getMsg('onboarding_consent_yes'));
    return;
  }
  if (payload === 'consent_no') {
    await sendMessage(chatId, await getMsg('onboarding_consent_no'));
    return;
  }

  // A-1: Name confirmation from MAX profile
  if (payload === 'name_confirm') {
    await updateUser(user.id, { onboarding_step: 2 } as any);
    await sendMessage(chatId, await getStepPrompt(2), onboardingSex());
    return;
  }
  if (payload === 'name_change') {
    await sendMessage(chatId, await getMsg('onboarding_step_1'));
    return;
  }

  // Skip photo, go straight to profile setup
  if (payload === 'skip_to_profile') {
    await trackFunnelEvent(user.id, 'skip_to_profile');
    await updateUser(user.id, { onboarding_step: 1 } as any);
    await sendMessage(chatId, await getMsg('onboarding_skip_to_profile'), [
      [
        { type: 'callback', text: 'Подробный профиль', payload: 'profile_full' },
      ],
      [
        { type: 'callback', text: 'Быстрый (пол, возраст, цель)', payload: 'profile_short' },
      ],
      [
        { type: 'callback', text: 'Просто протестировать', payload: 'profile_skip' },
      ],
    ]);
    return;
  }

  // A-2: Three profile modes
  if (payload === 'profile_full') {
    await trackFunnelEvent(user.id, 'profile_mode_selected', { mode: 'full' });
    // Full: name → sex → age → height → weight → goal (6 steps)
    if (user.name) {
      await sendMessage(chatId, `Тебя зовут ${user.name}?`, [
        [
          { type: 'callback', text: 'Да', payload: 'name_confirm' },
          { type: 'callback', text: 'Ввести другое', payload: 'name_change' },
        ],
      ]);
    } else {
      await sendMessage(chatId, await getMsg('onboarding_step_1'));
    }
    return;
  }
  if (payload === 'profile_short') {
    await trackFunnelEvent(user.id, 'profile_mode_selected', { mode: 'short' });
    // Short: sex → birth date → goal (skip name, height, weight)
    const name = user.name || 'друг';
    await updateUser(user.id, { name, onboarding_step: 2, context_state: 'onboarding_short' } as any);
    await sendMessage(chatId, await getMsg('onboarding_step_2'), onboardingSex());
    return;
  }
  if (payload === 'profile_skip') {
    await trackFunnelEvent(user.id, 'profile_mode_selected', { mode: 'skip' });
    // Skip profile — phone already collected at step 0, go straight to finish
    const skipUser = await updateUser(user.id, {
      name: user.name || 'друг',
      sex: null,
      age: 30,
      height_cm: 170,
      weight_kg: 70,
      goal: 'maintain',
      activity_level: 'moderate',
      daily_calories: 2000,
      daily_protein: 100,
      daily_fat: 70,
      daily_carbs: 250,
      onboarding_step: 7,
    } as any);
    await finishOnboarding(skipUser, {}, chatId);
    return;
  }

  if (payload.startsWith('sex_')) {
    // Edit mode: sex selection (must check BEFORE onboarding flow)
    if (user.onboarding_completed && user.context_state === 'editing_sex') {
      const sexValue = payload === 'sex_male' ? 'male' : 'female';
      await updateProfileAndRecalc(user, { sex: sexValue, context_state: 'idle' }, chatId);
      return;
    }

    updates.sex = payload === 'sex_male' ? 'male' : 'female';
    // A-2: In short mode (no height/weight set and step was 2), skip to age then goal
    updates.onboarding_step = 3;
    await updateUser(user.id, updates);
    await sendMessage(chatId, await getStepPrompt(3));
    return;
  }

  if (payload.startsWith('goal_')) {
    const goalValue = payload.replace('goal_', '');

    // Custom goal — ask user to type their goal (check BEFORE edit mode)
    if (goalValue === 'custom') {
      if (user.onboarding_completed) {
        // Already onboarded — switch to goal_text editing
        await setContextState(user.id, 'editing_goal_text');
      }
      await sendMessage(chatId, await getMsg('msg_goal_custom_prompt'));
      return;
    }

    // Edit mode: update goal and recalculate macros
    if (user.onboarding_completed && user.context_state === 'editing_goal') {
      const DB_GOAL_MAP_EDIT: Record<string, string> = {
        lose: 'lose', maintain: 'maintain', gain: 'gain',
        healthy: 'maintain', sport: 'gain',
      };
      const dbGoal = DB_GOAL_MAP_EDIT[goalValue] || 'maintain';
      const goalText = ['healthy', 'sport'].includes(goalValue) ? goalValue : null;
      await updateProfileAndRecalc(user, { goal: dbGoal, context_state: 'idle' }, chatId);
      if (goalText) { try { await updateUser(user.id, { goal_text: goalText } as any); } catch { /* */ } }
      return;
    }

    // Map new goals to DB-safe values (DB may have CHECK constraint)
    const DB_GOAL_MAP: Record<string, string> = {
      lose: 'lose', maintain: 'maintain', gain: 'gain',
      healthy: 'maintain', sport: 'gain', custom: 'maintain',
    };
    updates.goal = DB_GOAL_MAP[goalValue] || 'maintain';
    updates.onboarding_step = 7;
    await updateUser(user.id, updates);
    // Save goal_text separately (column may not exist yet)
    const goalTextValue = ['healthy', 'sport'].includes(goalValue) ? goalValue : null;
    if (goalTextValue) {
      try { await updateUser(user.id, { goal_text: goalTextValue } as any); } catch { /* column may not exist */ }
    }
    await finishOnboarding({ ...user, ...updates, goal_text: goalTextValue }, {}, chatId);
    return;
  }

}

/** Handle text input during profile editing (called from router) */
export async function handleProfileEdit(user: NutriUser, text: string, chatId: number) {
  const field = user.context_state?.replace('editing_', '');
  const updates: Record<string, any> = { context_state: 'idle' };

  switch (field) {
    case 'name':
      updates.name = text.trim().slice(0, 100);
      await updateUser(user.id, updates);
      await sendMessage(chatId, `Имя обновлено: ${updates.name}`, await mainMenu());
      return;

    case 'birth':
    case 'age': {
      const num = parseInt(text);
      if (!isNaN(num) && num >= 10 && num <= 120 && text.trim().length <= 3) {
        await updateProfileAndRecalc(user, { age: num, context_state: 'idle' }, chatId);
        return;
      }
      const parsed = parseBirthDate(text);
      if (!parsed) {
        await sendMessage(chatId, await getMsg('onboarding_date_error'));
        await updateUser(user.id, { context_state: 'idle' } as any);
        return;
      }
      await updateProfileAndRecalc(user, { birth_date: parsed.date, age: parsed.age, context_state: 'idle' }, chatId);
      return;
    }

    case 'height': {
      const h = parseInt(text);
      if (isNaN(h) || h < 100 || h > 250) {
        await sendMessage(chatId, await getMsg('onboarding_height_error'));
        await updateUser(user.id, { context_state: 'idle' } as any);
        return;
      }
      await updateProfileAndRecalc(user, { height_cm: h, context_state: 'idle' }, chatId);
      return;
    }

    case 'weight': {
      const w = parseFloat(text);
      if (isNaN(w) || w < 30 || w > 250) {
        await sendMessage(chatId, await getMsg('onboarding_weight_error'));
        await updateUser(user.id, { context_state: 'idle' } as any);
        return;
      }
      await updateProfileAndRecalc(user, { weight_kg: w, context_state: 'idle' }, chatId);
      return;
    }

    case 'goal_text': {
      const goalText = text.trim().slice(0, 500);
      if (goalText.length < 2) {
        await sendMessage(chatId, 'Напиши цель подробнее:');
        await updateUser(user.id, { context_state: 'idle' } as any);
        return;
      }
      await updateUser(user.id, { context_state: 'idle' } as any);
      try { await updateUser(user.id, { goal_text: goalText } as any); } catch { /* column may not exist */ }
      await sendMessage(chatId, `Цель обновлена: ${goalText}`, await mainMenu());
      return;
    }

    default:
      await updateUser(user.id, { context_state: 'idle' } as any);
      await sendMessage(chatId, 'Выбери действие:', await mainMenu());
  }
}

/** Update profile field and recalculate macros */
async function updateProfileAndRecalc(user: NutriUser, changes: Record<string, any>, chatId: number) {
  const u = { ...user, ...changes };
  const macros = calculateMacros({
    sex: u.sex || 'male',
    age: u.age || 30,
    height_cm: u.height_cm || 170,
    weight_kg: u.weight_kg || 70,
    activity_level: u.activity_level || 'moderate',
    goal: u.goal || 'maintain',
  });
  // Strip onboarding fields — editprofile must not touch step/completion
  const { onboarding_step, onboarding_completed, ...safeChanges } = changes;
  const allUpdates = {
    ...safeChanges,
    daily_calories: macros.calories,
    daily_protein: macros.protein,
    daily_fat: macros.fat,
    daily_carbs: macros.carbs,
  };
  await updateUser(user.id, allUpdates);
  await sendMessage(chatId, `Профиль обновлён! Новая норма: ${formatMacros(macros)}`, await mainMenu());
}
