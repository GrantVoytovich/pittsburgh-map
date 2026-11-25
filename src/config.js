// One place to describe every layer. Everything else (legend, map colours,
// results, search) is built from this list, so adding a layer later means
// editing this file and almost nothing else.

export const CENTER = [-79.9959, 40.4406]; // Downtown Pittsburgh [lng, lat]
export const DEFAULT_ZOOM = 13;

// Bounding box we fetch data inside (south, west, north, east).
export const BBOX = { south: 40.36, west: -80.1, north: 40.5, east: -79.86 };

export const LAYERS = [
  {
    id: 'bikes',
    label: 'Bike share (POGOH)',
    color: '#0072b2',
    live: true,
    endpoint: '/api/bikes'
  },
  { id: 'bathrooms', label: 'Public bathrooms', color: '#009e73', file: 'bathrooms.geojson' },
  { id: 'parking', label: 'Parking', color: '#d55e00', file: 'parking.geojson' },
  { id: 'water', label: 'Water fountains', color: '#56b4e9', file: 'water.geojson' },
  { id: 'ev', label: 'EV charging', color: '#cc79a7', file: 'ev.geojson' }
];

export const layerById = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
