ALTER TABLE match_scorers ADD COLUMN IF NOT EXISTS assist_provider_id TEXT;
ALTER TABLE match_scorers ADD COLUMN IF NOT EXISTS assist_name TEXT;