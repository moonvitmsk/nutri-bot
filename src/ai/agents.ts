import { chatCompletion } from './client.js';
import { getAgentPrompt } from './prompts.js';
import type { NutriUser } from '../max/types.js';

interface AgentResult {
  agent: string;
  output: string;
  tokens: number;
}

export async function runDeepConsultation(user: NutriUser, context: string): Promise<{ reports: AgentResult[]; finalReport: string; totalTokens: number }> {
  const userProfile = [
    `${user.name}, ${user.sex === 'male' ? 'М' : 'Ж'}, ${user.age} лет`,
    `Рост ${user.height_cm} см, вес ${user.weight_kg} кг`,
    `Цель: ${user.goal}, активность: ${user.activity_level}`,
    user.allergies.length ? `Аллергии: ${user.allergies.join(', ')}` : '',
    user.chronic.length ? `Хронические: ${user.chronic.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const input = `ПРОФИЛЬ:\n${userProfile}\n\nКОНТЕКСТ:\n${context}`;

  // Run 3 specialist agents in parallel
  const [dietolog, health, lifestyle] = await Promise.all([
    runAgent('dietolog', input),
    runAgent('health', input),
    runAgent('lifestyle', input),
  ]);

  // Run report composer with all 3 outputs
  const reportPrompt = await getAgentPrompt('report');
  const { text: finalReport, tokens: reportTokens } = await chatCompletion([
    { role: 'system', content: reportPrompt },
    { role: 'user', content: [
      `ВВОДНЫЕ:\n${input}`,
      `\nДИЕТОЛОГ:\n${dietolog.output}`,
      `\nЗДОРОВЬЕ:\n${health.output}`,
      `\nЛАЙФСТАЙЛ:\n${lifestyle.output}`,
    ].join('\n') },
  ], 'gpt-4.1');

  const reports = [dietolog, health, lifestyle];
  const totalTokens = reports.reduce((s, r) => s + r.tokens, 0) + reportTokens;

  return { reports, finalReport, totalTokens };
}

async function runAgent(agent: 'dietolog' | 'health' | 'lifestyle', input: string): Promise<AgentResult> {
  const prompt = await getAgentPrompt(agent);
  const { text, tokens } = await chatCompletion([
    { role: 'system', content: prompt },
    { role: 'user', content: input },
  ], 'gpt-4.1');
  return { agent, output: text, tokens };
}
