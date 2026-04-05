-- 002: Broadcast log + pgcrypto setup (L-4, E-3)

-- L-4: Enable pgcrypto for at-rest encryption support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- E-3: Broadcast log table
CREATE TABLE IF NOT EXISTS nutri_broadcast_log (
  id        BIGSERIAL PRIMARY KEY,
  topic     TEXT NOT NULL,
  content   TEXT NOT NULL,
  sent_count INTEGER DEFAULT 0,
  triggered_by TEXT DEFAULT 'cron',  -- 'cron' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE nutri_broadcast_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON nutri_broadcast_log USING (false) WITH CHECK (false);

-- G-4: Add pdf_text column to lab results (for PDF-based uploads)
ALTER TABLE nutri_lab_results ADD COLUMN IF NOT EXISTS pdf_text TEXT;

-- L-4: Add encrypted_phone column for phone at-rest encryption
-- (Application layer encrypts with AES-256-GCM before storing here)
ALTER TABLE nutri_users ADD COLUMN IF NOT EXISTS phone_enc TEXT;

-- Index for broadcast log
CREATE INDEX IF NOT EXISTS idx_broadcast_log_created ON nutri_broadcast_log(created_at DESC);
