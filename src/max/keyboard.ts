import type { MaxInlineButton } from './types.js';
import { getSetting } from '../db/settings.js';

// Dynamic menu from admin panel settings
export async function mainMenu(): Promise<MaxInlineButton[][]> {
  try {
    const config = await getSetting('bot_menu_config');
    if (config) {
      const items: { text: string; payload: string }[] = typeof config === 'string' ? JSON.parse(config) : config;
      const rows: MaxInlineButton[][] = [];
      for (let i = 0; i < items.length; i += 2) {
        const row: MaxInlineButton[] = items.slice(i, i + 2).map(item => ({
          type: 'callback' as const,
          text: item.text,
          payload: item.payload,
        }));
        rows.push(row);
      }
      return rows;
    }
  } catch { /* fallback to default */ }

  return [
    [
      { type: 'callback', text: '📸 Фото еды', payload: 'action_food' },
      { type: 'callback', text: '🍽 Меню ресторана', payload: 'action_restaurant' },
    ],
    [
      { type: 'callback', text: '📊 Дневник', payload: 'action_today' },
      { type: 'callback', text: '📈 Неделя', payload: 'action_week' },
    ],
    [
      { type: 'callback', text: '💧 Вода', payload: 'action_water' },
      { type: 'callback', text: '💊 Витамины', payload: 'action_vitamins' },
    ],
    [
      { type: 'callback', text: '🍳 Рецепты', payload: 'action_recipes' },
      { type: 'callback', text: '📋 План питания', payload: 'action_mealplan' },
    ],
    [
      { type: 'callback', text: '🔬 Deepcheck', payload: 'action_deep' },
      { type: 'callback', text: '🧪 Анализы', payload: 'action_lab' },
    ],
    [
      { type: 'callback', text: '👤 Профиль', payload: 'action_profile' },
      { type: 'callback', text: '⚙️ Ещё', payload: 'action_more' },
    ],
  ];
}

// Submenu "Ещё" — all secondary features
export function moreMenu(): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: '💳 Подписка', payload: 'action_subscribe' },
      { type: 'callback', text: '🎁 Промокод', payload: 'action_promo' },
    ],
    [
      { type: 'callback', text: '🚫 Аллергии', payload: 'action_allergy' },
      { type: 'callback', text: '👥 Пригласить', payload: 'action_invite' },
    ],
    [
      { type: 'callback', text: '🔔 Напоминания', payload: 'action_reminders' },
      { type: 'callback', text: '📱 QR-код', payload: 'action_qr' },
    ],
    [
      { type: 'callback', text: '📊 Статистика', payload: 'action_stats' },
      { type: 'callback', text: '❓ Помощь', payload: 'action_help' },
    ],
    [
      { type: 'callback', text: '◀️ Назад', payload: 'action_menu' },
    ],
  ];
}

export function confirmFood(): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: '✅ Сохранить', payload: 'confirm_food' },
      { type: 'callback', text: '⚖️ Изменить вес', payload: 'edit_weight_food' },
    ],
    [
      { type: 'callback', text: '❌ Отмена', payload: 'cancel_food' },
    ],
  ];
}

// Smart replies after food photo save
export function smartRepliesAfterFood(): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: '📊 Итог дня', payload: 'action_today' },
      { type: 'callback', text: '💊 Витамины', payload: 'action_vitamins' },
    ],
    [
      { type: 'callback', text: '🍳 Рецепт', payload: 'action_recipes' },
      { type: 'callback', text: '💧 Выпить воды', payload: 'action_water' },
    ],
    [
      { type: 'callback', text: '📋 План питания', payload: 'action_mealplan' },
      { type: 'callback', text: '📸 Ещё фото еды', payload: 'action_food' },
    ],
    [
      { type: 'callback', text: '📝 Главное меню', payload: 'action_menu' },
    ],
  ];
}

// Referral invite keyboard
export function inviteKeyboard(link: string): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: '📋 Скопировать ссылку', payload: 'copy_invite' },
    ],
  ];
}

export function onboardingGoal(): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: '📉 Похудеть', payload: 'goal_lose' },
      { type: 'callback', text: '⚖️ Поддержать вес', payload: 'goal_maintain' },
      { type: 'callback', text: '📈 Набрать массу', payload: 'goal_gain' },
    ],
    [
      { type: 'callback', text: '🥗 Здоровое питание', payload: 'goal_healthy' },
      { type: 'callback', text: '💪 Спорт и энергия', payload: 'goal_sport' },
    ],
    [
      { type: 'callback', text: '✍️ Написать свою цель', payload: 'goal_custom' },
    ],
  ];
}

export function onboardingActivity(): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: 'Сидячий', payload: 'activity_sedentary' },
      { type: 'callback', text: 'Легкая', payload: 'activity_light' },
    ],
    [
      { type: 'callback', text: 'Умеренная', payload: 'activity_moderate' },
      { type: 'callback', text: 'Активная', payload: 'activity_active' },
    ],
    [
      { type: 'callback', text: 'Очень активная', payload: 'activity_very_active' },
    ],
  ];
}

export function onboardingSex(): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: '👨 Мужской', payload: 'sex_male' },
      { type: 'callback', text: '👩 Женский', payload: 'sex_female' },
    ],
  ];
}

export function subscriptionInfo(): MaxInlineButton[][] {
  return [
    [
      { type: 'callback', text: '🎁 Ввести QR-код', payload: 'action_qr' },
    ],
  ];
}

export function skipButton(payload: string): MaxInlineButton[][] {
  return [
    [{ type: 'callback', text: '⏭ Пропустить', payload }],
  ];
}
