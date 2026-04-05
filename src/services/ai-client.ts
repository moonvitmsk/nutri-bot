// Unified AI client with Responses API support and Chat Completions fallback
import OpenAI from 'openai';
import { config } from '../config.js';
import { getSetting } from '../db/settings.js';
import { trackAiMetric } from '../db/ai-metrics.js';
import { getModelConfig, MODEL_CONFIG } from '../config/models.js';

const client = new OpenAI({ apiKey: config.openai.apiKey });

export interface AICallOptions {
  model: string;
  systemPrompt: string;
  userMessage: string | Array<{ type: string; [key: string]: any }>;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  jsonSchema?: { name: string; strict: boolean; schema: object };
  userId?: string;
  operation?: string;
}

export interface AIResponse {
  text: string;
  parsed?: any;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
  model: string;
}

/**
 * Main AI call function.
 * Tries Chat Completions (stable) — Responses API can be enabled when stable.
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const start = Date.now();

  // Use Chat Completions (reliable, tested)
  return callChatCompletions(options, start);
}

async function callChatCompletions(options: AICallOptions, startTime: number): Promise<AIResponse> {
  const messages: any[] = [
    { role: 'system', content: options.systemPrompt },
  ];

  if (typeof options.userMessage === 'string') {
    messages.push({ role: 'user', content: options.userMessage });
  } else {
    messages.push({ role: 'user', content: options.userMessage });
  }

  const params: any = {
    model: options.model,
    messages,
    max_completion_tokens: options.maxTokens || 1500,
    temperature: options.temperature ?? 0.7,
  };

  if (options.responseFormat === 'json') {
    params.response_format = { type: 'json_object' };
  }

  const res = await client.chat.completions.create(params);
  const elapsed = Date.now() - startTime;
  const tokensIn = res.usage?.prompt_tokens || 0;
  const tokensOut = res.usage?.completion_tokens || 0;
  const text = res.choices[0]?.message?.content || '';

  // Track metrics
  trackAiMetric({
    userId: options.userId,
    model: options.model,
    operation: options.operation || 'callAI',
    tokensIn,
    tokensOut,
    responseTimeMs: elapsed,
  });

  let parsed: any = undefined;
  if (options.responseFormat === 'json' && text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSON parse failure — return raw text
    }
  }

  return {
    text,
    parsed,
    usage: { promptTokens: tokensIn, completionTokens: tokensOut, totalTokens: tokensIn + tokensOut },
    latencyMs: elapsed,
    model: options.model,
  };
}

// --- Specialized functions ---

export async function analyzeFood(
  imageBase64OrUrl: string,
  prompt: string,
  userId?: string,
): Promise<AIResponse> {
  const mc = getModelConfig('food_analysis');
  const imageContent = imageBase64OrUrl.startsWith('http')
    ? { type: 'image_url', image_url: { url: imageBase64OrUrl, detail: 'high' } }
    : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64OrUrl}`, detail: 'high' } };

  return callAI({
    model: mc.model,
    systemPrompt: prompt,
    userMessage: [
      { type: 'text', text: 'Analyze this food photo.' },
      imageContent,
    ],
    maxTokens: mc.maxTokens,
    temperature: mc.temperature,
    responseFormat: 'json',
    userId,
    operation: 'food_analysis',
  });
}

export async function chat(
  systemPrompt: string,
  userMessage: string,
  userId?: string,
  model?: string,
): Promise<AIResponse> {
  const mc = getModelConfig('chat');
  return callAI({
    model: model || mc.model,
    systemPrompt,
    userMessage,
    maxTokens: mc.maxTokens,
    temperature: mc.temperature,
    userId,
    operation: 'chat',
  });
}

export async function visionCall(
  prompt: string,
  imageUrl: string,
  userId?: string,
  model?: string,
): Promise<AIResponse> {
  const mc = getModelConfig('food_analysis');
  return callAI({
    model: model || mc.model,
    systemPrompt: 'You are a nutrition and health AI assistant.',
    userMessage: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
    ],
    maxTokens: mc.maxTokens,
    temperature: mc.temperature,
    userId,
    operation: 'vision',
  });
}
