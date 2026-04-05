import { getRecentMessages, getMessageCount, saveMessage } from '../db/messages.js';
import { chatCompletion } from './client.js';
import { config } from '../config.js';
import { getSetting } from '../db/settings.js';

export async function buildChatHistory(userId: string): Promise<{ role: 'user' | 'assistant' | 'system'; content: string }[]> {
  const contextSize = parseInt(await getSetting('config_context_messages') || String(config.limits.contextMessages));
  const messages = await getRecentMessages(userId, contextSize);
  return messages.map(m => ({ role: m.role, content: m.content }));
}

export async function maybeSummarize(userId: string): Promise<void> {
  const count = await getMessageCount(userId);
  const summaryEvery = parseInt(await getSetting('config_context_summary_every') || String(config.limits.contextSummaryEvery));
  if (count % summaryEvery !== 0 || count === 0) return;

  const messages = await getRecentMessages(userId, 40);
  const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const { text: summary } = await chatCompletion([
    { role: 'system', content: (await import('../prompts/agents.js')).CONTEXT_SUMMARY_PROMPT },
    { role: 'user', content: text },
  ]);

  await saveMessage(userId, 'system', `[Резюме предыдущего диалога]: ${summary}`);
}
