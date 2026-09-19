export default async function handler(req, res) {
    // 1. Target URL for the 2026/2027 PL season
    const targetUrl = 'https://api.football-data.org/v4/competitions/PL/matches?season=2026&status=SCHEDULED,LIVE,IN_PLAY,PAUSED,FINISHED,POSTPONED,SUSPENDED';
    
    // 2. Access the API key securely from Vercel Environment Variables
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "API key is not configured on the server." });
    }

    try {
        // 3. Fetch data from football-data.org
        const response = await fetch(targetUrl, {
            headers: { 
                'X-Auth-Token': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Upstream API error: ${response.status}`);
        }

        const data = await response.json();

        // Status and scores can change during the current calendar day.
        res.setHeader('Cache-Control', 'no-store, max-age=0');

        // 5. Return match payload to frontend
        res.status(200).json(data);

    } catch (error) {
        console.error("Error fetching match data:", error);
        res.status(500).json({ error: "Failed to load standings data from the external API." });
    }
}