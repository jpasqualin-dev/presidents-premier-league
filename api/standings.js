export default async function handler(req, res) {
    // 1. Target URL for the 2026/2027 PL season
    const targetUrl = 'https://api.football-data.org/v4/competitions/PL/matches?season=2026';
    
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

        // 4. Edge Caching Strategy: Cache for 30s to prevent exceeding API rate limits during live polling
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=29');

        // 5. Return match payload to frontend
        res.status(200).json(data);

    } catch (error) {
        console.error("Error fetching match data:", error);
        res.status(500).json({ error: "Failed to load standings data from the external API." });
    }
}