export interface UserProfile {
  id: string;
  name: string;
  sex: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: string;
  daily_calories: number;
  daily_protein: number;
  daily_fat: number;
  daily_carbs: number;
  streak_days: number;
  xp: number;
  level: number;
  subscription_type: 'free' | 'trial' | 'premium';
  achievements: string[];
  water_norm: number;
  avatar_url?: string | null;
}

export interface FoodItem {
  name: string;
  weight_g: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  is_drink?: boolean;
  volume_ml?: number | null;
}

export interface FoodLog {
  id: string;
  description: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  created_at: string;
  confirmed: boolean;
  photo_url?: string;
  micronutrients?: Record<string, number>;
  items?: FoodItem[];
  comment?: string;
}

export interface VitaminData {
  name: string;
  value: number; // 0-100+ percent of daily norm
  color: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface WeekDay {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  logged: boolean;
}

export interface LabResult {
  id: string;
  created_at: string;
  deficiencies: string[];
  ai_interpretation: string | null;
}

export interface WeightEntry {
  id: string;
  weight_kg: number;
  note: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number; // 0-100
}
