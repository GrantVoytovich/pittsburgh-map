// ------------------------------------------------------------------ //
// fetch-data.mjs                                                       //
// Runs with `npm run fetch-data` (and weekly via GitHub Actions).      //
//                                                                      //
// It gathers the SLOW-CHANGING data once and saves it as GeoJSON in    //
// public/data/, so the live app loads instantly and we don't hammer    //
// the free APIs on every page view. (Live bike data is NOT here - that //
// is fetched in the browser via /api/bikes.)                           //
// ------------------------------------------------------------------ //

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BBOX } from '../src/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'data');

const UA = { 'User-Agent': 'pittsburgh-everything-map/1.0 (data refresh script)' };
const { south, west, north, east } = BBOX;
const meta = { generated_at: new Date().toISOString(), sources: {} };

main();

async function main() {
  await mkdir(OUT, { recursive: true });

  const toilets = await overpass('amenity=toilets', 'toilets');
  const parkingOsm = await overpass('amenity=parking', 'parking');
  const water = await overpass('amenity=drinking_water', 'water');
  const ev = await overpass('amenity=charging_station', 'charging');
  const fuel = await overpass('amenity=fuel', 'fuel');

  const refuge = await fetchRefuge();
  const meters = await fetchMeters();

  // --- Bathrooms = OSM toilets + Refuge Restrooms ---
  const bathrooms = [
    ...toilets.map(toToilet),
    ...refuge.map(toRefuge)
  ].filter(inBbox);
  await save('bathrooms.geojson', bathrooms);
  meta.sources.bathrooms = stamp(bathrooms.length, `OSM toilets: ${toilets.length}, Refuge: ${refuge.length}`);

  // --- Parking = OSM lots/garages + WPRDC meters ---
  const parking = [
    ...parkingOsm.map(toParkingOsm),
    ...meters.map(toMeter)
  ].filter(inBbox);
  await save('parking.geojson', parking);
  meta.sources.parking = stamp(parking.length, `OSM lots/garages: ${parkingOsm.length}, WPRDC meters: ${meters.length}; meter rates as of 2019`);

  // --- Water fountains ---
  const waterF = water.map(toWater).filter(inBbox);
  await save('water.geojson', waterF);
  meta.sources.water = stamp(waterF.length, 'OpenStreetMap drinking_water');

  // --- EV charging ---
  const evF = ev.map(toEv).filter(inBbox);
  await save('ev.geojson', evF);
  meta.sources.ev = stamp(evF.length, 'OpenStreetMap charging_station');

  // --- Gas stations ---
  const gasF = fuel.map(toGas).filter(inBbox);
  await save('gas.geojson', gasF);
  meta.sources.gas = stamp(gasF.length, 'OpenStreetMap fuel');

  // Non-snapshot sources, recorded for the dialog.
  meta.sources.bikes = { live: true };
  meta.sources.basemap = { note: 'CARTO Positron raster tiles' };
  meta.sources.geocoder = { note: 'Nominatim, used live, 1 req/sec' };

  await writeFile(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('\nDone. Wrote GeoJSON + meta.json to public/data/');
  console.table(
    Object.fromEntries(Object.entries(meta.sources).map(([k, v]) => [k, v.count ?? (v.live ? 'live' : '-')]))
  );
}

// Overpass is run by volunteers and its main server is often busy (HTTP 429/502).
// We try several public mirrors in turn, with a couple of retries each, before
// giving up on a layer. This keeps the weekly refresh reliable.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

async function overpass(filter, label) {
  const query = `[out:json][timeout:90];
    ( node[${filter}](${south},${west},${north},${east});
      way[${filter}](${south},${west},${north},${east});
      relation[${filter}](${south},${west},${north},${east}); );
    out center tags;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: 'data=' + encodeURIComponent(query)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const out = (json.elements || [])
          .map((el) => {
            const lon = el.lon ?? el.center?.lon;
            const lat = el.lat ?? el.center?.lat;
            if (lon == null || lat == null) return null;
            return { id: `${el.type}/${el.id}`, lon, lat, tags: el.tags || {} };
          })
          .filter(Boolean);
        console.log(`Overpass ${label}: ${out.length} (via ${new URL(endpoint).host})`);
        await sleep(1200); // be polite between calls
        return out;
      } catch (err) {
        console.warn(`  Overpass ${label} ${new URL(endpoint).host} try ${attempt}: ${err.message}`);
        await sleep(2000);
      }
    }
  }
  console.warn(`Overpass ${label} FAILED on all mirrors.`);
  return [];
}

// ---- Refuge Restrooms ----------------------------------------------
async function fetchRefuge() {
  const seen = new Map();
  for (let page = 1; page <= 3; page++) {
    try {
      const url = `https://www.refugerestrooms.org/api/v1/restrooms/by_location?lat=40.4406&lng=-79.9959&per_page=100&page=${page}`;
      const res = await fetch(url, { headers: UA });
      if (!res.ok) break;
      const rows = await res.json();
      if (!rows.length) break;
      for (const r of rows) if (!seen.has(r.id)) seen.set(r.id, r);
      await sleep(800);
    } catch (err) {
      console.warn('Refuge FAILED:', err.message);
      break;
    }
  }
  const list = [...seen.values()];
  console.log(`Refuge Restrooms: ${list.length}`);
  return list;
}

// ---- WPRDC on-street parking meters (CSV) --------------------------
async function fetchMeters() {
  const url = 'https://data.wprdc.org/datastore/dump/aefaf190-7f4c-4466-a28b-1b7ce039419d';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseCsv(text);
      const active = rows.filter((r) => (r.status || '').toLowerCase() === 'active' && r.latitude && r.longitude);
      console.log(`WPRDC meters (active): ${active.length}`);
      return active;
    } catch (err) {
      console.warn(`  WPRDC try ${attempt}: ${err.message}`);
      await sleep(2500);
    }
  }
  console.warn('WPRDC FAILED after retries.');
  return [];
}

// ---- Normalisers: external shape -> our tidy GeoJSON feature -------
function feature(lon, lat, props) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [+lon, +lat] }, properties: props };
}
function toToilet(o) {
  return feature(o.lon, o.lat, {
    layer: 'bathrooms', name: o.tags.name || 'Public toilet', source: 'OpenStreetMap', osm_id: o.id,
    fee: o.tags.fee, wheelchair: o.tags.wheelchair, opening_hours: o.tags.opening_hours, changing_table: o.tags.changing_table
  });
}
function toRefuge(r) {
  return feature(r.longitude, r.latitude, {
    layer: 'bathrooms', name: r.name || 'Restroom', source: 'Refuge Restrooms',
    wheelchair: r.accessible ? 'yes' : 'no', unisex: r.unisex ? 'yes' : 'no', changing_table: r.changing_table ? 'yes' : 'no'
  });
}
function toParkingOsm(o) {
  const t = o.tags;
  const garage = ['multi-storey', 'underground', 'rooftop'].includes(t.parking);
  return feature(o.lon, o.lat, {
    layer: 'parking', name: t.name || (garage ? 'Parking garage' : 'Parking lot'), source: 'OpenStreetMap', osm_id: o.id,
    kind: garage ? 'garage' : 'surface lot', rate: t.charge || null, fee: t.fee, capacity: t.capacity, access: t.access
  });
}
function toMeter(r) {
  return feature(r.longitude, r.latitude, {
    layer: 'parking', name: titleCase(r.location) || 'Metered street parking', source: 'WPRDC',
    kind: 'meter', rate: r.rate || null, max_hours: r.max_hours, hours: r.hours, zone: r.zone, restrictions: r.restrictions
  });
}
function toWater(o) {
  return feature(o.lon, o.lat, {
    layer: 'water', name: o.tags.name || 'Drinking water', source: 'OpenStreetMap', osm_id: o.id,
    operational: o.tags['disused'] ? 'disused' : undefined
  });
}
function toGas(o) {
  const t = o.tags;
  return feature(o.lon, o.lat, {
    layer: 'gas', name: t.name || t.brand || 'Gas station', source: 'OpenStreetMap', osm_id: o.id,
    brand: t.brand || t.operator, opening_hours: t.opening_hours,
    fuels: [t['fuel:diesel'] === 'yes' ? 'diesel' : null, t['fuel:e85'] === 'yes' ? 'E85' : null].filter(Boolean).join(', ') || undefined
  });
}
function toEv(o) {
  const t = o.tags;
  return feature(o.lon, o.lat, {
    layer: 'ev', name: t.name || 'EV charging', source: 'OpenStreetMap', osm_id: o.id,
    operator: t.operator || t.network, capacity: t.capacity, fee: t.fee,
    socket: t['socket:type2'] ? 'Type 2' : t['socket:chademo'] ? 'CHAdeMO' : t['socket:tesla_supercharger'] ? 'Tesla' : undefined
  });
}

// ---- Helpers --------------------------------------------------------
function inBbox(f) {
  const [lon, lat] = f.geometry.coordinates;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}
function stamp(count, note) {
  return { fetched_at: meta.generated_at, count, note };
}
async function save(name, features) {
  const fc = { type: 'FeatureCollection', generated: meta.generated_at, features };
  await writeFile(join(OUT, name), JSON.stringify(fc));
  console.log(`  -> ${name}: ${features.length} features`);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function titleCase(s) {
  return s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}

// Minimal CSV parser that understands quoted fields with commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}
