import fs from 'node:fs/promises';
import path from 'node:path';

const databasePath = path.resolve(process.cwd(), 'data/matches.json');

export default async function handler(req, res) {
    try {
        const database = JSON.parse(await fs.readFile(databasePath, 'utf8'));
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        res.status(200).json(database);
    } catch (error) {
        console.error('Error reading normalized ESPN database:', error);
        res.status(500).json({ error: 'Unable to read normalized match database.' });
    }
}
