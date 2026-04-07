-- ============================================================
-- MIGRATION 016 : Intégration Google Calendar pour formateurs
-- ============================================================

ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE formateurs ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;
