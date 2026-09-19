ALTER TABLE matches ADD COLUMN IF NOT EXISTS status_state TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS owner_name TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'matches'
          AND column_name = 'status'
    ) THEN
        EXECUTE 'UPDATE matches SET status_state = status WHERE status IS NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'teams'
          AND column_name = 'owner'
    ) THEN
        EXECUTE 'UPDATE teams SET owner_name = owner WHERE owner IS NOT NULL';
    END IF;
END $$;
