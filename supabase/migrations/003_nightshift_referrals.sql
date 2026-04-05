-- Описание: Реферальная система H-3 + лог удалений L-5
-- Блок: BLOCK_3

-- H-3: Referral system
CREATE TABLE IF NOT EXISTS nutri_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES nutri_users(id) ON DELETE SET NULL,
  referred_id UUID REFERENCES nutri_users(id) ON DELETE SET NULL,
  referrer_max_id BIGINT,
  referred_max_id BIGINT,
  reward_type TEXT DEFAULT 'premium_7d',
  reward_given BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutri_referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON nutri_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON nutri_referrals(referred_id);

-- L-5: Deletion log (GDPR)
CREATE TABLE IF NOT EXISTS nutri_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_user_id BIGINT,
  tables_cleared TEXT[] DEFAULT '{}',
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutri_deletion_log ENABLE ROW LEVEL SECURITY;

-- J-3: AI metrics tracking
CREATE TABLE IF NOT EXISTS nutri_ai_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  quality_score REAL,
  cost_usd REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutri_ai_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_metrics_created ON nutri_ai_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_model ON nutri_ai_metrics(model);

-- I-5: A/B test results
CREATE TABLE IF NOT EXISTS nutri_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES nutri_users(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  variant TEXT NOT NULL,
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutri_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ab_tests_name ON nutri_ab_tests(test_name);
