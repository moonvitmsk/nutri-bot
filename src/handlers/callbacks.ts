import type { NutriUser, MaxCallback } from '../max/types.js';
import { answerCallback, sendMessage } from '../max/api.js';
import { sanitizeCallbackData } from '../utils/sanitize.js';
import { setContextState, deleteUserData, updateStreak, updateUser } from '../db/users.js';
import { confirmFoodLog, getLastUnconfirmed } from '../db/food-logs.js';
import { canUseFeature } from '../db/subscriptions.js';
import { mainMenu, subscriptionInfo, moreMenu } from '../max/keyboard.js';
import { featureLocked } from '../utils/formatter.js';
import { handleOnboardingCallback } from './onboarding.js';
import { onboardingSex, onboardingGoal } from '../max/keyboard.js';
import { handleDeepConsult } from './deep-consult.js';
import { handleCommand } from './commands.js';
import { supabase } from '../db/supabase.js';
import { getMsg } from '../config/bot-messages.js';

export async function handleCallback(user: NutriUser, cb: MaxCallback) {
  const payload = sanitizeCallbackData(cb.payload);
  const chatId = user.max_chat_id || user.max_user_id;

  await answerCallback(cb.callback_id).catch(() => {});

  // Onboarding callbacks (consent, sex, goal, activity, profile mode, name)
  const onboardingPayloads = [
    'consent_yes', 'consent_no',
    'profile_full', 'profile_short', 'profile_skip',
    'name_confirm', 'name_change',
    'skip_to_profile',
  ];
  const isEditingSex = user.context_state === 'editing_sex' && payload.startsWith('sex_');
  const isEditingGoal = user.context_state === 'editing_goal' && payload.startsWith('goal_');
  if (onboardingPayloads.includes(payload) ||
      (!user.onboarding_completed && (payload.startsWith('sex_') || payload.startsWith('goal_'))) ||
      isEditingSex || isEditingGoal) {
    await handleOnboardingCallback(user, payload, chatId);
    return;
  }

  switch (payload) {
    case 'action_menu':
      await sendMessage(chatId, await getMsg('msg_choose_action'), await mainMenu());
      return;

    case 'action_food':
      if (!canUseFeature(user, 'photo')) {
        await sendMessage(chatId, await featureLocked('photo'), subscriptionInfo());
        return;
      }
      // Auto-complete onboarding if user chose food over profile
      if (!user.onboarding_completed) {
        await updateUser(user.id, {
          name: user.name || 'друг',
          goal: user.goal || 'maintain',
          activity_level: user.activity_level || 'moderate',
          daily_calories: user.daily_calories || 2000,
          daily_protein: user.daily_protein || 100,
          daily_fat: user.daily_fat || 70,
          daily_carbs: user.daily_carbs || 250,
          onboarding_completed: true,
          onboarding_step: 8,
        } as any);
      }
      await sendMessage(chatId, await getMsg('msg_send_food_photo'));
      await setContextState(user.id, 'idle');
      break;

    case 'action_deep': {
      if (!canUseFeature(user, 'deepcheck')) {
        await sendMessage(chatId, await featureLocked('deepcheck'), subscriptionInfo());
        return;
      }
      const { askDeepcheckType } = await import('./deep-consult.js');
      await askDeepcheckType(user, chatId);
      break;
    }

    case 'deep_diet':
    case 'deep_vitamins':
    case 'deep_lab':
    case 'deep_progress':
    case 'deep_full': {
      if (!canUseFeature(user, 'deepcheck')) {
        await sendMessage(chatId, await featureLocked('deepcheck'), subscriptionInfo());
        return;
      }
      const focusMap: Record<string, string> = {
        deep_diet: 'анализ рациона и баланса КБЖУ',
        deep_vitamins: 'витамины, минералы и дефициты',
        deep_lab: 'интерпретация анализов крови',
        deep_progress: 'оценка прогресса к цели',
        deep_full: '',
      };
      await sendMessage(chatId, await getMsg('msg_deep_consult_start'));
      await handleDeepConsult(user, chatId, focusMap[payload] || undefined);
      break;
    }

    case 'deep_custom':
      if (!canUseFeature(user, 'deepcheck')) {
        await sendMessage(chatId, await featureLocked('deepcheck'), subscriptionInfo());
        return;
      }
      await setContextState(user.id, 'awaiting_deepcheck_request');
      await sendMessage(chatId, await getMsg('msg_deep_custom_prompt'));
      break;

    case 'action_lab':
      await sendMessage(chatId, await getMsg('msg_send_lab_photo'));
      await setContextState(user.id, 'awaiting_lab');
      break;

    case 'action_restaurant':
      await sendMessage(chatId, await getMsg('msg_restaurant_prompt'), [
        [{ type: 'callback', text: '❌ Отмена', payload: 'cancel_food' }],
      ]);
      await setContextState(user.id, 'awaiting_restaurant_menu');
      break;

    case 'action_vitamins':
      await handleCommand(user, '/vitamins', chatId);
      break;

    case 'action_water':
      await handleCommand(user, '/water', chatId);
      break;

    case 'action_qr':
      await sendMessage(chatId, await getMsg('msg_send_qr_photo'));
      await setContextState(user.id, 'awaiting_qr');
      break;

    case 'action_today':
      await handleCommand(user, '/today', chatId);
      break;

    case 'action_week':
      await handleCommand(user, '/week', chatId);
      break;

    case 'action_profile':
      await handleCommand(user, '/profile', chatId);
      break;

    case 'action_editprofile':
      await handleCommand(user, '/editprofile', chatId);
      break;

    case 'action_more':
      await sendMessage(chatId, await getMsg('msg_more_functions'), moreMenu());
      break;

    case 'action_subscribe':
      await handleCommand(user, '/subscribe', chatId);
      break;

    case 'action_promo':
      await sendMessage(chatId, await getMsg('msg_promo_prompt'));
      break;

    case 'action_allergy':
      await handleCommand(user, '/allergy', chatId);
      break;

    case 'action_invite':
      await handleCommand(user, '/invite', chatId);
      break;

    case 'action_reminders':
      await handleCommand(user, '/reminders', chatId);
      break;

    case 'action_stats':
      await handleCommand(user, '/stats', chatId);
      break;

    case 'action_help':
      await handleCommand(user, '/help', chatId);
      break;

    case 'action_addfood':
      await handleCommand(user, '/addfood', chatId);
      break;

    case 'action_deepcheck':
      await handleCommand(user, '/deepcheck', chatId);
      break;

    case 'action_open_webapp':
      await sendMessage(chatId, await getMsg('msg_webapp_open'), await mainMenu());
      break;

    case 'action_delfood':
      await handleCommand(user, '/delfood', chatId);
      break;

    case 'edit_name':
      await setContextState(user.id, 'editing_name');
      await sendMessage(chatId, await getMsg('msg_edit_name_prompt'));
      break;

    case 'edit_sex':
      await updateUser(user.id, { context_state: 'editing_sex' } as any);
      await sendMessage(chatId, 'Выбери пол:', onboardingSex());
      break;

    case 'edit_birth':
      await setContextState(user.id, 'editing_birth');
      await sendMessage(chatId, await getMsg('msg_edit_birth_prompt'));
      break;

    case 'edit_height':
      await setContextState(user.id, 'editing_height');
      await sendMessage(chatId, await getMsg('msg_edit_height_prompt'));
      break;

    case 'edit_weight':
      await setContextState(user.id, 'editing_weight');
      await sendMessage(chatId, await getMsg('msg_edit_weight_prompt'));
      break;

    case 'edit_goal':
      await updateUser(user.id, { context_state: 'editing_goal' } as any);
      await sendMessage(chatId, await getMsg('msg_edit_goal_prompt'), onboardingGoal());
      break;

    case 'edit_goal_text':
      await setContextState(user.id, 'editing_goal_text');
      await sendMessage(chatId, await getMsg('msg_edit_goal_text_prompt'));
      break;

    case 'confirm_food': {
      const { smartRepliesAfterFood } = await import('../max/keyboard.js');
      const log = await getLastUnconfirmed(user.id);
      if (log) {
        await confirmFoodLog(log.id);
        const streakMsg = await updateStreak(user);
        const reply = [
          streakMsg ? `Записано в дневник!\n\n${streakMsg}` : 'Записано в дневник!',
          '',
          '_Напиши что угодно — задай вопрос про питание, продукт или витамин_',
        ].join('\n');
        await sendMessage(chatId, reply, smartRepliesAfterFood());
      } else {
        await sendMessage(chatId, await getMsg('msg_nothing_to_save'), await mainMenu());
      }
      break;
    }

    case 'edit_weight_food': {
      const log = await getLastUnconfirmed(user.id);
      if (log) {
        const analysis = log.ai_analysis as any;
        const items = analysis?.items || [];
        if (items.length === 0) {
          await sendMessage(chatId, await getMsg('msg_nothing_to_edit'), await mainMenu());
          break;
        }
        const lines = items.map((item: any, i: number) =>
          `${i + 1}. ${item.name} — ${item.portion_g}г`
        );
        await setContextState(user.id, 'awaiting_weight_correction');
        await sendMessage(chatId, [
          'Текущие веса:',
          ...lines,
          '',
          items.length === 1
            ? 'Напиши новый вес в граммах (например: 300)'
            : 'Напиши новые веса (например: 1=300 2=150)\nИли один вес для всех: 300',
        ].join('\n'));
      } else {
        await sendMessage(chatId, 'Нечего редактировать.', await mainMenu());
      }
      break;
    }

    case 'action_recipes': {
      const { askRecipeOptions } = await import('../services/recipe-recommender.js');
      await askRecipeOptions(user, chatId);
      break;
    }

    case 'recipe_breakfast':
    case 'recipe_lunch':
    case 'recipe_dinner':
    case 'recipe_snack':
    case 'recipe_any': {
      const mealMap: Record<string, string> = {
        recipe_breakfast: 'завтрак',
        recipe_lunch: 'обед',
        recipe_dinner: 'ужин',
        recipe_snack: 'перекус',
        recipe_any: '',
      };
      const { handleRecipes: doRecipes } = await import('../services/recipe-recommender.js');
      await doRecipes(user, chatId, mealMap[payload] ? `Приём пищи: ${mealMap[payload]}` : undefined);
      break;
    }

    case 'recipe_photo':
      await setContextState(user.id, 'awaiting_recipe_photo');
      await sendMessage(chatId, await getMsg('msg_recipe_photo_prompt'));
      break;

    case 'recipe_custom':
      await setContextState(user.id, 'awaiting_recipe_request');
      await sendMessage(chatId, await getMsg('msg_recipe_custom_prompt'));
      break;

    case 'action_mealplan': {
      const { askMealPlanPeriod } = await import('./meal-plan.js');
      await askMealPlanPeriod(user, chatId);
      break;
    }

    case 'mealplan_today':
    case 'mealplan_week':
    case 'mealplan_month': {
      const period = payload.replace('mealplan_', '');
      const { handleMealPlan: doMealPlan } = await import('./meal-plan.js');
      await doMealPlan(user, chatId, period);
      break;
    }

    case 'mealplan_custom':
      await setContextState(user.id, 'awaiting_mealplan_request');
      await sendMessage(chatId, await getMsg('msg_mealplan_custom_prompt'));
      break;

    case 'cancel_food':
      await setContextState(user.id, 'idle');
      await sendMessage(chatId, await getMsg('msg_cancelled'), await mainMenu());
      break;

    case 'confirm_delete':
      await deleteUserData(user.id);
      await sendMessage(chatId, await getMsg('msg_data_deleted'));
      break;

    case 'cancel_delete':
      await sendMessage(chatId, await getMsg('msg_delete_cancelled'), await mainMenu());
      break;

    // D-4: Reminder toggles
    case 'toggle_morning':
    case 'toggle_evening':
    case 'reminders_off':
    case 'reminders_on': {
      const field = payload === 'toggle_morning' ? 'morning_reminder'
        : payload === 'toggle_evening' ? 'evening_reminder'
        : null;
      // Upsert preferences
      const { data: prefs } = await supabase
        .from('nutri_user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (!prefs) {
        await supabase.from('nutri_user_preferences').insert({ user_id: user.id });
      }
      if (field) {
        const current = prefs?.[field] ?? true;
        await supabase.from('nutri_user_preferences')
          .update({ [field]: !current, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        await sendMessage(chatId, `${field === 'morning_reminder' ? 'Утренние' : 'Вечерние'} напоминания: ${!current ? 'включены' : 'выключены'}`, await mainMenu());
      } else if (payload === 'reminders_off') {
        await supabase.from('nutri_user_preferences')
          .update({ morning_reminder: false, evening_reminder: false, content_broadcasts: false, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        await sendMessage(chatId, 'Все напоминания отключены. /reminders чтобы включить.', await mainMenu());
      } else {
        await supabase.from('nutri_user_preferences')
          .update({ morning_reminder: true, evening_reminder: true, content_broadcasts: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        await sendMessage(chatId, 'Все напоминания включены!', await mainMenu());
      }
      break;
    }

    default:
      // Dynamic callbacks: delfood_N
      if (payload.startsWith('delfood_')) {
        const idx = parseInt(payload.replace('delfood_', ''));
        const { getTodayLogs: getTL, deleteFoodLog } = await import('../db/food-logs.js');
        const todayLogs = await getTL(user.id);
        if (idx >= 0 && idx < todayLogs.length) {
          const logToDel = todayLogs[idx];
          await deleteFoodLog(logToDel.id, user.id);
          await sendMessage(chatId, `Удалено: ${logToDel.description || 'запись'}`, await mainMenu());
        } else {
          await sendMessage(chatId, await getMsg('msg_record_not_found'), await mainMenu());
        }
        return;
      }
      await sendMessage(chatId, 'Выбери действие:', await mainMenu());
  }
}
