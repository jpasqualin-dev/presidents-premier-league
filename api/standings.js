export default async function handler(req, res) {
    // 1. Define the target URL for the 2025/2026 PL season
    const targetUrl = 'https://api.football-data.org/v4/competitions/PL/matches?season=2025';
    
    // 2. Securely access the API key from Vercel's Environment Variables
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "API key is not configured on the server." });
    }

    try {
        // 3. Fetch the data from football-data.org securely on the server
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

        // 4. Implement Caching Strategy (Step 3 recommendation)
        // s-maxage=300 tells Vercel's Edge Network to cache this exact response for 5 minutes (300 seconds).
        // stale-while-revalidate=59 allows serving the slightly stale cache while fetching fresh data in the background.
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=59');

        // 5. Send the successful, cached data back to your frontend website
        res.status(200).json(data);

    } catch (error) {
        console.error("Error fetching match data:", error);
        res.status(500).json({ error: "Failed to load standings data from the external API." });
    }
}