-- D-1: pg_cron infrastructure for unlimited cron jobs
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Morning reminders 09:00 MSK (06:00 UTC)
SELECT cron.schedule(
  'nutri-morning-reminders',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := 'https://nutri-bot-sashazdes-gmailcoms-projects.vercel.app/api/cron-reminders',
    headers := '{"Authorization": "Bearer nutri-cron-secret-2026"}'::jsonb
  )$$
);

-- Evening summary 21:00 MSK (18:00 UTC)
SELECT cron.schedule(
  'nutri-evening-summary',
  '0 18 * * *',
  $$SELECT net.http_post(
    url := 'https://nutri-bot-sashazdes-gmailcoms-projects.vercel.app/api/cron-evening',
    headers := '{"Authorization": "Bearer nutri-cron-secret-2026"}'::jsonb
  )$$
);

-- Reset daily counters at midnight MSK (21:00 UTC prev day)
SELECT cron.schedule(
  'nutri-reset-daily',
  '0 21 * * *',
  $$SELECT net.http_post(
    url := 'https://nutri-bot-sashazdes-gmailcoms-projects.vercel.app/api/cron-reset',
    headers := '{"Authorization": "Bearer nutri-cron-secret-2026"}'::jsonb
  )$$
);

-- Cleanup old cron history (weekly)
SELECT cron.schedule(
  'nutri-cleanup-cron-history',
  '0 3 * * 0',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);

-- Add free_analyses_used column for freemium counter (A-4)
ALTER TABLE nutri_users ADD COLUMN IF NOT EXISTS free_analyses_used INTEGER DEFAULT 0;

-- Add phone column for phone sharing (A-5)
ALTER TABLE nutri_users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
