import OpenAI from 'openai';
import { config } from '../config.js';
import { getSetting } from '../db/settings.js';
import { trackAiMetric } from '../db/ai-metrics.js';

export const openai = new OpenAI({ apiKey: config.openai.apiKey });

export async function chatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model?: string,
  userId?: string,
): Promise<{ text: string; tokens: number }> {
  const actualModel = model || await getSetting('ai_model_chat') || 'gpt-4.1-mini';
  const temperature = parseFloat(await getSetting('config_ai_temperature') || '0.7');
  const maxTokens = parseInt(await getSetting('config_ai_max_completion_tokens') || '2048');
  const topP = parseFloat(await getSetting('config_ai_top_p') || '1.0');
  const frequencyPenalty = parseFloat(await getSetting('config_ai_frequency_penalty') || '0.0');
  const presencePenalty = parseFloat(await getSetting('config_ai_presence_penalty') || '0.0');
  const start = Date.now();
  const res = await openai.chat.completions.create({
    model: actualModel,
    messages,
    max_completion_tokens: maxTokens,
    temperature,
    top_p: topP,
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
  });
  const elapsed = Date.now() - start;
  const tokensIn = res.usage?.prompt_tokens || 0;
  const tokensOut = res.usage?.completion_tokens || 0;

  // J-3: Track AI metrics
  trackAiMetric({
    userId,
    model: actualModel,
    operation: 'chat',
    tokensIn,
    tokensOut,
    responseTimeMs: elapsed,
  });

  return {
    text: res.choices[0]?.message?.content || '',
    tokens: res.usage?.total_tokens || 0,
  };
}

export async function visionAnalysis(
  prompt: string,
  imageUrl: string,
  model?: string,
  userId?: string,
): Promise<{ text: string; tokens: number }> {
  const actualModel = model || await getSetting('ai_model_vision') || 'gpt-4.1';
  const start = Date.now();
  const res = await openai.chat.completions.create({
    model: actualModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
    max_completion_tokens: 2000,
    temperature: 0.3,
  });
  const elapsed = Date.now() - start;
  const tokensIn = res.usage?.prompt_tokens || 0;
  const tokensOut = res.usage?.completion_tokens || 0;

  // J-3: Track AI metrics
  trackAiMetric({
    userId,
    model: actualModel,
    operation: 'vision',
    tokensIn,
    tokensOut,
    responseTimeMs: elapsed,
  });

  return {
    text: res.choices[0]?.message?.content || '',
    tokens: res.usage?.total_tokens || 0,
  };
}
