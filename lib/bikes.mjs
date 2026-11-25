// Shared POGOH (Pittsburgh bike share) logic.
// Used by BOTH the Vercel serverless function (api/bikes.js) and the Vite dev
// server (vite.config.js), so there is only one copy of this code to reason about.
//
// GBFS = General Bikeshare Feed Specification, an open standard. POGOH publishes
// two files we care about:
//   station_information.json - fixed facts (name, location, capacity)
//   station_status.json      - live counts (bikes available, docks available)
// We fetch both and merge them by station_id into one GeoJSON FeatureCollection.

const BASE = 'https://pittsburgh.publicbikesystem.net/customer/gbfs/v2/en';

export async function getBikesGeoJSON() {
  const [infoRes, statusRes] = await Promise.all([
    fetch(`${BASE}/station_information.json`, { headers: { 'User-Agent': 'pittsburgh-everything-map/1.0' } }),
    fetch(`${BASE}/station_status.json`, { headers: { 'User-Agent': 'pittsburgh-everything-map/1.0' } })
  ]);
  if (!infoRes.ok || !statusRes.ok) {
    throw new Error(`POGOH feed returned HTTP ${infoRes.status}/${statusRes.status}`);
  }
  const info = await infoRes.json();
  const status = await statusRes.json();

  const statusById = new Map((status.data?.stations || []).map((s) => [s.station_id, s]));

  const features = (info.data?.stations || []).map((st) => {
    const s = statusById.get(st.station_id) || {};
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [st.lon, st.lat] },
      properties: {
        layer: 'bikes',
        name: st.name,
        capacity: st.capacity ?? null,
        bikes: s.num_bikes_available ?? null,
        ebikes: ebikeCount(s),
        docks: s.num_docks_available ?? null,
        renting: s.is_renting === 1 || s.is_renting === true,
        returning: s.is_returning === 1 || s.is_returning === true,
        last_reported: s.last_reported ? new Date(s.last_reported * 1000).toISOString() : null
      }
    };
  });

  return {
    type: 'FeatureCollection',
    generated: new Date().toISOString(),
    source: 'POGOH GBFS v2',
    features
  };
}

// POGOH mixes classic and electric bikes. When the feed breaks the count down by
// vehicle type we surface the e-bike number; otherwise we return null ("unknown").
function ebikeCount(s) {
  if (Array.isArray(s.vehicle_types_available)) {
    const e = s.vehicle_types_available.find((v) => /EFIT|ELECTRIC|EBIKE/i.test(v.vehicle_type_id || ''));
    if (e) return e.count;
  }
  return null;
}
