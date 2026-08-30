CREATE TABLE IF NOT EXISTS teams (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_team_id TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    short_name TEXT,
    owner_name TEXT,
    division TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_team_id),
    UNIQUE (canonical_name)
);

CREATE TABLE IF NOT EXISTS matches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    competition TEXT NOT NULL,
    season INTEGER NOT NULL,
    kickoff_at TIMESTAMPTZ NOT NULL,
    status_state TEXT NOT NULL,
    status_completed BOOLEAN NOT NULL DEFAULT FALSE,
    status_detail TEXT,
    status_clock TEXT,
    home_team_id BIGINT NOT NULL REFERENCES teams(id),
    away_team_id BIGINT NOT NULL REFERENCES teams(id),
    home_score INTEGER,
    away_score INTEGER,
    venue TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS matches_kickoff_idx ON matches (kickoff_at);
CREATE INDEX IF NOT EXISTS matches_season_idx ON matches (season);

CREATE TABLE IF NOT EXISTS match_scorers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    provider_athlete_id TEXT,
    team_id BIGINT NOT NULL REFERENCES teams(id),
    athlete_name TEXT NOT NULL,
    minute TEXT,
    own_goal BOOLEAN NOT NULL DEFAULT FALSE,
    penalty BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, provider_athlete_id, minute, team_id)
);
