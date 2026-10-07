const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const publicDir = path.join(__dirname, '..', 'public');
const playerPages = ['hef.html', 'jamey.html', 'jordan.html', 'nate.html', 'wes.html'];
const viewports = [
    { name: 'desktop-light', theme: 'light', viewport: { width: 1280, height: 900 } },
    { name: 'desktop-dark', theme: 'dark', viewport: { width: 1280, height: 900 } },
    { name: 'mobile-light', theme: 'light', viewport: { width: 390, height: 844 } },
    { name: 'mobile-dark', theme: 'dark', viewport: { width: 390, height: 844 } }
];

function fixtureData() {
    return {
        matches: [
            ['smoke-match-1', 'Crystal Palace', 'Arsenal'],
            ['smoke-match-2', 'Manchester City', 'Chelsea'],
            ['smoke-match-3', 'Liverpool', 'Manchester United'],
            ['smoke-match-4', 'Aston Villa', 'Tottenham Hotspur'],
            ['smoke-match-5', 'Everton', 'Brighton & Hove Albion']
        ].map(([id, homeName, awayName], index) => ({
            id,
            matchday: 5,
            status: 'FINISHED',
            utcDate: `2026-09-${19 + index}T12:00:00Z`,
            homeTeam: { id: String(index * 2 + 1), name: homeName, crest: '' },
            awayTeam: { id: String(index * 2 + 2), name: awayName, crest: '' },
            score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
            scorers: []
        }))
    };
}

function upcomingFixtureData() {
    return {
        matches: [{
            id: 'upcoming-match-1',
            matchday: 9,
            status: 'SCHEDULED',
            utcDate: '2026-10-18T12:00:00Z',
            homeTeam: { id: '1', name: 'Arsenal' },
            awayTeam: { id: '999', name: 'Unknown FC' },
            score: { fullTime: { home: null, away: null } }
        }]
    };
}

function upcomingDrawerData() {
    const arsenal = { id: '359', name: 'Arsenal' };
    const everton = { id: '368', name: 'Everton' };
    const chelsea = { id: '363', name: 'Chelsea' };
    const brentford = { id: '337', name: 'Brentford' };
    const matches = [];

    for (let day = 1; day <= 6; day += 1) {
        matches.push({
            id: `arsenal-history-${day}`,
            status: 'FINISHED',
            utcDate: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
            homeTeam: arsenal,
            awayTeam: everton,
            score: { fullTime: { home: day, away: 0 } },
            teamCards: { home: { yellow: 1, red: day === 1 ? 1 : 0 }, away: { yellow: 0, red: 0 } }
        });
        matches.push({
            id: `chelsea-history-${day}`,
            status: 'FINISHED',
            utcDate: `2026-10-${String(day + 6).padStart(2, '0')}T12:00:00Z`,
            homeTeam: brentford,
            awayTeam: chelsea,
            score: { fullTime: { home: day, away: 0 } },
            teamCards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } }
        });
    }

    matches.push({
        id: 'upcoming-drawer-match',
        status: 'SCHEDULED',
        utcDate: '2026-10-18T12:00:00Z',
        homeTeam: arsenal,
        awayTeam: chelsea,
        score: { fullTime: { home: null, away: null } },
        venue: 'League Ground'
    });
    return { matches };
}

function diagnosticState(page) {
    const consoleErrors = [], pageErrors = [], failedRequests = [];
    page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`));
    return { consoleErrors, pageErrors, failedRequests };
}

function startStaticServer() {
    const server = http.createServer((request, response) => {
        const requestedPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const filePath = path.normalize(path.join(publicDir, requestedPath === '/' ? 'index.html' : requestedPath));
        if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }
        response.writeHead(200, { 'Content-Type': filePath.endsWith('.js') ? 'text/javascript' : 'text/html' });
        fs.createReadStream(filePath).pipe(response);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser;
let server;
let baseUrl;
let browserError;

test.before(async () => {
    try {
        browser = await chromium.launch({ headless: true });
    } catch (error) {
        browserError = error;
        console.warn('Browser smoke tests skipped: Chromium is unavailable in this environment.');
        return;
    }
    server = await startStaticServer();
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    await browser?.close();
    await new Promise(resolve => server?.close(resolve));
});

test('overall Form rows align with division Form and keep highlighted PTS cells', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    for (const view of [viewports[2], viewports[1]]) {
        const context = await browser.newContext({ viewport: view.viewport });
        await context.addInitScript(theme => localStorage.setItem('ppl-theme', theme), view.theme);
        const page = await context.newPage();
        await page.route('**/api/matches**', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(fixtureData())
        }));
        await page.goto(`${baseUrl}/index.html`);
        await page.locator('#standings-body .expandable-row').first().waitFor();

        const playerRow = page.locator('#standings-body .expandable-row').first();
        const ptsPlayerColor = await playerRow.locator('td.highlight-col').evaluate(cell => getComputedStyle(cell).color);
        await playerRow.click();
        const ptsExpandedRow = page.locator('#standings-body .nested-table-row.expanded').first();
        const ptsTeamColor = await ptsExpandedRow.locator('td.highlight-col').evaluate(cell => getComputedStyle(cell).color);
        await playerRow.click();

        await page.locator('[data-toggle-group="overall"] .toggle-btn').filter({ hasText: 'Form' }).click();
        const divisionCard = page.locator('#divisions-container .table-card').first();
        await divisionCard.locator('.toggle-btn').filter({ hasText: 'Form' }).click();

        const overallHeaders = await page.locator('#standings-table thead tr:nth-child(2) th').evaluateAll(cells =>
            cells.map(cell => { const { x, width } = cell.getBoundingClientRect(); return { x, width }; })
        );
        const divisionHeaders = await divisionCard.locator('thead tr:nth-child(2) th').evaluateAll(cells =>
            cells.map(cell => { const { x, width } = cell.getBoundingClientRect(); return { x, width }; })
        );
        assert.equal(overallHeaders.length, 4);
        assert.equal(divisionHeaders.length, 4);
        overallHeaders.forEach((cell, index) => {
            assert.ok(Math.abs(cell.x - divisionHeaders[index].x) < 1, `${view.name}: Form column ${index + 1} starts at a different position`);
            assert.ok(Math.abs(cell.width - divisionHeaders[index].width) < 1, `${view.name}: Form column ${index + 1} has a different width`);
        });

        assert.equal(await playerRow.locator('.team-form').count(), 1);
        assert.equal(await playerRow.locator('.team-form.overall-player-form').count(), 1);
        assert.equal(await playerRow.locator('.next-opponent').count(), 0);
        assert.equal(await playerRow.locator('td').count(), 4);
        const formHeaderBox = await page.locator('#standings-table thead tr:nth-child(2) th').nth(2).boundingBox();
        const playerFormBox = await playerRow.locator('.form-results').boundingBox();
        assert.ok(Math.abs((formHeaderBox.x + formHeaderBox.width / 2) - (playerFormBox.x + playerFormBox.width / 2)) < 1, `${view.name}: player form rectangles are not centered under the Form heading`);
        await playerRow.click();
        const expandedTeamRow = page.locator('#standings-body .nested-table-row.expanded').first();
        assert.equal(await expandedTeamRow.locator('.team-form').count(), 1);
        assert.equal(await expandedTeamRow.locator('td').count(), 4);
        const pointsHeaderBox = await page.locator('#standings-table thead tr:nth-child(2) th').last().boundingBox();
        const pointsValueBox = await playerRow.locator('td.highlight-col').boundingBox();
        assert.ok(Math.abs(pointsHeaderBox.x - pointsValueBox.x) < 1, `${view.name}: PTS header and values are not aligned`);
        assert.ok(Math.abs(pointsHeaderBox.width - pointsValueBox.width) < 1, `${view.name}: PTS column width changed`);

        assert.equal(await playerRow.locator('td.highlight-col').evaluate(cell => getComputedStyle(cell).color), ptsPlayerColor);
        assert.equal(await expandedTeamRow.locator('td.highlight-col').evaluate(cell => getComputedStyle(cell).color), ptsTeamColor);
        await context.close();
    }
});

for (const pageName of playerPages) {
    for (const view of viewports) {
        test(`${pageName} loads through the shared player and drawer path (${view.name})`, async t => {
        if (browserError) return t.skip('Chromium runtime unavailable');
        const context = await browser.newContext({ viewport: view.viewport });
        await context.addInitScript(theme => localStorage.setItem('ppl-theme', theme), view.theme);
        const page = await context.newPage();
        const diagnostics = diagnosticState(page);
        await page.route('**/api/matches**', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(fixtureData())
        }));
        await page.goto(`${baseUrl}/${pageName}`);
        await page.locator('body.player-page-ready').waitFor();
        assert.equal(await page.evaluate(() => window.SharedPlayerPage), true, `${pageName}: shared player renderer did not initialize`);
        const profileCard = page.locator('.profile-card');
        await profileCard.press('Enter');
        await assert.equal(await profileCard.getAttribute('aria-expanded'), 'true');
        await profileCard.press(' ');
        await assert.equal(await profileCard.getAttribute('aria-expanded'), 'false');
        const weekHeader = page.locator('.mw-header[role="button"]');
        await weekHeader.focus();
        await page.keyboard.press('Enter');
        await page.locator('#match-drawer-overlay.is-open').waitFor();
        assert.equal(await page.locator('#match-drawer-overlay').getAttribute('aria-hidden'), 'false', `${pageName}: weekly drawer aria-hidden state is incorrect`);
        assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'weekly', id: '5' }, `${pageName}: weekly drawer was not routed`);
        assert.equal(await page.evaluate(() => document.activeElement?.closest('#match-drawer-overlay')?.id), 'match-drawer-overlay', `${pageName}: drawer did not receive focus`);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.closest('#match-drawer-overlay')?.id), 'match-drawer-overlay', `${pageName}: Shift+Tab escaped drawer`);
        const ownerCard = page.locator('.weekly-detail-leader').filter({ has: page.locator('.weekly-detail-name', { hasText: 'Jamey' }) });
        await ownerCard.press('Enter');
        assert.equal(await ownerCard.getAttribute('aria-expanded'), 'true', `${pageName}: owner card did not expand from keyboard`);
        const teamLabel = page.locator('.weekly-form-team', { hasText: 'Crystal Palace' }).first();
        await teamLabel.waitFor();
        const box = await teamLabel.boundingBox();
        assert.ok(box && box.height < 20, `${pageName}: Crystal Palace wrapped or disappeared`);
        const matchTrigger = page.locator('.weekly-form-match:visible').first();
        const selectedMatchId = await matchTrigger.getAttribute('data-match-id');
        await matchTrigger.click();
        assert.deepEqual(await page.evaluate(matchId => window.DrawerRouter.current(), selectedMatchId), { type: 'match', id: selectedMatchId }, `${pageName}: match drawer was not routed from weekly form`);
        await page.locator('#match-drawer-overlay.is-open .match-team-link').first().click();
        await page.locator('#match-drawer-title').filter({ hasText: 'Crystal Palace' }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'team', teamName: 'Crystal Palace' }, `${pageName}: team drawer was not routed from match details`);
        await page.locator('#match-detail-content .team-drawer-card').first().waitFor();
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Close match details', `${pageName}: team drawer did not receive focus`);
        await page.locator('.match-drawer-back').click();
        await page.locator('#match-drawer-title').filter({ hasText: 'Match details' }).waitFor();
        assert.deepEqual(await page.evaluate(matchId => window.DrawerRouter.current(), selectedMatchId), { type: 'match', id: selectedMatchId }, `${pageName}: team back navigation did not restore match drawer`);
        await page.locator('.match-drawer-back').click();
        await page.locator('.match-drawer-title').filter({ hasText: 'Week 5' }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'weekly', id: '5' }, `${pageName}: match back navigation did not restore weekly drawer`);
        assert.equal(await page.evaluate(matchId => document.activeElement?.dataset.matchId, selectedMatchId), selectedMatchId, `${pageName}: back navigation did not restore the weekly match trigger`);
        await page.keyboard.press('Escape');
        await page.locator('#match-drawer-overlay:not(.is-open)').waitFor();
        assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('mw-header')), true, `${pageName}: closing weekly drawer did not restore its opener`);
        assert.deepEqual(await page.evaluate(() => window.DrawerRouter.entries()), [], `${pageName}: drawer router did not clear after Escape`);
        assert.deepEqual(diagnostics.consoleErrors, [], `${pageName}: unexpected console errors: ${diagnostics.consoleErrors.join(' | ')}`);
        assert.deepEqual(diagnostics.pageErrors, [], `${pageName}: unexpected page errors: ${diagnostics.pageErrors.join(' | ')}`);
        assert.deepEqual(diagnostics.failedRequests, [], `${pageName}: failed requests: ${diagnostics.failedRequests.join(' | ')}`);
        await context.close();
        });
    }
}

test('browser handles empty match data without rendering a broken page', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = diagnosticState(page);
    await page.route('**/api/matches**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ matches: [] }) }));
    await page.goto(`${baseUrl}/hef.html`);
    await page.locator('body.player-page-ready').waitFor();
    assert.equal(await page.locator('#fixtures-container').textContent(), 'No matchweek fixtures found.');
    assert.equal(await page.locator('.mw-header').count(), 0);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.failedRequests, []);
    await context.close();
});

test('browser surfaces match API failures without an unhandled page error', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = diagnosticState(page);
    await page.route('**/api/matches**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'test failure' }) }));
    await page.goto(`${baseUrl}/hef.html`);
    await page.waitForFunction(() => document.querySelector('#fixtures-container')?.textContent.includes('Unable to load match data'));
    assert.equal(diagnostics.pageErrors.length, 0);
    assert.equal(diagnostics.failedRequests.length, 0);
    await context.close();
});

test('browser keeps stale cached data visible during a live API outage', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext();
    await context.addInitScript(data => {
        localStorage.setItem('pl_match_data_v2', JSON.stringify(data));
        localStorage.setItem('pl_match_data_time', String(Date.now() - 60 * 1000));
    }, fixtureData());
    const page = await context.newPage();
    const diagnostics = diagnosticState(page);
    await page.route('**/api/matches**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'live outage' }) }));
    await page.goto(`${baseUrl}/hef.html`);
    await page.locator('body.player-page-ready').waitFor();
    await page.locator('#match-data-status').waitFor();
    assert.match(await page.locator('#match-data-status').textContent(), /Showing cached match data from/);
    assert.ok(await page.locator('.mw-header').count() > 0);
    assert.equal(diagnostics.pageErrors.length, 0);
    await context.close();
});

test('browser handles upcoming matches and incomplete match details', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = diagnosticState(page);
    await page.route('**/api/matches**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(upcomingFixtureData()) }));
    await page.goto(`${baseUrl}/hef.html`);
    await page.locator('body.player-page-ready').waitFor();
    assert.equal(await page.locator('.mw-header').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.locator('.fixture-item').getAttribute('data-match-id'), 'upcoming-match-1');
    await page.evaluate(() => window.openMatchDrawer('missing-match'));
    await page.locator('#match-detail-content').getByText('Unable to load match details.').waitFor();
    assert.equal(diagnostics.pageErrors.length, 0);
    await context.close();
});

test('upcoming match drawer presents table, recent form, and ranked season stats', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const diagnostics = diagnosticState(page);
    await page.route('**/api/matches**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(upcomingDrawerData())
    }));
    await page.goto(`${baseUrl}/hef.html`);
    await page.locator('body.player-page-ready').waitFor();
    await page.evaluate(() => window.openMatchDrawer('upcoming-drawer-match'));
    await page.locator('.upcoming-stats-card').waitFor();

    assert.equal(await page.locator('.upcoming-card').count(), 3);
    assert.equal(await page.locator('.upcoming-table tbody tr').count(), 2);
    assert.equal(await page.locator('.upcoming-table').evaluate(element => element.classList.contains('overall-standings-table')), true);
    assert.equal(await page.locator('.upcoming-table .fotmob-rank').count(), 2);
    assert.equal(await page.locator('.upcoming-table .team-inline').count(), 2);
    assert.equal(await page.locator('.upcoming-table-owner').count(), 2);
    assert.deepEqual(await page.locator('.upcoming-table').evaluate(table => ({
        bodyFontSize: getComputedStyle(table.tBodies[0].rows[0].cells[0]).fontSize,
        headerFontSize: getComputedStyle(table.tHead.rows[0].cells[0]).fontSize,
        headerWeight: getComputedStyle(table.tHead.rows[0].cells[0]).fontWeight,
        headerTextTransform: getComputedStyle(table.tHead.rows[0].cells[0]).textTransform
    })), {
        bodyFontSize: '12.8px',
        headerFontSize: '12.8px',
        headerWeight: '500',
        headerTextTransform: 'uppercase'
    });
    const teamIcons = page.locator('.match-upcoming-scoreline .match-team img');
    await page.locator('.match-upcoming-scoreline .match-team-name').first().evaluate(element => {
        element.textContent = 'Brighton & Hove Albion';
        element.style.width = '68px';
    });
    const iconTops = await teamIcons.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
    assert.ok(Math.abs(iconTops[0] - iconTops[1]) < 1, 'team crests should stay vertically aligned when a team name wraps');
    assert.equal(await page.locator('.match-form-column').count(), 2);
    assert.equal(await page.locator('.match-form-column').nth(0).locator('.match-form-result').count(), 5);
    assert.equal(await page.locator('.match-form-column').nth(1).locator('.match-form-result').count(), 5);
    assert.match(await page.locator('.match-form-column').nth(0).locator('.match-form-result').first().textContent(), /6 - 0/);
    assert.match(await page.locator('.match-form-column').nth(1).locator('.match-form-result').first().textContent(), /6 - 0/);
    assert.equal(await page.locator('.upcoming-stat-row').count(), 6);
    assert.equal(await page.locator('.match-status, .match-scorers, .timeline, .lineups').count(), 0);
    assert.equal(await page.locator('.match-form-columns').evaluate(element => getComputedStyle(element).display), 'grid');
    assert.equal(await page.locator('.upcoming-table-scroll').evaluate(element => element.scrollWidth <= element.clientWidth), true);
    const goalDifferenceRow = page.locator('.upcoming-stat-row').filter({ has: page.locator('.stat-label').filter({ hasText: 'Goal Differential' }) });
    assert.match(await goalDifferenceRow.textContent(), /\+21/);
    assert.match(await goalDifferenceRow.textContent(), /-21/);
    assert.deepEqual(await goalDifferenceRow.locator('.stat-bars .stat-bar-home, .stat-bars .stat-bar-away').evaluateAll(elements => elements.map(element => element.getAttribute('style'))), [
        'width:95%',
        'width:5%'
    ]);
    for (const category of ['Yellow Cards', 'Red Cards']) {
        const row = page.locator('.upcoming-stat-row').filter({ has: page.locator('.stat-label').filter({ hasText: category }) });
        const ranks = await row.locator('.stat-value').evaluateAll(elements => elements.map(element => Number(element.textContent.match(/#(\d+)/)?.[1])));
        const widths = await row.locator('.stat-bar-home, .stat-bar-away').evaluateAll(elements => elements.map(element => Number.parseFloat(element.style.width)));
        assert.ok(ranks[0] > ranks[1], `${category}: home team should have the worse rank in the fixture`);
        assert.ok(widths[0] < widths[1], `${category}: worse rank should get the smaller bar share`);
    }
    const formRow = page.locator('.match-form-column').nth(0).locator('.match-form-result').first();
    assert.equal(await formRow.evaluate(element => element.tagName), 'BUTTON');
    await formRow.click();
    await page.locator('.match-drawer-back').waitFor();
    await page.locator('#match-detail-content .match-status').filter({ hasText: 'Full time' }).waitFor();
    await page.locator('.match-scoreline .match-team-name').first().evaluate(element => {
        element.textContent = 'Brighton & Hove Albion';
        element.style.width = '68px';
    });
    const completedTeamIconTops = await page.locator('.match-scoreline .match-team img').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
    assert.ok(Math.abs(completedTeamIconTops[0] - completedTeamIconTops[1]) < 1, 'completed-match team crests should stay vertically aligned when a team name wraps');
    await page.locator('.match-drawer-back').click();
    await page.locator('.upcoming-stats-card').waitFor();
    assert.equal(diagnostics.pageErrors.length, 0);
    await context.close();
});

test('upcoming drawer back navigation ignores a late previous-match response', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.route('**/api/matches**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(upcomingDrawerData())
    }));
    await page.goto(`${baseUrl}/hef.html`);
    await page.locator('body.player-page-ready').waitFor();
    await page.evaluate(() => window.openMatchDrawer('upcoming-drawer-match'));
    await page.locator('.upcoming-stats-card').waitFor();
    await page.evaluate(() => {
        const fetchMatch = window.fetchSharedMatchById;
        window.fetchSharedMatchById = async matchId => {
            if (matchId === 'arsenal-history-6') {
                await new Promise(resolve => { window.releaseDelayedMatchDetails = resolve; });
            }
            return fetchMatch(matchId);
        };
    });

    await page.locator('.match-form-column').nth(0).locator('.match-form-result').first().click();
    await page.locator('.match-drawer-back').waitFor();
    await page.locator('#match-detail-content').getByText('Loading match details...').waitFor();
    assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'match', id: 'arsenal-history-6' });

    await page.locator('.match-drawer-back').click();
    await page.locator('.upcoming-stats-card').waitFor();
    assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'match', id: 'upcoming-drawer-match' });
    await page.evaluate(() => window.releaseDelayedMatchDetails());
    await page.waitForTimeout(50);
    assert.equal(await page.locator('.upcoming-stats-card').count(), 1);
    assert.equal(await page.locator('#match-detail-content .match-status').count(), 0);
    await context.close();
});

test('table switches between points and scoped match form with working fixture links', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = diagnosticState(page);
    const opponents = {
        home: ['Manchester City', 'Liverpool', 'Newcastle United', 'Everton', 'Brentford'],
        away: ['Aston Villa', 'Brighton & Hove Albion', 'Bournemouth', 'Fulham', 'West Ham United']
    };
    const results = ['win', 'draw', 'loss', 'win', 'loss'];
    const finishedMatches = ['home', 'away'].flatMap(side => opponents[side].map((opponent, index) => {
        const result = results[index];
        const arsenalScore = result === 'win' ? 2 : result === 'draw' ? 1 : 0;
        const opponentScore = result === 'win' ? 0 : result === 'draw' ? 1 : 2;
        const homeName = side === 'home' ? 'Arsenal' : opponent;
        const awayName = side === 'home' ? opponent : 'Arsenal';
        const homeScore = side === 'home' ? arsenalScore : opponentScore;
        const awayScore = side === 'home' ? opponentScore : arsenalScore;
        return {
            id: `arsenal-${side}-${index + 1}`,
            matchday: 9,
            status: 'FINISHED',
            utcDate: `2026-09-${String(index + 1 + (side === 'away' ? 5 : 0)).padStart(2, '0')}T12:00:00Z`,
            homeTeam: { id: `${side}-${index}-home`, name: homeName },
            awayTeam: { id: `${side}-${index}-away`, name: awayName },
            score: { fullTime: { home: homeScore, away: awayScore } },
            scorers: []
        };
    }));
    const chelseaFormMatches = ['home', 'away'].flatMap(side => [1, 2].map(index => ({
        id: `chelsea-${side}-${index}`,
        matchday: 8,
        status: 'FINISHED',
        utcDate: `2026-09-${String(12 + (side === 'away' ? 2 : 0) + index).padStart(2, '0')}T12:00:00Z`,
        homeTeam: { id: `chelsea-${side}-${index}-home`, name: side === 'home' ? 'Chelsea' : ['Wolves', 'Crystal Palace'][index - 1] },
        awayTeam: { id: `chelsea-${side}-${index}-away`, name: side === 'away' ? 'Chelsea' : ['Leicester City', 'Nottingham Forest'][index - 1] },
        score: { fullTime: { home: 1, away: 0 } },
        scorers: []
    })));
    const matches = [...finishedMatches, ...chelseaFormMatches,
        { id: 'arsenal-next-home', matchday: 10, status: 'SCHEDULED', utcDate: '2026-10-10T12:00:00Z', homeTeam: { id: 'next-home', name: 'Arsenal' }, awayTeam: { id: 'chelsea', name: 'Chelsea' }, score: { fullTime: { home: null, away: null } }, scorers: [] },
        { id: 'arsenal-next-away', matchday: 11, status: 'SCHEDULED', utcDate: '2026-10-17T12:00:00Z', homeTeam: { id: 'next-away-home', name: 'Chelsea' }, awayTeam: { id: 'arsenal-away', name: 'Arsenal' }, score: { fullTime: { home: null, away: null } }, scorers: [] }
    ];
    await page.route('**/api/matches**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ matches })
    }));
    await page.goto(`${baseUrl}/table.html`);
    await page.locator('#standings-table-body tr.team-standings-row').first().waitFor();
    const formToggle = page.locator('.standings-mode-toggle button').filter({ hasText: 'Form' });
    await formToggle.click();
    const arsenalRow = page.locator('#standings-table-body tr.team-standings-row').filter({ hasText: 'Arsenal' });
    const overallMatchIds = await arsenalRow.locator('.table-form-result').evaluateAll(elements => elements.map(element => element.dataset.matchId));
    assert.deepEqual(overallMatchIds, ['arsenal-away-1', 'arsenal-away-2', 'arsenal-away-3', 'arsenal-away-4', 'arsenal-away-5']);
    await arsenalRow.locator('.table-form-result').last().click();
    await page.locator('#match-drawer-overlay.is-open').waitFor();
    assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'match', id: 'arsenal-away-5' });
    await page.keyboard.press('Escape');

    await page.locator('#btn-home').click();
    await page.locator('.standings-mode-toggle button').filter({ hasText: 'Form' }).click();
    const homeArsenalRow = page.locator('#standings-table-body tr.team-standings-row').filter({ hasText: 'Arsenal' });
    assert.deepEqual(await homeArsenalRow.locator('.table-form-result').evaluateAll(elements => elements.map(element => element.dataset.matchId)), ['arsenal-home-1', 'arsenal-home-2', 'arsenal-home-3', 'arsenal-home-4', 'arsenal-home-5']);
    const homeChelseaRow = page.locator('#standings-table-body tr.team-standings-row').filter({ hasText: 'Chelsea' });
    assert.deepEqual(await homeChelseaRow.locator('.table-form-result').evaluateAll(elements => elements.map(element => element.dataset.matchId)), ['chelsea-home-1', 'chelsea-home-2']);
    const homeChelseaForm = homeChelseaRow.locator('.table-form-results');
    const homeChelseaAlignment = await homeChelseaForm.evaluate(element => {
        const container = element.getBoundingClientRect();
        const lastResult = element.lastElementChild.getBoundingClientRect();
        return { justifyContent: getComputedStyle(element).justifyContent, width: container.width, rightGap: container.right - lastResult.right };
    });
    assert.equal(homeChelseaAlignment.justifyContent, 'flex-end');
    assert.ok(homeChelseaAlignment.width >= 162 && homeChelseaAlignment.rightGap < 1, 'short home form should occupy the rightmost result slots');
    await homeArsenalRow.locator('[data-match-id="arsenal-next-home"]').click();
    await page.locator('#match-drawer-overlay.is-open').waitFor();
    assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'match', id: 'arsenal-next-home' });
    await page.keyboard.press('Escape');

    await page.locator('#btn-away').click();
    await page.locator('.standings-mode-toggle button').filter({ hasText: 'Form' }).click();
    const awayArsenalRow = page.locator('#standings-table-body tr.team-standings-row').filter({ hasText: 'Arsenal' });
    assert.deepEqual(await awayArsenalRow.locator('.table-form-result').evaluateAll(elements => elements.map(element => element.dataset.matchId)), ['arsenal-away-1', 'arsenal-away-2', 'arsenal-away-3', 'arsenal-away-4', 'arsenal-away-5']);
    const awayChelseaRow = page.locator('#standings-table-body tr.team-standings-row').filter({ hasText: 'Chelsea' });
    assert.deepEqual(await awayChelseaRow.locator('.table-form-result').evaluateAll(elements => elements.map(element => element.dataset.matchId)), ['chelsea-away-1', 'chelsea-away-2']);
    const awayChelseaForm = awayChelseaRow.locator('.table-form-results');
    const awayChelseaAlignment = await awayChelseaForm.evaluate(element => {
        const container = element.getBoundingClientRect();
        const lastResult = element.lastElementChild.getBoundingClientRect();
        return { justifyContent: getComputedStyle(element).justifyContent, width: container.width, rightGap: container.right - lastResult.right };
    });
    assert.equal(awayChelseaAlignment.justifyContent, 'flex-end');
    assert.ok(awayChelseaAlignment.width >= 162 && awayChelseaAlignment.rightGap < 1, 'short away form should occupy the rightmost result slots');
    await awayArsenalRow.locator('[data-match-id="arsenal-next-away"]').click();
    await page.locator('#match-drawer-overlay.is-open').waitFor();
    assert.deepEqual(await page.evaluate(() => window.DrawerRouter.current()), { type: 'match', id: 'arsenal-next-away' });
    assert.deepEqual(diagnostics.pageErrors, []);
    await context.close();
});

test('Jordan prototype renders its shared shell and switches local tabs', async t => {
    if (browserError) return t.skip('Chromium runtime unavailable');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const diagnostics = diagnosticState(page);
    await page.route('**/api/matches**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureData())
    }));
    await page.goto(`${baseUrl}/jordan2.html?player=Wes`);
    assert.equal(await page.locator('.header-container h1').textContent(), 'Wes');
    assert.equal(await page.title(), 'Wes | Presidents Premier League');
    assert.deepEqual(await page.locator('[role="tab"]').allTextContents(), ['Teams', 'Draft', 'H2H', 'Matches']);
    assert.equal(await page.locator('#tab-teams').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.profile-card .profile-info h1').textContent(), 'Wes');
    assert.deepEqual(await page.locator('.profile-card').evaluate(card => {
        const pills = document.querySelector('.pills-nav-container').getBoundingClientRect();
        return { scrollY: window.scrollY, topGap: card.getBoundingClientRect().top - pills.bottom };
    }), { scrollY: 0, topGap: 0 });
    assert.equal(await page.locator('.profile-card-team').count(), 4);
    assert.equal(await page.locator('.profile-card-top-row').evaluate(element => getComputedStyle(element).flexDirection), 'column');
    assert.deepEqual(await page.locator('.profile-card-team-points-label').allTextContents(), ['PTS', 'PTS', 'PTS', 'PTS']);
    assert.deepEqual(await page.locator('.profile-card-team-points-value').allTextContents(), ['3', '0', '0', '0']);
    assert.equal(await page.locator('.profile-card-team-points').first().evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(0, 255, 135)');
    assert.equal(await page.locator('.profile-card-team-points').first().evaluate(element => getComputedStyle(element).color), 'rgb(56, 0, 60)');
    assert.equal(await page.locator('.profile-card-team img').first().evaluate(element => getComputedStyle(element).width), '75px');
    assert.equal(await page.locator('.profile-card-team-name').first().evaluate(element => getComputedStyle(element).fontSize), '10.88px');
    assert.equal(await page.locator('.profile-card-team').first().evaluate(element => getComputedStyle(element).gap), '8px');
    assert.equal(await page.locator('.profile-card-team').first().evaluate(element => getComputedStyle(element).paddingBottom), '8px');
    assert.equal(await page.locator('#panel-teams').evaluate(element => getComputedStyle(element).paddingTop), '0px');
    assert.equal(await page.locator('.achievement-card').isVisible(), true);
    assert.equal(await page.locator('#panel-teams .player-week-section').count(), 2);
    assert.equal(await page.locator('#panel-teams .player-week-title').count(), 0);
    assert.equal(await page.locator('#last-week-card .mw-card').count(), 1);
    assert.equal(await page.locator('#last-week-card .mw-points').textContent(), '+3 PTS');
    assert.equal(await page.locator('#last-week-card .fixture-item').count(), 2);
    assert.equal(await page.locator('#highest-scoring-week').textContent(), '3 PTS (Week 5)');
    assert.equal(await page.locator('#lowest-scoring-week').textContent(), '3 PTS (Week 5)');
    assert.equal(await page.locator('#average-weekly-score').textContent(), '3.0 PTS (Rank 2)');
    assert.equal(await page.locator('#total-pts').textContent(), '3');
    assert.equal(await page.locator('#head-to-head-details').isVisible(), false);
    await page.locator('#tab-h2h').click();
    assert.equal(await page.locator('#tab-h2h').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#panel-h2h').isVisible(), true);
    assert.equal(await page.locator('#panel-teams').isVisible(), false);
    assert.equal(await page.locator('.h2h-card').isVisible(), true);
    assert.equal(await page.locator('.scoring-card').isVisible(), true);
    assert.equal(await page.locator('#head-to-head-details').isVisible(), true);
    await page.locator('#tab-h2h').press('ArrowLeft');
    assert.equal(await page.locator('#tab-draft').getAttribute('aria-selected'), 'true');
    assert.deepEqual(await page.locator('#draft-table-body tr').allTextContents(), [
        '1Liverpool3',
        '2Newcastle United8',
        '3Sunderland13',
        '4Coventry City18'
    ]);
    assert.equal(await page.locator('#panel-draft .prototype-card').count(), 0);
    assert.equal(await page.locator('#draft-title').textContent(), 'Draft: Wes');
    assert.equal(await page.locator('.draft-table-shell').evaluate(element => getComputedStyle(element).marginTop), '0px');
    await page.locator('#tab-matches').click();
    assert.equal(await page.locator('#panel-matches').isVisible(), true);
    assert.equal(await page.locator('#panel-matches .mw-card').count(), 1);
    assert.equal(await page.locator('#panel-matches .fixture-item').count(), 2);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.failedRequests, []);
    await context.close();
});
