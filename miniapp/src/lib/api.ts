// API client for moonvit Mini App
// Calls /api/miniapp-* on the bot's Vercel deployment

const API_URL = import.meta.env.VITE_API_URL || '';
// Direct bot URL for large payloads (photo upload) that may fail through rewrite proxy
const BOT_URL = 'https://nutri-bot-smoky.vercel.app';

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
  streak_freeze_available: number;
  photos_today: number;
  avatar_url?: string | null;
  premium_until?: string | null;
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
  items?: { name: string; weight_g: number; calories: number; protein: number; fat: number; carbs: number; is_drink?: boolean; volume_ml?: number | null }[] | null;
  comment?: string | null;
}

export interface ApiWeightEntry {
  id: string;
  weight_kg: number;
  note: string | null;
  created_at: string;
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
  weight_history: ApiWeightEntry[];
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

export async function addFoodPhoto(
  initData: string,
  imageBase64: string,
): Promise<{ ok: boolean; pending?: boolean; log?: ApiLog; error?: string; comment?: string }> {
  // Send directly to bot domain — large base64 payloads may fail through rewrite proxy
  const resp = await fetch(`${BOT_URL}/api/miniapp-add-food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, imageBase64 }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

export async function editFoodLog(
  initData: string,
  logId: string,
  updates: { created_at?: string; category?: string },
): Promise<{ ok: boolean }> {
  return post('miniapp-add-food', { initData, editLogId: logId, updates });
}

export async function confirmFood(
  initData: string,
  logId: string,
  updatedItems?: any[],
  updatedTotals?: { calories: number; protein: number; fat: number; carbs: number },
): Promise<{ ok: boolean; confirmed?: boolean }> {
  return post('miniapp-add-food', { initData, confirmLogId: logId, updatedItems, updatedTotals });
}

// ── AI Features ──

export interface ApiRecipe {
  name: string;
  time_min: number;
  cost_rub: number;
  why: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  kbju: { calories: number; protein: number; fat: number; carbs: number };
  covers: string;
}

export async function getRecipes(
  initData: string,
  meal?: string,
  custom?: string,
  exclude?: string[],
): Promise<{ ok: boolean; recipes: ApiRecipe[] }> {
  return post('miniapp-add-food', { initData, recipe: custom || true, meal, exclude_recipes: exclude });
}

export async function getMealPlan(
  initData: string,
  period: 'today' | 'week' = 'week',
): Promise<{ ok: boolean; mealplan: string }> {
  return post('miniapp-add-food', { initData, mealplan: true, period });
}

export async function chatWithAI(
  initData: string,
  message: string,
): Promise<{ ok: boolean; reply: string }> {
  return post('miniapp-add-food', { initData, chat: message });
}

// ── Weight tracking ──

export async function logWeight(
  initData: string,
  weight_kg: number,
  note?: string,
): Promise<{ ok: boolean; weight_entry?: ApiWeightEntry; weight_history?: ApiWeightEntry[]; current_weight?: number }> {
  return post('miniapp-water', { initData, weight_kg, note });
}

// ── Referral stats ──

export async function getReferralStats(
  initData: string,
): Promise<{ ok: boolean; total: number; activated: number; link: string }> {
  return post('miniapp-water', { initData, referralStats: true });
}

// ── Streak freeze ──

export async function useStreakFreeze(
  initData: string,
): Promise<{ ok: boolean; streak_freeze_available?: number; comment?: string; error?: string }> {
  return post('miniapp-water', { initData, streakFreeze: true });
}

// ── Deep consultation (4-agent) ──

export async function deepConsult(
  initData: string,
  focus?: string,
): Promise<{ ok: boolean; report: string }> {
  return post('miniapp-add-food', { initData, deep_consult: true, focus });
}

// ── Restaurant menu photo analysis ──

export interface RestaurantDish {
  name: string;
  weight_g: number | null;
  price: number | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  note?: string;
}

export async function analyzeRestaurantMenu(
  initData: string,
  imageBase64: string,
): Promise<{ ok: boolean; dishes?: RestaurantDish[]; tip?: string; error?: string; comment?: string }> {
  const resp = await fetch(`${BOT_URL}/api/miniapp-add-food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, restaurant_photo: imageBase64 }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

// ── Lab results photo analysis ──

export interface LabMarker {
  name: string;
  value: string;
  unit: string;
  reference: string;
  status: 'normal' | 'low' | 'high';
}

export async function analyzeLabPhoto(
  initData: string,
  imageBase64: string,
): Promise<{ ok: boolean; markers?: LabMarker[]; interpretation?: string; deficiencies?: string[]; error?: string }> {
  const resp = await fetch(`${BOT_URL}/api/miniapp-add-food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, lab_photo: imageBase64 }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

// ── Lab results PDF analysis ──

export async function analyzeLabPdf(
  initData: string,
  pdfBase64: string,
): Promise<{ ok: boolean; markers?: LabMarker[]; interpretation?: string; deficiencies?: string[]; error?: string }> {
  const resp = await fetch(`${BOT_URL}/api/miniapp-add-food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, lab_pdf: pdfBase64 }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

// ── Promo code activation ──

export async function fridgeToRecipes(
  initData: string,
  imageBase64: string,
): Promise<{ ok: boolean; ingredients?: string[]; recipes?: ApiRecipe[] }> {
  const resp = await fetch(`${BOT_URL}/api/miniapp-add-food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, fridge_photo: imageBase64 }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

export async function activatePromo(
  initData: string,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  return post('miniapp-water', { initData, promo: code });
}

// ── Allergy management ──

export async function updateAllergies(
  initData: string,
  allergies: string[],
): Promise<{ ok: boolean; allergies: string[] }> {
  return post('miniapp-water', { initData, allergies });
}

// ── Profile editing ──

export async function editProfile(
  initData: string,
  updates: { name?: string; sex?: 'male' | 'female'; age?: number; height_cm?: number; weight_kg?: number; goal?: string; goal_text?: string; water_norm?: number; avatar_url?: string },
): Promise<{ ok: boolean; updates: Record<string, any> }> {
  return post('miniapp-water', { initData, editProfile: updates });
}

// ── Track user event (fire-and-forget) ──

export function trackMiniappEvent(
  initData: string,
  event: string,
  meta?: Record<string, unknown>,
) {
  // Fire and forget - don't await, don't block UI
  post('miniapp-water', { initData, trackEvent: { event, category: 'screen', meta } }).catch(() => {});
}

// ── Delete lab result ──

export async function deleteLabResult(
  initData: string,
  labId: string,
): Promise<{ ok: boolean }> {
  return post('miniapp-water', { initData, deleteLabId: labId });
}

// ── Voice transcription (Whisper) ──

export async function transcribeVoice(
  initData: string,
  audioBase64: string,
): Promise<{ ok: boolean; transcript?: string; error?: string }> {
  const resp = await fetch(`${BOT_URL}/api/miniapp-add-food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, voiceBase64: audioBase64 }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

// ── Avatar upload (base64 → Supabase Storage URL) ──

export async function uploadAvatar(
  initData: string,
  imageBase64: string,
): Promise<{ ok: boolean; avatar_url?: string; error?: string }> {
  return post('miniapp-water', { initData, avatarBase64: imageBase64 });
}
