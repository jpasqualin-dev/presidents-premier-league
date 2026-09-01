ALTER TABLE matches ADD COLUMN IF NOT EXISTS matchday TEXT;
CREATE INDEX IF NOT EXISTS matches_matchday_idx ON matches (season, matchday);
UPDATE matches
SET matchday = to_char(kickoff_at AT TIME ZONE 'UTC', 'IYYY-"W"IW')
WHERE matchday IS NULL;
