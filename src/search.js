// Resolve a typed place to coordinates.
// 1) Try the built-in landmark list (instant, free, offline).
// 2) Fall back to Nominatim (OpenStreetMap's free geocoder), at most once
//    per second as their usage policy requires, biased to the Pittsburgh area.

import { matchLandmark } from './landmarks.js';

const cache = new Map();
let lastCall = 0;

export async function resolvePlace(place) {
  const q = place.trim();
  if (!q) return null;

  const lm = matchLandmark(q);
  if (lm) return { name: lm.name, coord: lm.coord, via: 'landmark' };

  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  // Respect Nominatim's 1 request/second limit.
  const wait = 1000 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const query = /pittsburgh|pa\b/i.test(q) ? q : `${q}, Pittsburgh, PA`;
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us' +
    '&viewbox=-80.10,40.50,-79.86,40.36&bounded=0' +
    '&q=' +
    encodeURIComponent(query);

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!data.length) {
      cache.set(key, null);
      return null;
    }
    const hit = { name: data[0].display_name.split(',').slice(0, 2).join(','), coord: [+data[0].lon, +data[0].lat], via: 'nominatim' };
    cache.set(key, hit);
    return hit;
  } catch {
    return null;
  }
}
