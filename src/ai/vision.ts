import { visionAnalysis, chatCompletion } from './client.js';
import { getFoodVisionPrompt, getLabVisionPrompt, getRestaurantMenuPrompt } from './prompts.js';

export interface FoodAnalysis {
  items: { name: string; portion_g: number; calories: number; protein: number; fat: number; carbs: number; fiber?: number; confidence: number }[];
  total: { calories: number; protein: number; fat: number; carbs: number; fiber?: number };
  micronutrients?: Record<string, number>;
  comment: string;
  not_food?: boolean;
}

export interface RestaurantMenuAnalysis {
  dishes: { name: string; weight_g: number | null; price: number | null; calories: number; protein: number; fat: number; carbs: number; note?: string }[];
  tip?: string;
  not_menu?: boolean;
  comment?: string;
}

export interface LabAnalysis {
  markers: { name: string; value: string; unit: string; reference: string; status: 'normal' | 'low' | 'high' }[];
}

export async function analyzeFoodPhoto(imageUrl: string): Promise<{ analysis: FoodAnalysis; text: string; tokens: number }> {
  const prompt = await getFoodVisionPrompt();
  const { text, tokens } = await visionAnalysis(prompt, imageUrl);

  let analysis: FoodAnalysis;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { items: [], total: { calories: 0, protein: 0, fat: 0, carbs: 0 }, comment: text };
  } catch {
    analysis = { items: [], total: { calories: 0, protein: 0, fat: 0, carbs: 0 }, comment: text };
  }

  return { analysis, text, tokens };
}

export async function analyzeLabPhoto(imageUrl: string, userProfile?: { sex?: string; age?: number; weight_kg?: number }): Promise<{ markers: LabAnalysis['markers']; interpretation: string; tokens: number }> {
  let prompt = await getLabVisionPrompt();
  if (userProfile) {
    const sex = userProfile.sex === 'female' ? 'женщина' : 'мужчина';
    prompt += `\n\nПРОФИЛЬ ПАЦИЕНТА: ${sex}, ${userProfile.age || '?'} лет, ${userProfile.weight_kg || '?'} кг. Учти возраст и пол при интерпретации референсов.`;
  }
  const { text, tokens } = await visionAnalysis(prompt, imageUrl);

  let markers: LabAnalysis['markers'] = [];
  let interpretation = '';
  try {
    const cleaned = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      markers = parsed.markers || [];
      interpretation = [parsed.interpretation, parsed.recommendations].filter(Boolean).join('\n\n');
      if (parsed.see_doctor) interpretation += '\n\n⚠️ Рекомендуется обратиться к врачу.';
    }
  } catch {
    // couldn't parse JSON - extract text without JSON
    interpretation = text.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/, '').trim();
  }

  if (!interpretation) interpretation = 'Анализ завершён. Маркеры извлечены.';

  return { markers, interpretation, tokens };
}

// Restaurant menu photo analysis
export async function analyzeRestaurantMenu(imageUrl: string): Promise<{ analysis: RestaurantMenuAnalysis; tokens: number }> {
  const prompt = await getRestaurantMenuPrompt();
  const { text, tokens } = await visionAnalysis(prompt, imageUrl);

  let analysis: RestaurantMenuAnalysis;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { dishes: [], not_menu: true, comment: text };
  } catch {
    analysis = { dishes: [], not_menu: true, comment: 'Не удалось разобрать меню.' };
  }

  return { analysis, tokens };
}

// G-4: Text-based lab analysis (for PDF-extracted text)
export async function analyzeLabText(text: string): Promise<{ markers: LabAnalysis['markers']; interpretation: string; tokens: number }> {
  const prompt = await getLabVisionPrompt();
  const { text: responseText, tokens } = await chatCompletion([
    { role: 'system', content: prompt },
    { role: 'user', content: `Текст результатов анализов:\n\n${text}` },
  ]);

  let markers: LabAnalysis['markers'] = [];
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      markers = parsed.markers || [];
    }
  } catch {
    // couldn't parse JSON, treat entire response as interpretation
  }

  const interpretation = responseText.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/, '').trim() || responseText;
  return { markers, interpretation, tokens };
}
