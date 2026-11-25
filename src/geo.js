// Small geometry helpers. No library needed.

// Haversine distance in metres between two [lng, lat] points.
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Turn metres into a friendly "x min walk" string (~1.35 m/s walking speed).
export function walkText(meters) {
  const mins = Math.max(1, Math.round(meters / 81));
  const dist = meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  return `${dist} · ${mins} min walk`;
}

// Nearest `n` features in a FeatureCollection to a [lng, lat] origin.
export function nearest(features, origin, n = 5) {
  return features
    .map((f) => ({ feature: f, meters: distanceMeters(origin, f.geometry.coordinates) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, n);
}
