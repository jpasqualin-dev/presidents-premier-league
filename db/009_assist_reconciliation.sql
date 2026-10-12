ALTER TABLE match_scorers ADD COLUMN IF NOT EXISTS assist_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE match_scorers ADD COLUMN IF NOT EXISTS assist_observations SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE match_scorers ADD COLUMN IF NOT EXISTS assist_checked_at TIMESTAMPTZ;

UPDATE match_scorers
SET assist_status = CASE
        WHEN assist_provider_id IS NOT NULL OR assist_name IS NOT NULL THEN 'credited'
        WHEN own_goal OR penalty THEN 'unassisted'
        ELSE 'unverified'
    END,
    assist_checked_at = COALESCE(assist_checked_at, NOW() - INTERVAL '6 hours')
WHERE assist_checked_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'match_scorers_assist_status_check'
            AND conrelid = 'match_scorers'::regclass
    ) THEN
        ALTER TABLE match_scorers
            ADD CONSTRAINT match_scorers_assist_status_check
            CHECK (assist_status IN ('credited', 'unassisted', 'unverified'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS match_scorers_assist_status_idx
    ON match_scorers (assist_status, match_id);
