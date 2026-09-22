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
