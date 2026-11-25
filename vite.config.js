import { defineConfig } from 'vite';
import { getBikesGeoJSON } from './lib/bikes.mjs';

// We have ONE piece of truly live data: POGOH bike availability.
// POGOH's feed does not allow direct browser calls (no permissive CORS header),
// so in production a Vercel serverless function at /api/bikes proxies it.
// This little plugin makes that SAME endpoint work during local development,
// so the app behaves identically whether you run `npm run dev` or visit the
// deployed site.
function devBikesApi() {
  return {
    name: 'dev-bikes-api',
    configureServer(server) {
      server.middlewares.use('/api/bikes', async (_req, res) => {
        try {
          const data = await getBikesGeoJSON();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: 'Failed to load POGOH feed', detail: String(err) }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [devBikesApi()]
});
