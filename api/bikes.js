// Vercel serverless function: GET /api/bikes
// Runs on Vercel's servers (not in the browser), so it is NOT blocked by CORS.
// It fetches POGOH's live feed, merges it, and returns GeoJSON the map can draw.
import { getBikesGeoJSON } from '../lib/bikes.mjs';

export default async function handler(_req, res) {
  try {
    const data = await getBikesGeoJSON();
    // Cache at the edge for 30s so we are gentle on POGOH's servers, but still "live".
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(data));
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch POGOH feed', detail: String(err) });
  }
}
