// Генератор контента для рассылок — экономит API-вызовы
import { VITAMIN_FACTS, HEALTH_TIPS, RECIPE_TEASERS, type ContentItem } from '../config/content-bank.js';
import { supabase } from '../db/supabase.js';

const MOONVIT_SPOTLIGHTS: ContentItem[] = [
  { id: 'ms_01', text: '✨ Moonvit Коллаген + Красота — биотин, B3, B6 для кожи и волос. Результат за 2-3 недели приёма.', tags: ['moonvit', 'collagen-beauty'] },
  { id: 'ms_02', text: '💪 Moonvit Энергия и иммунитет — D3 + E + B12 + PQQ. Осенне-зимний must-have для бодрости.', tags: ['moonvit', 'energy-immunity'] },
  { id: 'ms_03', text: '😴 Moonvit Сон и расслабление — 5-HTP + глицин + B6. Засыпаешь быстрее, спишь глубже.', tags: ['moonvit', 'sleep-relax'] },
  { id: 'ms_04', text: '🌸 Moonvit Женское здоровье — магний + Q10 + K2 + цинк. Баланс гормонов и спокойствие.', tags: ['moonvit', 'womens-health'] },
  { id: 'ms_05', text: '🏋️ Moonvit Мужское здоровье — селен + Q10 + карнитин + цинк. Энергия, выносливость, иммунитет.', tags: ['moonvit', 'mens-health'] },
  { id: 'ms_06', text: '💅 Moonvit Кожа, волосы, ногти — A + D + биотин + коллаген. Красота изнутри, видимый результат.', tags: ['moonvit', 'skin-hair-nails'] },
];

function getCurrentSeason(): 'winter' | 'spring' | 'summer' | 'autumn' {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function getRecentlySent(days: number = 90): Promise<string[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('nutri_broadcast_log')
      .select('content_id')
      .gte('sent_at', since);
    return (data || []).map(r => r.content_id);
  } catch {
    return [];
  }
}

function filterNotRecent(items: ContentItem[], recentIds: string[]): ContentItem[] {
  const filtered = items.filter(i => !recentIds.includes(i.id));
  return filtered.length > 0 ? filtered : items; // fallback to all if everything was sent
}

function filterBySeason(items: ContentItem[]): ContentItem[] {
  const season = getCurrentSeason();
  const seasonal = items.filter(i => !i.season || i.season === 'all' || i.season === season);
  return seasonal.length > 0 ? seasonal : items;
}

export async function generateVitaminFact(): Promise<ContentItem> {
  const recent = await getRecentlySent();
  const pool = filterNotRecent(filterBySeason(VITAMIN_FACTS), recent);
  return pickRandom(pool);
}

export async function generateHealthTip(): Promise<ContentItem> {
  const recent = await getRecentlySent();
  const pool = filterNotRecent(filterBySeason(HEALTH_TIPS), recent);
  return pickRandom(pool);
}

export async function generateRecipeTeaser(): Promise<ContentItem> {
  const recent = await getRecentlySent();
  const pool = filterNotRecent(filterBySeason(RECIPE_TEASERS), recent);
  return pickRandom(pool);
}

export async function generateMoonvitSpotlight(): Promise<ContentItem> {
  const recent = await getRecentlySent(14); // moonvit max 1-2 per week
  const pool = filterNotRecent(MOONVIT_SPOTLIGHTS, recent);
  return pickRandom(pool);
}

export async function generateSeasonalAdvice(): Promise<ContentItem> {
  const season = getCurrentSeason();
  const tips: Record<string, ContentItem[]> = {
    winter: [
      { id: 'sa_w1', text: '❄️ Зимой организму нужно больше витамина D, C и цинка. Налегай на рыбу, цитрусовые и орехи.', tags: ['seasonal'] },
      { id: 'sa_w2', text: '🧣 В холод расход калорий выше на 5-10%. Добавь сложных углеводов — каши, цельнозерновой хлеб.', tags: ['seasonal'] },
      { id: 'sa_w3', text: '🍊 Зимние суперфуды: квашеная капуста, клюква, облепиха, шиповник. Всё есть в любом магазине.', tags: ['seasonal'] },
    ],
    spring: [
      { id: 'sa_s1', text: '🌱 Весенний авитаминоз — не миф. После зимы запасы D, C и B истощены. Налегай на зелень и овощи.', tags: ['seasonal'] },
      { id: 'sa_s2', text: '🥬 Весенняя зелень (черемша, щавель, крапива) — бомба витаминов после зимы. Добавляй в салаты!', tags: ['seasonal'] },
      { id: 'sa_s3', text: '☀️ Солнце возвращается — начинай гулять на свежем воздухе. D синтезируется уже в апреле.', tags: ['seasonal'] },
    ],
    summer: [
      { id: 'sa_su1', text: '🍉 Лето — сезон ягод и фруктов. Ешь по максимуму: антиоксиданты, витамин C, клетчатка. Замораживай на зиму!', tags: ['seasonal'] },
      { id: 'sa_su2', text: '💧 В жару потребность в воде растёт на 30-50%. Пей 2.5-3 литра. Не забывай про электролиты.', tags: ['seasonal'] },
      { id: 'sa_su3', text: '🥒 Лёгкие летние салаты — идеальная еда для жары. Огурец + помидор + зелень + масло = минимум калорий, максимум пользы.', tags: ['seasonal'] },
    ],
    autumn: [
      { id: 'sa_a1', text: '🎃 Осень — сезон тыквы, яблок и корнеплодов. Витамин A, клетчатка и антиоксиданты на максимуме!', tags: ['seasonal'] },
      { id: 'sa_a2', text: '🍂 Осенью готовь запасы: замораживай ягоды, делай квашеную капусту. Зимой скажешь себе спасибо.', tags: ['seasonal'] },
      { id: 'sa_a3', text: '🧅 Осенний суп — лучший формат питания. Тепло + нутриенты + гидратация в одной тарелке.', tags: ['seasonal'] },
    ],
  };
  return pickRandom(tips[season] || tips.winter);
}

export async function logSentContent(contentId: string): Promise<void> {
  try {
    await supabase.from('nutri_broadcast_log').insert({
      content_id: contentId,
      sent_at: new Date().toISOString(),
    });
  } catch { /* non-critical */ }
}
