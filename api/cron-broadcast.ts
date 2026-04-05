// D-5: Рассылки полезного контента (2-3 раза в неделю)
// Обновлено: использует банк контента вместо AI-генерации (экономия API)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../src/db/supabase.js';
import { sendMessage, sendMessageWithImage, uploadImage, downloadImage } from '../src/max/api.js';
import { chatCompletion } from '../src/ai/client.js';
import { generateVitaminFact, generateHealthTip, generateRecipeTeaser, generateMoonvitSpotlight, generateSeasonalAdvice, logSentContent } from '../src/services/content-generator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Admin or cron trigger
  const triggeredBy = (req.query.text || req.query.topic) ? 'admin' : 'cron';
  const audienceFilter = (req.query.audience as string) || 'all';

  // Image support: download external image → upload to MAX
  const imageUrlParam = (req.query.image_url as string)?.trim();
  let imageToken: string | null = null;
  if (imageUrlParam) {
    try {
      const imgBuf = await downloadImage(imageUrlParam);
      imageToken = await uploadImage(imgBuf, 'broadcast.png');
    } catch (err: any) {
      console.error('Broadcast image upload error:', err?.message);
    }
  }

  try {
    // Use content bank instead of AI generation (saves API cost)
    // Fallback to AI for admin-triggered custom topics
    const customText = (req.query.text as string)?.trim();
    const customTopic = (req.query.topic as string)?.trim();
    let content: string;
    let contentId: string;
    let topic: string;

    if (customText) {
      // Direct text from admin UI — send as-is, no AI
      content = customText;
      contentId = `manual_${Date.now()}`;
      topic = 'manual';
    } else if (customTopic) {
      // Admin-triggered with topic — AI generates text
      const { text } = await chatCompletion([
        {
          role: 'system',
          content: 'Ты AI-нутрициолог NutriBot от Moonvit. Стиль: дружеский, дерзкий но полезный. Напиши короткий пост (3-5 предложений) на тему ниже. В конце: "Отправь фото еды — я посчитаю калории!"',
        },
        { role: 'user', content: `Тема: ${customTopic}` },
      ], 'gpt-4.1-nano');
      content = text;
      contentId = `custom_${Date.now()}`;
      topic = customTopic;
    } else {
      // Automated: pick from content bank (no API call!)
      const dayOfWeek = new Date().getDay();
      const contentItem = dayOfWeek % 3 === 0
        ? await generateRecipeTeaser()
        : dayOfWeek % 5 === 0
        ? await generateMoonvitSpotlight()
        : dayOfWeek % 2 === 0
        ? await generateHealthTip()
        : await generateVitaminFact();

      content = contentItem.text;
      contentId = contentItem.id;
      topic = contentItem.tags[0] || 'general';
    }

    // Get users with broadcasts enabled + audience filter
    let usersQuery = supabase
      .from('nutri_users')
      .select('max_chat_id, nutri_user_preferences!left(content_broadcasts)')
      .eq('onboarding_completed', true)
      .not('max_chat_id', 'is', null);

    if (audienceFilter === 'active_week') {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      usersQuery = usersQuery.gte('last_active_at', weekAgo);
    } else if (audienceFilter === 'trial') {
      usersQuery = usersQuery.eq('subscription_type', 'trial');
    } else if (audienceFilter === 'premium') {
      usersQuery = usersQuery.eq('subscription_type', 'premium');
    }

    const { data: users } = await usersQuery;

    if (!users?.length) return res.status(200).json({ ok: true, sent: 0 });

    let sent = 0;
    for (const u of users) {
      try {
        const prefs = (u as any).nutri_user_preferences;
        if (prefs && prefs.content_broadcasts === false) continue;

        const broadcastText = content + '\n\n_Отписаться: /reminders_';
        if (imageToken) {
          await sendMessageWithImage(u.max_chat_id, broadcastText, imageToken);
        } else {
          await sendMessage(u.max_chat_id, broadcastText);
        }
        sent++;
        await new Promise(r => setTimeout(r, 100)); // Rate limit
      } catch (err) {
        console.error('Broadcast error:', err);
      }
    }

    // E-3: Log broadcast to DB (non-critical)
    try {
      await supabase.from('nutri_broadcast_log').insert({
        topic,
        content: content.slice(0, 500),
        content_id: contentId,
        sent_count: sent,
        triggered_by: triggeredBy,
      });
      // Track sent content for rotation (don't repeat within 90 days)
      await logSentContent(contentId);
    } catch { /* ignore */ }

    return res.status(200).json({ ok: true, sent, topic });
  } catch (err: any) {
    console.error('Broadcast cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
