const { neon } = require('@neondatabase/serverless');
const { dateKeysBetween, fetchEventsForDates, syncEvent } = require('../api/sync-espn');

const startDate = process.env.START_DATE || '2026-08-21';
const endDate = process.env.END_DATE || new Date().toISOString().slice(0, 10);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');

(async () => {
    const dates = dateKeysBetween(startDate, endDate);
    const sql = neon(process.env.DATABASE_URL);
    const events = await fetchEventsForDates(dates);
    let stored = 0;
    for (const event of events) if (await syncEvent(sql, event)) stored += 1;
    console.log(JSON.stringify({ startDate, endDate, dates: dates.length, events: events.length, stored }));
})().catch(error => {
    console.error('ESPN Neon backfill failed:', error.message);
    process.exit(1);
});
