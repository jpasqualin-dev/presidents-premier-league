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
        await page.route('**/api/matches**', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(fixtureData())
        }));
        await page.goto(`${baseUrl}/${pageName}`);
        await page.locator('body.player-page-ready').waitFor();
        assert.equal(await page.evaluate(() => window.SharedPlayerPage), true, `${pageName}: shared player renderer did not initialize`);
        await page.locator('.mw-header[role="button"]').click();
        await page.locator('#match-drawer-overlay.is-open').waitFor();
        const ownerCard = page.locator('.weekly-detail-leader').filter({ has: page.locator('.weekly-detail-name', { hasText: 'Jamey' }) });
        await ownerCard.click();
        const teamLabel = page.locator('.weekly-form-team', { hasText: 'Crystal Palace' }).first();
        await teamLabel.waitFor();
        const box = await teamLabel.boundingBox();
        assert.ok(box && box.height < 20, `${pageName}: Crystal Palace wrapped or disappeared`);
        await teamLabel.click();
        await page.locator('#match-drawer-overlay.is-open .match-team-link').first().click();
        await page.locator('#match-drawer-title').filter({ hasText: 'Crystal Palace' }).waitFor();
        await page.locator('#match-detail-content .team-drawer-card').first().waitFor();
        await page.locator('.match-drawer-back').click();
        await page.locator('#match-drawer-title').filter({ hasText: 'Match details' }).waitFor();
        await page.keyboard.press('Escape');
        await page.locator('#match-drawer-overlay:not(.is-open)').waitFor();
        await context.close();
        });
    }
}
