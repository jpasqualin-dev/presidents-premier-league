ALTER TABLE matches ADD COLUMN IF NOT EXISTS original_kickoff_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS schedule_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    old_kickoff_at TIMESTAMPTZ NOT NULL,
    new_kickoff_at TIMESTAMPTZ NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedule_changes_match_idx ON schedule_changes (match_id);
CREATE UNIQUE INDEX IF NOT EXISTS schedule_changes_transition_unique ON schedule_changes (match_id, old_kickoff_at, new_kickoff_at);

UPDATE matches
SET original_kickoff_at = kickoff_at
WHERE original_kickoff_at IS NULL;
