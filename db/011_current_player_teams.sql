CREATE TABLE IF NOT EXISTS player_current_teams (
    provider TEXT NOT NULL,
    provider_athlete_id TEXT NOT NULL,
    athlete_name TEXT NOT NULL,
    team_id UUID NOT NULL REFERENCES teams(id),
    observed_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (provider, provider_athlete_id)
);

CREATE INDEX IF NOT EXISTS player_current_teams_team_idx
    ON player_current_teams (team_id);

CREATE TABLE IF NOT EXISTS player_roster_sync (
    sync_key TEXT PRIMARY KEY,
    last_synced_at TIMESTAMPTZ NOT NULL
);
