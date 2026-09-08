ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS home_half_time_score INTEGER,
    ADD COLUMN IF NOT EXISTS away_half_time_score INTEGER;