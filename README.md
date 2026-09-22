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

The site uses Vercel-style API routes under `api/`. The deployed API requires `API_KEY` to be configured in the environment.
