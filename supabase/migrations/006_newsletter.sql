-- 006_newsletter.sql
-- Newsletter content cache and email send log

-- Cache for AI-generated newsletter content (one per puzzle, generated once)
CREATE TABLE IF NOT EXISTS newsletter_content (
  puzzle_id INTEGER PRIMARY KEY,
  headline VARCHAR(200),
  body TEXT,
  did_you_know TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email send log for dedup and tracking
CREATE TABLE IF NOT EXISTS email_log (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  puzzle_date DATE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_email_log_dedup ON email_log(email, email_type, puzzle_date);

-- Add newsletter columns to email_subscribers
ALTER TABLE email_subscribers
  ADD COLUMN IF NOT EXISTS newsletter_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- RLS for newsletter_content (read-only for everyone, write for service role)
ALTER TABLE newsletter_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read newsletter content"
  ON newsletter_content FOR SELECT
  USING (true);

-- RLS for email_log (service role only)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage email log"
  ON email_log FOR ALL
  USING (true)
  WITH CHECK (true);
