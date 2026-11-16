-- Rounds 10-38 were corrected from the ESPN schedule. Re-derive matchday for unfinished
-- matches so stored upcoming fixtures match data/season-rounds-2026.json. Finished matches keep
-- their recorded matchday.
UPDATE matches
SET matchday = CASE
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-11-06' AND '2026-11-08' THEN '10'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-11-21' AND '2026-11-23' THEN '11'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-11-27' AND '2026-11-29' THEN '12'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-12-01' AND '2026-12-03' THEN '13'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-12-05' AND '2026-12-06' THEN '14'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-12-12' AND '2026-12-14' THEN '15'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-12-19' AND '2026-12-21' THEN '16'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-12-26' AND '2026-12-27' THEN '17'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2026-12-29' AND '2026-12-30' THEN '18'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-01-01' AND '2027-01-03' THEN '19'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-01-05' AND '2027-01-07' THEN '20'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-01-16' AND '2027-01-16' THEN '21'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-01-23' AND '2027-01-23' THEN '22'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-01-30' AND '2027-01-30' THEN '23'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-02-06' AND '2027-02-06' THEN '24'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-02-10' AND '2027-02-10' THEN '25'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-02-20' AND '2027-02-20' THEN '26'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-02-27' AND '2027-02-27' THEN '27'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-03-03' AND '2027-03-03' THEN '28'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-03-13' AND '2027-03-13' THEN '29'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-03-20' AND '2027-03-20' THEN '30'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-04-10' AND '2027-04-10' THEN '31'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-04-17' AND '2027-04-17' THEN '32'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-04-24' AND '2027-04-24' THEN '33'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-05-01' AND '2027-05-01' THEN '34'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-05-08' AND '2027-05-08' THEN '35'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-05-15' AND '2027-05-15' THEN '36'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-05-23' AND '2027-05-23' THEN '37'
	WHEN (kickoff_at AT TIME ZONE 'UTC')::date BETWEEN '2027-05-30' AND '2027-05-30' THEN '38'
	ELSE matchday
END
WHERE season = '2026'
	AND NOT COALESCE(status_completed, FALSE);
