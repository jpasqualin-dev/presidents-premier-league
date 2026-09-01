ALTER TABLE matches ADD COLUMN IF NOT EXISTS attendance INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS broadcast TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS was_suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS play_by_play_available BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    event_type TEXT NOT NULL,
    clock_seconds INTEGER,
    clock_display TEXT,
    athlete_provider_id TEXT,
    athlete_name TEXT,
    score_value INTEGER,
    scoring_play BOOLEAN NOT NULL DEFAULT FALSE,
    red_card BOOLEAN NOT NULL DEFAULT FALSE,
    yellow_card BOOLEAN NOT NULL DEFAULT FALSE,
    penalty BOOLEAN NOT NULL DEFAULT FALSE,
    own_goal BOOLEAN NOT NULL DEFAULT FALSE,
    shootout BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_events_match_idx ON match_events (match_id);

CREATE TABLE IF NOT EXISTS match_team_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    stat_name TEXT NOT NULL,
    stat_value NUMERIC,
    display_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, team_id, stat_name)
);
