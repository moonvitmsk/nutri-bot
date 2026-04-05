// J-3: AI quality metrics tracking
import { supabase } from './supabase.js';

interface AiMetricInput {
  userId?: string;
  model: string;
  operation: string;
  tokensIn: number;
  tokensOut: number;
  responseTimeMs: number;
  qualityScore?: number;
}

// Cost per 1M tokens (approximate)
const COST_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_PER_1M[model] || COST_PER_1M['gpt-4.1-mini'];
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

// Fire-and-forget — don't block the response
export function trackAiMetric(input: AiMetricInput): void {
  const cost = estimateCost(input.model, input.tokensIn, input.tokensOut);
  supabase.from('nutri_ai_metrics').insert({
    user_id: input.userId || null,
    model: input.model,
    operation: input.operation,
    tokens_in: input.tokensIn,
    tokens_out: input.tokensOut,
    response_time_ms: input.responseTimeMs,
    quality_score: input.qualityScore || null,
    cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
  }).then(() => {}, (err: unknown) => console.error('AI metric track error:', err));
}

// Admin: get aggregate stats
export async function getAiMetricsStats(days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from('nutri_ai_metrics')
    .select('model, operation, tokens_in, tokens_out, response_time_ms, cost_usd')
    .gte('created_at', since);

  if (!data?.length) return { totalCalls: 0, avgLatency: 0, totalCost: 0, byModel: {} };

  const totalCalls = data.length;
  const avgLatency = Math.round(data.reduce((s, r) => s + r.response_time_ms, 0) / totalCalls);
  const totalCost = Math.round(data.reduce((s, r) => s + (r.cost_usd || 0), 0) * 10000) / 10000;

  const byModel: Record<string, { calls: number; avgMs: number; cost: number }> = {};
  for (const row of data) {
    const m = byModel[row.model] || { calls: 0, avgMs: 0, cost: 0 };
    m.calls++;
    m.avgMs += row.response_time_ms;
    m.cost += row.cost_usd || 0;
    byModel[row.model] = m;
  }
  for (const m of Object.values(byModel)) {
    m.avgMs = Math.round(m.avgMs / m.calls);
    m.cost = Math.round(m.cost * 10000) / 10000;
  }

  // p50/p95 latency
  const sorted = data.map(r => r.response_time_ms).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;

  return { totalCalls, avgLatency, p50, p95, totalCost, byModel };
}
