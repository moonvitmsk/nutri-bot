import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { updateUser, deleteUserData, setContextState } from '../db/users.js';
import { deleteUserMessages } from '../db/messages.js';
import { getTodayLogs, getWeekLogs, getPrevWeekLogs } from '../db/food-logs.js';
import { getSubscriptionStatus, getTrialDaysRemaining, canUseFeature, activatePromoCode } from '../db/subscriptions.js';
import { mainMenu, subscriptionInfo } from '../max/keyboard.js';
import { formatMacros, formatDaySummary } from '../utils/nutrition.js';
import { featureLocked, disclaimer } from '../utils/formatter.js';
import { sendMessageWithImage, uploadImage } from '../max/api.js';
import { generateReportGif } from '../services/report-image.js';
import { trackError } from '../services/error-tracker.js';
import { trackCommand } from '../db/events.js';
import { startOnboarding } from './onboarding.js';
import { handleDeepConsult } from './deep-consult.js';
import { handleMealPlan } from './meal-plan.js';
import { handleRecipes } from '../services/recipe-recommender.js';
import { getMsg } from '../config/bot-messages.js';
import { getTodayNutrients, formatVitaminSummary } from '../services/vitamin-tracker.js';
import { vitaminDisclaimer } from '../utils/formatter.js';
import { createReferralLink, getReferralStats } from '../db/referrals.js';
import { formatProgressBar } from '../utils/formatter.js';
import { supabase } from '../db/supabase.js';

export async function handleCommand(user: NutriUser, command: string, chatId: number) {
  const cmd = command.split(' ')[0].toLowerCase();
  trackCommand(user.id, cmd);

  switch (cmd) {
    case '/start':
      if (user.onboarding_completed) {
        await sendMessage(chatId, await getMsg('msg_welcome_back', { name: user.name || 'друг' }), await mainMenu());
      } else {
        await startOnboarding(user, chatId);
      }
      break;

    case '/profile': {
      if (!user.onboarding_completed) {
        await sendMessage(chatId, await getMsg('msg_fill_profile_first'));
        return;
      }
      const sub = getSubscriptionStatus(user);
      const subLabel = { free: 'Бесплатный', trial: 'Пробный', premium: 'Premium' }[sub];
      const goalLabels: Record<string, string> = { lose: 'Похудеть', maintain: 'Поддержать вес', gain: 'Набрать массу' };
      const goalDisplay = user.goal_text || goalLabels[user.goal as string] || user.goal || 'не указана';
      const msg = [
        `Профиль: ${user.name}`,
        `${user.sex === 'male' ? 'М' : 'Ж'}, ${user.age} лет, ${user.height_cm} см, ${user.weight_kg} кг`,
        `Цель: ${goalDisplay}`,
        `Норма: ${formatMacros({ calories: user.daily_calories!, protein: user.daily_protein!, fat: user.daily_fat!, carbs: user.daily_carbs! })}`,
        `Подписка: ${subLabel}`,
        user.allergies.length ? `Аллергии: ${user.allergies.join(', ')}` : '',
      ].filter(Boolean).join('\n');
      await sendMessage(chatId, msg, [
        [
          { type: 'callback', text: '✏️ Редактировать профиль', payload: 'action_editprofile' },
        ],
        ...(await mainMenu()),
      ]);
      break;
    }

    case '/today': {
      const logs = await getTodayLogs(user.id);
      if (!logs.length) {
        await sendMessage(chatId, await getMsg('msg_nothing_today'), await mainMenu());
        return;
      }
      const target = { calories: user.daily_calories || 2000, protein: user.daily_protein || 100, fat: user.daily_fat || 70, carbs: user.daily_carbs || 250 };
      const summary = formatDaySummary(logs, target);
      const items = logs.map((l, i) => `${i + 1}. ${l.description || 'Без описания'} — ${l.calories || '?'} ккал`).join('\n');
      const text = `Дневник за сегодня:\n${items}\n\n${summary}\n\n_Чтобы удалить запись, напиши: /delfood N (номер)_`;
      const menu = await mainMenu();

      // Generate GIF report card
      let cal = 0, pro = 0, fa = 0, ca = 0;
      for (const l of logs) { cal += l.calories || 0; pro += l.protein || 0; fa += l.fat || 0; ca += l.carbs || 0; }
      try {
        const gif = await generateReportGif({
          userName: user.name || 'Друг',
          macros: {
            calories: { current: cal, target: target.calories },
            protein: { current: pro, target: target.protein },
            fat: { current: fa, target: target.fat },
            carbs: { current: ca, target: target.carbs },
          },
        });
        const token = await uploadImage(gif, 'today-report.gif');
        if (token) {
          await sendMessageWithImage(chatId, text, token, menu);
          break;
        }
      } catch (err) {
        await trackError('gif', `Today GIF error: ${err instanceof Error ? err.message : String(err)}`, { user_id: user.max_user_id });
      }
      await sendMessage(chatId, text, menu);
      break;
    }

    case '/week': {
      const [logs, prevLogs] = await Promise.all([getWeekLogs(user.id), getPrevWeekLogs(user.id)]);
      if (!logs.length) {
        await sendMessage(chatId, await getMsg('msg_no_week_records'), await mainMenu());
        return;
      }
      const totalCal = logs.reduce((s, l) => s + (l.calories || 0), 0);
      const days = new Set(logs.map(l => l.created_at.split('T')[0])).size;
      const avgCal = Math.round(totalCal / Math.max(days, 1));

      const lines = [
        'Статистика за эту неделю:',
        `Записей: ${logs.length} | Дней с записями: ${days}`,
        `Среднее в день: ~${avgCal} ккал`,
        `Всего: ${totalCal} ккал`,
      ];

      if (prevLogs.length) {
        const prevTotal = prevLogs.reduce((s, l) => s + (l.calories || 0), 0);
        const prevDays = new Set(prevLogs.map(l => l.created_at.split('T')[0])).size;
        const prevAvg = Math.round(prevTotal / Math.max(prevDays, 1));
        const diffAvg = avgCal - prevAvg;
        const diffSign = diffAvg > 0 ? '+' : '';
        const trend = diffAvg > 100 ? '📈 Больше, чем неделю назад' : diffAvg < -100 ? '📉 Меньше, чем неделю назад' : '➡️ Примерно как неделю назад';
        lines.push('', 'Прошлая неделя:', `Среднее: ~${prevAvg} ккал | Всего: ${prevTotal} ккал`, `Изменение: ${diffSign}${diffAvg} ккал/день — ${trend}`);
      }

      await sendMessage(chatId, lines.join('\n'), await mainMenu());
      break;
    }

    case '/vitamins': {
      const nutrients = await getTodayNutrients(user.id);
      if (Object.keys(nutrients).length === 0) {
        await sendMessage(chatId, await getMsg('msg_vitamins_empty'), await mainMenu());
      } else {
        const summary = formatVitaminSummary(nutrients, user.sex);
        await sendMessage(chatId, summary + vitaminDisclaimer(), await mainMenu());
      }
      break;
    }

    case '/mealplan': {
      const { askMealPlanPeriod } = await import('./meal-plan.js');
      await askMealPlanPeriod(user, chatId);
      break;
    }

    case '/recipes': {
      const { askRecipeOptions } = await import('../services/recipe-recommender.js');
      await askRecipeOptions(user, chatId);
      break;
    }

    case '/deepcheck': {
      if (!canUseFeature(user, 'deepcheck')) {
        await sendMessage(chatId, await featureLocked('deepcheck'), subscriptionInfo());
        return;
      }
      const { askDeepcheckType } = await import('./deep-consult.js');
      await askDeepcheckType(user, chatId);
      break;
    }

    case '/lab':
      if (!canUseFeature(user, 'lab')) {
        await sendMessage(chatId, await featureLocked('lab'), subscriptionInfo());
        return;
      }
      await sendMessage(chatId, await getMsg('msg_send_lab_command'));
      await setContextState(user.id, 'awaiting_lab');
      break;

    case '/subscribe': {
      const sub = getSubscriptionStatus(user);
      if (sub === 'trial' || sub === 'premium') {
        const daysLeft = getTrialDaysRemaining(user);
        await sendMessage(chatId, `У тебя полный доступ${daysLeft ? ` (осталось ${daysLeft} дней)` : ''}. Пользуйся на здоровье!`, await mainMenu());
      } else {
        const used = (user as any).free_analyses_used || 0;
        const remaining = Math.max(0, 5 - used);
        await sendMessage(chatId, [
          'Поделись номером телефона — и получи полный бесплатный доступ:',
          '',
          '- Безлимитные фото-анализы еды',
          '- Рецепты под твои дефициты',
          '- Планы питания',
          '- Глубокие AI-консультации',
          '- Разбор анализов крови',
          '- Витаминный трекер',
          remaining > 0 ? `\nОсталось ${remaining} бесплатных анализов. После этого — только с номером.` : '\nБесплатные анализы закончились.',
        ].join('\n'));
        const { sendContactRequest: scr } = await import('../max/api.js');
        await scr(chatId, 'Нажми кнопку — это быстро и безопасно:');
      }
      break;
    }

    case '/promo': {
      const code = command.split(' ').slice(1).join(' ').trim();
      if (!code) {
        await sendMessage(chatId, await getMsg('msg_promo_prompt'));
        return;
      }
      const result = await activatePromoCode(user.id, code);
      await sendMessage(chatId, result.message, await mainMenu());
      break;
    }

    case '/water': {
      // Atomic increment to avoid race conditions under concurrent requests
      let newGlasses: number;
      try {
        const { data, error } = await supabase.rpc('increment_water', { user_uuid: user.id });
        if (error) throw error;
        newGlasses = data;
      } catch {
        // Fallback: non-atomic increment if RPC not available
        newGlasses = ((user as any).water_glasses || 0) + 1;
        await updateUser(user.id, { water_glasses: newGlasses } as any);
      }
      // G-5: Water balance calculator by weight
      const weightKg = user.weight_kg || 70;
      const waterNormMl = Math.round(weightKg * 30);
      const waterNormGlasses = Math.ceil(waterNormMl / 250);
      const icon = newGlasses >= waterNormGlasses
        ? `Отлично! Норма ${waterNormGlasses} стаканов выполнена!`
        : `${newGlasses}/${waterNormGlasses} стаканов (норма ${waterNormMl} мл для ${weightKg} кг)`;
      await sendMessage(chatId, `Стакан воды записан! ${icon}`, await mainMenu());
      break;
    }

    case '/reminders': {
      // D-4: Toggle reminders
      await sendMessage(chatId, 'Настройки напоминаний:', [
        [
          { type: 'callback', text: 'Утренние: вкл/выкл', payload: 'toggle_morning' },
          { type: 'callback', text: 'Вечерние: вкл/выкл', payload: 'toggle_evening' },
        ],
        [
          { type: 'callback', text: 'Отключить все', payload: 'reminders_off' },
          { type: 'callback', text: 'Включить все', payload: 'reminders_on' },
        ],
      ]);
      break;
    }

    case '/allergy': {
      // G-2: Manage allergies
      const args = command.split(' ').slice(1).join(' ').trim();
      if (!args) {
        const current = user.allergies?.length ? user.allergies.join(', ') : 'не указаны';
        await sendMessage(chatId, `Текущие аллергии: ${current}\n\nДобавить: /allergy лактоза, глютен\nОчистить: /allergy нет`, await mainMenu());
        return;
      }
      if (args.toLowerCase() === 'нет' || args.toLowerCase() === 'очистить') {
        await updateUser(user.id, { allergies: [] } as any);
        await sendMessage(chatId, 'Список аллергий очищен.', await mainMenu());
      } else {
        const newAllergies = args.split(/[,;]/).map(a => a.trim()).filter(Boolean);
        const merged = [...new Set([...(user.allergies || []), ...newAllergies])];
        await updateUser(user.id, { allergies: merged } as any);
        await sendMessage(chatId, `Аллергии обновлены: ${merged.join(', ')}`, await mainMenu());
      }
      break;
    }

    case '/stats': {
      // Personal lifetime stats
      const { data: logsAll } = await import('../db/supabase.js').then(m => m.supabase
        .from('nutri_food_logs')
        .select('calories, protein, fat, carbs, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('confirmed', true));
      const totalLogs = logsAll?.length || 0;
      const totalCalAll = (logsAll || []).reduce((s: number, l: any) => s + (l.calories || 0), 0);
      const avgCalAll = totalLogs > 0 ? Math.round(totalCalAll / totalLogs) : 0;
      const daysActive = new Set((logsAll || []).map((l: any) => l.created_at?.split?.('T')?.[0])).size || 0;
      const streak = user.streak_days || 0;
      const sub = getSubscriptionStatus(user);
      const subLabel = { free: 'Бесплатный', trial: 'Пробный', premium: 'Premium' }[sub];

      await sendMessage(chatId, [
        `📊 Твоя статистика, ${user.name || 'друг'}:`,
        '',
        `📝 Всего записей: ${totalLogs}`,
        `📅 Дней с записями: ${daysActive}`,
        `🔥 Текущий streak: ${streak} дн.`,
        `⚡ Среднее: ${avgCalAll} ккал/приём`,
        `💰 Подписка: ${subLabel}`,
        totalLogs > 0 ? `\n🏆 Всего калорий: ${totalCalAll} ккал` : '',
      ].filter(Boolean).join('\n'), await mainMenu());
      break;
    }

    case '/invite': {
      // H-3: Referral system
      const link = `https://max.ru/moonvit_bot?startapp=ref_${user.max_user_id}`;
      const refStats = await getReferralStats(user.id);
      const lvl = refStats.level;
      await sendMessage(chatId, [
        '\u{1F381} Пригласи друга в Moonvit!',
        '',
        `Твоя ссылка: ${link}`,
        '',
        `Уровень: ${lvl.name} | ${lvl.reward}`,
        lvl.next > 0 ? `До следующего уровня: ${lvl.next} приглашений` : '',
        '',
        refStats.total > 0 ? `Приглашено: ${refStats.total} | Активировано: ${refStats.activated}` : 'Пока никого не пригласил \u{2014} поделись ссылкой!',
      ].filter(Boolean).join('\n'), await mainMenu());
      break;
    }

    case '/editprofile': {
      if (!user.onboarding_completed) {
        await sendMessage(chatId, await getMsg('msg_fill_profile_first'));
        return;
      }
      await sendMessage(chatId, 'Что изменить?', [
        [
          { type: 'callback', text: '📝 Имя', payload: 'edit_name' },
          { type: 'callback', text: '👤 Пол', payload: 'edit_sex' },
        ],
        [
          { type: 'callback', text: '🎂 Возраст', payload: 'edit_birth' },
          { type: 'callback', text: '📏 Рост', payload: 'edit_height' },
        ],
        [
          { type: 'callback', text: '⚖️ Вес', payload: 'edit_weight' },
          { type: 'callback', text: '🎯 Цель', payload: 'edit_goal' },
        ],
        [
          { type: 'callback', text: '✍️ Цель текстом', payload: 'edit_goal_text' },
        ],
      ]);
      break;
    }

    case '/delfood': {
      const todayLogs = await getTodayLogs(user.id);
      if (!todayLogs.length) {
        await sendMessage(chatId, await getMsg('msg_no_today_records'), await mainMenu());
        return;
      }
      const numArg = command.split(' ')[1];
      const num = numArg ? parseInt(numArg) : NaN;
      if (!num || num < 1 || num > todayLogs.length) {
        // Show list with delete buttons
        const items = todayLogs.map((l, i) => `${i + 1}. ${l.description || 'Без описания'} — ${l.calories || '?'} ккал`);
        await sendMessage(chatId, `Какую запись удалить?\n\n${items.join('\n')}`,
          todayLogs.map((l, i) => [{ type: 'callback' as const, text: `🗑️ ${i + 1}. ${(l.description || '').slice(0, 25)}`, payload: `delfood_${i}` }])
        );
        return;
      }
      const logToDelete = todayLogs[num - 1];
      const { deleteFoodLog } = await import('../db/food-logs.js');
      await deleteFoodLog(logToDelete.id, user.id);
      await sendMessage(chatId, `Запись #${num} удалена: ${logToDelete.description || 'без описания'}`, await mainMenu());
      break;
    }

    case '/addfood': {
      // Add food retroactively — text description analyzed by AI
      const foodText = command.slice('/addfood '.length).trim();
      if (!foodText) {
        await setContextState(user.id, 'awaiting_food_text');
        await sendMessage(chatId, await getMsg('msg_addfood_prompt'));
        return;
      }
      // If text provided inline, analyze it
      await setContextState(user.id, 'idle');
      const { handleFoodText } = await import('./food-text.js');
      await handleFoodText(user, chatId, foodText);
      break;
    }

    case '/help': {
      const helpText = `Что я умею:\n\n📸 Отправь фото еды — определю КБЖУ\n✍️ Напиши "овсянка 200г" — посчитаю\n🎙 Отправь голосовое — тоже считаю\n\n🔥 /today — итоги дня\n📊 /stats — статистика за неделю\n👤 /profile — твой профиль\n💧 /water — выпить стакан воды\n\nAI-функции:\n🔬 /deepcheck — глубокая консультация\n👨‍🍳 /recipes — подбор рецептов\n📅 /mealplan — план питания\n🍽 /restaurant — анализ меню ресторана\n🏥 /lab — анализ анализов крови\n\n📱 Открой мини-приложение для удобного интерфейса!`;

      await sendMessage(chatId, helpText, [
        [
          { type: 'callback', text: '📸 Записать еду', payload: 'action_addfood' },
          { type: 'callback', text: '📊 Итоги дня', payload: 'action_today' },
        ],
        [
          { type: 'callback', text: '🔬 Консультация', payload: 'action_deepcheck' },
          { type: 'callback', text: '👨‍🍳 Рецепты', payload: 'action_recipes' },
        ],
        [
          { type: 'callback', text: '👤 Профиль', payload: 'action_profile' },
          { type: 'callback', text: '💧 Вода', payload: 'action_water' },
        ],
      ]);
      break;
    }

    case '/reset':
      await deleteUserMessages(user.id);
      await sendMessage(chatId, await getMsg('msg_history_cleared'), await mainMenu());
      break;

    case '/deletedata':
      await sendMessage(chatId, await getMsg('msg_delete_confirm'), [
        [{ type: 'callback', text: 'Да, удалить всё', payload: 'confirm_delete' }],
        [{ type: 'callback', text: 'Отмена', payload: 'cancel_delete' }],
      ]);
      break;

    case '/webapp':
    case '/app': {
      await sendMessage(chatId, await getMsg('msg_webapp_full'), [
        [{ type: 'callback', text: '📱 Открыть приложение', payload: 'action_open_webapp' }],
        ...(await mainMenu()),
      ]);
      break;
    }

    default:
      await sendMessage(chatId, await getMsg('msg_unknown_command'));
  }
}
