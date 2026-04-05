import { config } from '../config.js';
import { getMsg } from '../config/bot-messages.js';

export function truncate(text: string, maxLen = config.limits.messageMaxLength): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

// Split long text into multiple messages (MAX limit 4000 chars)
export function splitMessage(text: string, maxLen = config.limits.messageMaxLength): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      parts.push(remaining);
      break;
    }
    // Try to split at paragraph break
    let splitAt = remaining.lastIndexOf('\n\n', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = remaining.lastIndexOf('. ', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return parts;
}

export function disclaimer(): string {
  return '\n\n_Бот не заменяет консультацию врача или диетолога._';
}

export async function disclaimerAsync(): Promise<string> {
  const text = await getMsg('disclaimer');
  return `\n\n_${text}_`;
}

export function labDisclaimer(): string {
  return '\n\n_Интерпретация носит информационный характер. При серьезных отклонениях обратитесь к врачу._';
}

export async function labDisclaimerAsync(): Promise<string> {
  const text = await getMsg('lab_disclaimer');
  return `\n\n_${text}_`;
}

export function vitaminDisclaimer(): string {
  return '\n\n_Перед приемом БАД проконсультируйтесь со специалистом._';
}

export async function vitaminDisclaimerAsync(): Promise<string> {
  const text = await getMsg('vitamin_disclaimer');
  return `\n\n_${text}_`;
}

export async function subscriptionExpired(): Promise<string> {
  return getMsg('msg_trial_expired');
}

// Emoji progress bar: ██░░░░░░░░ 35%
export function formatProgressBar(current: number, target: number, length = 10): string {
  if (target <= 0) return '░'.repeat(length) + ' 0%';
  const pct = Math.max(0, Math.min(Math.round((current / target) * 100), 100));
  const filled = Math.round((pct / 100) * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const emoji = pct >= 90 ? '✅' : pct >= 50 ? '🟡' : '🔴';
  return `${emoji} ${bar} ${pct}%`;
}

export async function featureLocked(feature: string): Promise<string> {
  const key = `feature_${feature}`;
  return getMsg(key);
}
