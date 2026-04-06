import { supabase } from '../db/supabase.js';

interface AICallMetric {
  model: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  endpoint: string;
  success: boolean;
}

export async function logAICall(metric: AICallMetric): Promise<void> {
  try {
    await supabase.from('nutri_ai_metrics').insert({
      ...metric,
      cost_usd: estimateCost(metric.model, metric.tokens_in, metric.tokens_out),
    });
  } catch {
    // Table may not exist yet -- silently fail
  }
}

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  // Approximate pricing per 1M tokens
  const prices: Record<string, { in: number; out: number }> = {
    'gpt-4.1': { in: 2.0, out: 8.0 },
    'gpt-4.1-mini': { in: 0.4, out: 1.6 },
    'gpt-4o': { in: 2.5, out: 10.0 },
  };
  const p = prices[model] || prices['gpt-4.1-mini'];
  return (tokensIn * p.in + tokensOut * p.out) / 1_000_000;
}

export async function getAIMetricsSummary(days = 7): Promise<{
  total_calls: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  by_model: Record<string, { calls: number; cost: number }>;
}> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    const { data } = await supabase
      .from('nutri_ai_metrics')
      .select('*')
      .gte('created_at', since);

    if (!data?.length) return { total_calls: 0, total_cost_usd: 0, avg_latency_ms: 0, by_model: {} };

    const total_calls = data.length;
    const total_cost_usd = data.reduce((s, d) => s + (d.cost_usd || 0), 0);
    const avg_latency_ms = Math.round(data.reduce((s, d) => s + (d.latency_ms || 0), 0) / total_calls);

    const by_model: Record<string, { calls: number; cost: number }> = {};
    for (const d of data) {
      if (!by_model[d.model]) by_model[d.model] = { calls: 0, cost: 0 };
      by_model[d.model].calls++;
      by_model[d.model].cost += d.cost_usd || 0;
    }

    return { total_calls, total_cost_usd, avg_latency_ms, by_model };
  } catch {
    return { total_calls: 0, total_cost_usd: 0, avg_latency_ms: 0, by_model: {} };
  }
}
