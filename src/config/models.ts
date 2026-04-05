// Централизованная конфигурация моделей AI
// Определяет какую модель использовать для каждой задачи

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature?: number;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // Vision задачи — нужна точность, используем gpt-4.1
  food_analysis: { model: 'gpt-4.1', maxTokens: 800, temperature: 0.3 },
  lab_analysis: { model: 'gpt-4.1', maxTokens: 1000, temperature: 0.2 },
  ocr: { model: 'gpt-4.1', maxTokens: 800, temperature: 0.2 },

  // Chat — баланс качество/цена
  chat: { model: 'gpt-4.1-mini', maxTokens: 1500, temperature: 0.7 },
  onboarding_greeting: { model: 'gpt-4.1-mini', maxTokens: 300, temperature: 0.9 },

  // Генерация контента — mini для качества
  recipe: { model: 'gpt-4.1-mini', maxTokens: 1500, temperature: 0.7 },
  meal_plan: { model: 'gpt-4.1-mini', maxTokens: 2000, temperature: 0.7 },

  // Deep consultation — полная модель для глубокого анализа
  deep_consultation: { model: 'gpt-4.1', maxTokens: 1500, temperature: 0.5 },
  deep_report: { model: 'gpt-4.1', maxTokens: 2000, temperature: 0.5 },

  // Лёгкие задачи — nano для экономии
  quality_check: { model: 'gpt-4.1-nano', maxTokens: 50, temperature: 0.3 },
  context_summary: { model: 'gpt-4.1-nano', maxTokens: 300, temperature: 0.5 },
  content_broadcast: { model: 'gpt-4.1-nano', maxTokens: 300, temperature: 0.7 },

  // Транскрипция
  transcription: { model: 'gpt-4o-mini-transcribe', maxTokens: 1000 },
};

export function getModelConfig(task: string): ModelConfig {
  return MODEL_CONFIG[task] || MODEL_CONFIG.chat;
}
