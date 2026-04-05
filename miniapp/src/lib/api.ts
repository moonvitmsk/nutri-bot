// API client for NutriBot Mini App
// Calls /api/miniapp-* on the bot's Vercel deployment

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Response types ──

export interface ApiUser {
  id: string;
  name: string | null;
  sex: 'male' | 'female' | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  goal_text: string | null;
  daily_calories: number | null;
  daily_protein: number | null;
  daily_fat: number | null;
  daily_carbs: number | null;
  water_glasses: number;
  water_norm: number;
  streak_days: number;
  subscription_type: 'free' | 'trial' | 'premium';
  onboarding_completed: boolean;
}

export interface ApiLog {
  id: string;
  description: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  photo_url: string | null;
  created_at: string;
  micronutrients?: Record<string, number> | null;
  items?: { name: string; weight_g: number; calories: number; protein: number; fat: number; carbs: number }[] | null;
  comment?: string | null;
}

export interface ApiWeekDay {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  logged: boolean;
}

export interface ApiNorm {
  name: string;
  unit: string;
  daily: number;
}

export interface ApiLabResult {
  id: string;
  created_at: string;
  deficiencies: string[];
  ai_interpretation: string | null;
}

export interface AuthResponse {
  ok: boolean;
  user: ApiUser;
  logs: ApiLog[];
  today_vitamins: Record<string, number>;
  week: ApiWeekDay[];
  norms: Record<string, ApiNorm>;
  lab_results: ApiLabResult[];
}

// ── Auth ──

export async function authenticate(initData: string): Promise<AuthResponse> {
  const resp = await fetch(`${API_URL}/api/miniapp-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  return resp.json();
}

// ── Mutations ──

async function post(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${API_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

export async function updateWater(
  initData: string,
  delta: number,
): Promise<{ ok: boolean; water_glasses: number; water_norm: number }> {
  return post('miniapp-water', { initData, delta });
}

export async function deleteFood(
  initData: string,
  logId: string,
): Promise<{ ok: boolean }> {
  return post('miniapp-delete-food', { initData, logId });
}

export async function addFood(
  initData: string,
  text: string,
): Promise<{ ok: boolean; log?: ApiLog; error?: string }> {
  return post('miniapp-add-food', { initData, text });
}
