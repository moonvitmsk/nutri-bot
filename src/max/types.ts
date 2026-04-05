// MAX Bot API types (platform-api.max.ru)

export interface MaxUpdate {
  update_type: 'message_created' | 'message_callback' | 'bot_started';
  timestamp: number;
  message?: MaxMessage;
  callback?: MaxCallback;
  user?: MaxUser;
  chat_id?: number;
}

export interface MaxMessage {
  sender: MaxUser;
  recipient: { chat_id: number };
  timestamp: number;
  body: {
    mid: string;
    seq: number;
    text?: string;
    attachments?: MaxAttachment[];
  };
}

export interface MaxCallback {
  timestamp: number;
  callback_id: string;
  payload: string;
  user: MaxUser;
  message?: { body: { mid: string } };
}

export interface MaxUser {
  user_id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  is_bot?: boolean;
}

export interface MaxAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'contact' | 'sticker' | 'share';
  payload?: {
    url?: string;
    token?: string;
    photos?: Record<string, { url: string }>;
    // Contact fields (request_contact button response)
    vcfPhone?: string;
    tampiPhone?: string;
    vcf_info?: { phone?: string };
    name?: string;
    contactId?: number;
    [key: string]: unknown;
  };
}

export interface MaxInlineButton {
  type: 'callback' | 'link';
  text: string;
  payload?: string;
  url?: string;
}

export interface MaxKeyboard {
  buttons: MaxInlineButton[][];
}

export interface MaxSendMessageParams {
  chat_id: number;
  text: string;
  attachments?: MaxKeyboard[];
  format?: 'markdown' | 'html';
}

export interface MaxWebhookSubscription {
  url: string;
  update_types?: string[];
  version?: string;
}

// Database types
export interface NutriUser {
  id: string;
  max_user_id: number;
  max_chat_id: number | null;
  name: string | null;
  age: number | null;
  sex: 'male' | 'female' | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: 'lose' | 'maintain' | 'gain' | 'healthy' | 'sport' | 'custom' | null;
  goal_text: string | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  allergies: string[];
  chronic: string[];
  diet_pref: string | null;
  daily_calories: number | null;
  daily_protein: number | null;
  daily_fat: number | null;
  daily_carbs: number | null;
  onboarding_step: number;
  onboarding_completed: boolean;
  context_state: string;
  subscription_type: 'free' | 'trial' | 'premium';
  trial_started_at: string;
  premium_until: string | null;
  messages_today: number;
  photos_today: number;
  water_glasses: number;
  streak_days: number;
  last_food_date: string | null;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface NutriMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number | null;
  created_at: string;
}

export interface NutriFoodLog {
  id: string;
  user_id: string;
  photo_url: string | null;
  description: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  ai_analysis: Record<string, unknown> | null;
  confirmed: boolean;
  created_at: string;
}

export interface NutriLabResult {
  id: string;
  user_id: string;
  photo_url: string | null;
  parsed_data: Record<string, unknown> | null;
  ai_interpretation: string | null;
  deficiencies: string[];
  recommendations: Record<string, unknown> | null;
  created_at: string;
}

export interface NutriDeepConsult {
  id: string;
  user_id: string;
  agents_input: Record<string, unknown> | null;
  agents_output: Record<string, unknown> | null;
  final_report: string | null;
  created_at: string;
}

export interface NutriQrCode {
  id: string;
  code: string;
  sku: string;
  activated_by: string | null;
  activated_at: string | null;
  batch_id: string | null;
  created_at: string;
}

export interface NutriSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface NutriProduct {
  id: string;
  slug: string;
  name: string;
  description_md: string | null;
  composition: Record<string, unknown> | null;
  talking_points_md: string | null;
  key_ingredients: string[];
  targets: string[];
  usps: string[];
  audiences: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutriDeficiencyMap {
  id: string;
  deficiency_key: string;
  name: string;
  biomarker: string | null;
  normal_range: string | null;
  food_sources: string[];
  product_slug: string | null;
  priority: number;
  reason: string | null;
  created_at: string;
}
