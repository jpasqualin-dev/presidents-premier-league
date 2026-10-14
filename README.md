# Presidents Premier League

Static Vercel site for the Presidents Premier League.

## Development checks

Install dependencies with `npm ci`, then run:

- `npm run check` runs JavaScript syntax checks plus unit and contract tests.
- `npm run test:browser` runs the Playwright smoke matrix across all five player pages, light/dark themes, and desktop/mobile viewports. It also covers keyboard and focus behavior, drawer routing, empty and failed API responses, upcoming fixtures, incomplete match details, and browser diagnostics.

Browser checks require Chromium. Install it locally with:

```sh
npx playwright install --with-deps chromium
```

## Frontend structure

- `public/player-page.js` is the shared renderer for Hef, Jamey, Jordan, Nate, and Wes.
- `public/league-config.js` is the canonical league and ownership configuration.
- `public/match-drawer-shared.js`, `public/ppl-weekly-drawer.js`, and `public/team-drawer-shared.js` own drawer behavior.
- `public/drawers.css` owns shared drawer and weekly-form presentation styles.

Player HTML files provide page identity and shell markup. They should not contain page-local fixture renderers or duplicate league configuration.

## Data and deployment

The site uses Vercel-style API routes under `api/`. `/api/matches` combines the live ESPN scoreboard with historical matches stored in Neon; Neon, not `data/matches.json`, is the persistent source for the live site. The JSON file is a legacy snapshot and is not updated by the scheduled database sync.

Vercel runs `/api/sync-espn` daily. Configure `DATABASE_URL` and `CRON_SECRET` for the deployment environments so the scheduled job can write to Neon and authenticate. Both the site API and scheduled sync use the same UTC date window: the previous seven days plus today and tomorrow. This intentional overlap covers local-date boundaries as well as transiently missed runs. Match scores are stored even if ESPN's optional detail endpoint is unavailable; detail data can be completed on a later sync.

Apply database migrations in order, including `db/009_assist_reconciliation.sql` and `db/011_current_player_teams.sql`, before deploying changes that report assist completeness or current player clubs. Finished matches with unresolved assist attribution are retried by the sync job in bounded batches; assist completeness is tracked separately from whether goal totals reconcile. The daily sync refreshes all 20 ESPN club rosters once per 24 hours and the detailed match API serves that cached player-to-club mapping. Player goal and assist totals follow the current roster; match-level club totals remain attributed to the club recorded in each match.

Check Vercel Cron/Function logs for failed sync responses. A sync response with individual event failures is reported as HTTP 500 and includes the affected ESPN event IDs. To backfill a missed date manually, run `START_DATE=YYYY-MM-DD END_DATE=YYYY-MM-DD node scripts/backfill-espn-neon.js` with `DATABASE_URL` configured. The operation is idempotent and can be run again safely.
