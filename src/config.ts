export const config = {
  max: {
    token: process.env.MAX_BOT_TOKEN!,
    apiUrl: 'https://platform-api.max.ru',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  webhookUrl: process.env.WEBHOOK_URL!,
  adminPassword: process.env.ADMIN_PASSWORD || 'moonvit2026',
  freeTrialDays: parseInt(process.env.FREE_TRIAL_DAYS || '30'),
  limits: {
    messageMaxLength: 3800,
    freeMessagesPerDay: 15,
    trialPhotosPerDay: 15,
    premiumPhotosPerDay: 30,
    trialDeepcheckDays: 30,
    premiumDeepcheckDays: 14,
    contextMessages: 10,
    contextSummaryEvery: 50,
    userRatePerMinute: 30,
    moonvitMentionEvery: 5,
  },
} as const;
