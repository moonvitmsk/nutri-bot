import { config } from '../config.js';
import type { MaxInlineButton, MaxWebhookSubscription } from './types.js';

const API = config.max.apiUrl;
const headers = () => ({
  'Authorization': config.max.token,
  'Content-Type': 'application/json',
});

async function maxFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...opts, headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MAX API ${path}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// ТЗ формат: POST /messages?chat_id={id}, body = {text, attachments, format}
export async function sendMessage(chatId: number, text: string, keyboard?: MaxInlineButton[][]) {
  const trimmed = text.slice(0, config.limits.messageMaxLength);
  const body: Record<string, unknown> = { text: trimmed, format: 'markdown' };

  if (keyboard && keyboard.length > 0) {
    body.attachments = [{
      type: 'inline_keyboard',
      payload: { buttons: keyboard },
    }];
  }
  return maxFetch(`/messages?chat_id=${chatId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Кнопка "Поделиться контактом" для сбора телефона
export async function sendContactRequest(chatId: number, text: string) {
  const body = {
    text,
    format: 'markdown',
    attachments: [{
      type: 'inline_keyboard',
      payload: {
        buttons: [[
          { type: 'request_contact', text: 'Поделиться номером телефона' },
        ]],
      },
    }],
  };
  return maxFetch(`/messages?chat_id=${chatId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Upload image to MAX and get token for attaching to messages
export async function uploadImage(imageBuffer: Buffer, filename = 'report.png'): Promise<string> {
  // Step 1: Request upload URL from MAX API
  const uploadInfo = await maxFetch<{ url: string; token: string }>('/uploads?type=image', {
    method: 'POST',
  });
  console.log('UPLOAD_STEP1: got upload URL, token:', uploadInfo.token ? 'yes' : 'no');

  // Step 2: Upload the file via native FormData (reliable multipart)
  const contentType = filename.endsWith('.gif') ? 'image/gif' : 'image/png';
  const blob = new Blob([imageBuffer], { type: contentType });
  const formData = new FormData();
  formData.append('data', blob, filename);

  const uploadRes = await fetch(uploadInfo.url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('UPLOAD_STEP2_ERROR:', uploadRes.status, errText);
    throw new Error(`Image upload failed: ${uploadRes.status} ${errText}`);
  }

  const result = await uploadRes.json() as any;
  // MAX API returns: {photos: {[key]: {token: "..."}}}
  let token = result.token || '';
  if (!token && result.photos) {
    const firstKey = Object.keys(result.photos)[0];
    if (firstKey) token = result.photos[firstKey].token || '';
  }
  if (!token) token = uploadInfo.token || '';
  console.log('UPLOAD_STEP2: upload done, token:', token ? token.slice(0, 20) + '...' : 'EMPTY');

  if (!token) {
    throw new Error('Upload succeeded but no token received');
  }

  // Step 3: Pause — MAX API needs time to process the upload
  await new Promise(r => setTimeout(r, 500));

  return token;
}

// Send a message with an attached image (by token from uploadImage)
export async function sendMessageWithImage(
  chatId: number,
  text: string,
  imageToken: string,
  keyboard?: MaxInlineButton[][],
) {
  const trimmed = text.slice(0, config.limits.messageMaxLength);
  const attachments: any[] = [
    { type: 'image', payload: { token: imageToken } },
  ];

  if (keyboard && keyboard.length > 0) {
    attachments.push({
      type: 'inline_keyboard',
      payload: { buttons: keyboard },
    });
  }

  return maxFetch(`/messages?chat_id=${chatId}`, {
    method: 'POST',
    body: JSON.stringify({ text: trimmed, format: 'markdown', attachments }),
  });
}

export async function answerCallback(callbackId: string, notification?: string) {
  return maxFetch('/answers', {
    method: 'POST',
    body: JSON.stringify({
      callback_id: callbackId,
      ...(notification ? { notification } : {}),
    }),
  });
}

export async function subscribeWebhook(url: string) {
  const body: MaxWebhookSubscription = {
    url,
    update_types: ['message_created', 'message_callback', 'bot_started'],
  };
  return maxFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getImageUrl(token: string): Promise<string> {
  const data = await maxFetch<{ url: string }>(`/uploads?token=${token}`);
  return data.url;
}

export async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Register bot commands — these appear in the menu button in MAX messenger */
export async function setBotCommands() {
  const commands = [
    { name: 'start', description: 'Главное меню' },
    { name: 'profile', description: 'Мой профиль' },
    { name: 'editprofile', description: 'Изменить профиль' },
    { name: 'today', description: 'Дневник за сегодня' },
    { name: 'week', description: 'Статистика за неделю' },
    { name: 'water', description: 'Записать стакан воды' },
    { name: 'mealplan', description: 'План питания' },
    { name: 'vitamins', description: 'Витаминный баланс за день' },
    { name: 'recipes', description: 'Рецепты под профиль' },
    { name: 'deepcheck', description: 'Глубокая консультация' },
    { name: 'lab', description: 'Разбор анализов' },
    { name: 'stats', description: 'Личная статистика' },
    { name: 'subscribe', description: 'Подписка и тарифы' },
    { name: 'help', description: 'Все команды' },
  ];
  try {
    await maxFetch('/me', {
      method: 'PATCH',
      body: JSON.stringify({ commands }),
    });
    console.log('Bot commands registered:', commands.length);
  } catch (err: any) {
    console.error('Failed to register bot commands:', err?.message);
  }
}
