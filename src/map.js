import maplibregl from 'maplibre-gl';
import { CENTER, DEFAULT_ZOOM, layerById } from './config.js';
import { layerBadge } from './icons.js';

// ---- Base map style -------------------------------------------------
// We use OpenFreeMap's "positron" style: a clean, light vector basemap built
// from OpenStreetMap data. It is genuinely free, needs NO API key and NO
// sign-up, which fits this project's rules. (We previously tried CARTO's raster
// tiles but they now return an "API KEY REQUIRED" placeholder, so we switched.)
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

export function createMap(container) {
  const map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    center: CENTER,
    zoom: DEFAULT_ZOOM,
    attributionControl: {
      compact: false,
      customAttribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>'
    }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(
    new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
    'top-right'
  );
  map.keyboard.enable();
  return map;
}

// Add (or replace) a layer's data. Each layer draws as a soft "glow" circle
// under a crisp white-ringed dot, which reads as a modern, legible pin cloud.
export function setLayerData(map, layerId, featureCollection) {
  const def = layerById[layerId];
  const srcId = `src-${layerId}`;
  const glowId = `glow-${layerId}`;
  const dotId = `lyr-${layerId}`;

  if (map.getSource(srcId)) {
    map.getSource(srcId).setData(featureCollection);
    return;
  }

  map.addSource(srcId, { type: 'geojson', data: featureCollection });

  map.addLayer({
    id: glowId,
    type: 'circle',
    source: srcId,
    paint: {
      'circle-color': def.color,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 14, 11, 16, 16],
      'circle-blur': 1,
      'circle-opacity': 0.22
    }
  });

  map.addLayer({
    id: dotId,
    type: 'circle',
    source: srcId,
    paint: {
      'circle-color': def.color,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3.4, 14, 6, 16, 8.5],
      'circle-stroke-width': 1.6,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.96
    }
  });

  map.on('click', dotId, (e) => {
    const f = e.features[0];
    openFeaturePopup(map, layerId, f.properties, f.geometry.coordinates);
  });
  map.on('mouseenter', dotId, () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', dotId, () => (map.getCanvas().style.cursor = ''));
}

export function setLayerVisible(map, layerId, visible) {
  const v = visible ? 'visible' : 'none';
  for (const id of [`glow-${layerId}`, `lyr-${layerId}`]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
  }
}

// ---- Gold destination marker with a gentle pulse -------------------
let destMarker = null;
export function setDestination(map, coord, label) {
  if (destMarker) destMarker.remove();
  const el = document.createElement('div');
  el.className = 'dest-marker';
  el.setAttribute('aria-label', `Destination: ${label}`);
  el.innerHTML = '<span class="dest-marker__pulse"></span><span class="dest-marker__dot"></span>';
  destMarker = new maplibregl.Marker({ element: el })
    .setLngLat(coord)
    .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(`<div class="popup__title">${escapeHtml(label)}</div>`));
  destMarker.addTo(map);
}

// Open a details popup for one feature (used by map clicks AND result clicks).
export function openFeaturePopup(map, layerId, properties, coord) {
  new maplibregl.Popup({ offset: 14, maxWidth: '280px' })
    .setLngLat(coord)
    .setHTML(popupHtml(layerId, properties))
    .addTo(map);
}

// ---- Popup HTML per layer ------------------------------------------
function popupHtml(layerId, p) {
  const def = layerById[layerId];
  const rows = [];
  const name = p.name || def.label;

  if (layerId === 'bikes') {
    rows.push(row('Bikes available', numOrUnknown(p.bikes)));
    if (p.ebikes != null) rows.push(row('E-bikes', p.ebikes));
    rows.push(row('Docks free', numOrUnknown(p.docks)));
    if (!p.renting) rows.push(`<div class="popup__row">Not renting right now</div>`);
  } else if (layerId === 'parking') {
    rows.push(row('Type', p.kind || 'parking'));
    rows.push(row('Price', p.rate ? `${p.rate}` : 'price unknown'));
    if (p.max_hours) rows.push(row('Max stay', p.max_hours));
    if (p.hours) rows.push(row('Metered', p.hours));
    if (p.zone) rows.push(row('Zone', p.zone));
    if (p.rate && p.source === 'WPRDC') rows.push(`<div class="popup__row">Rate as of 2019</div>`);
  } else if (layerId === 'bathrooms') {
    if (p.fee) rows.push(row('Fee', p.fee === 'yes' ? 'yes' : 'no'));
    if (p.wheelchair) rows.push(row('Wheelchair', p.wheelchair));
    if (p.opening_hours) rows.push(row('Hours', p.opening_hours));
    if (p.changing_table) rows.push(row('Changing table', p.changing_table));
  } else if (layerId === 'water') {
    rows.push(`<div class="popup__row">Public drinking water</div>`);
    if (p.operational) rows.push(row('Status', p.operational));
  } else if (layerId === 'ev') {
    if (p.operator) rows.push(row('Operator', p.operator));
    if (p.capacity) rows.push(row('Points', p.capacity));
    if (p.socket) rows.push(row('Socket', p.socket));
    if (p.fee) rows.push(row('Fee', p.fee));
  } else if (layerId === 'gas') {
    if (p.brand) rows.push(row('Brand', p.brand));
    if (p.fuels) rows.push(row('Fuels', p.fuels));
    if (p.opening_hours) rows.push(row('Hours', p.opening_hours));
    rows.push(`<div class="popup__row">Live gas prices not available from this source</div>`);
  }

  return `
    <div class="popup__head">${layerBadge(def, 26)}<div class="popup__title">${escapeHtml(name)}</div></div>
    ${rows.join('')}
    ${sourceLine(p)}
  `;
}

function sourceLine(p) {
  const label = p.source || 'OpenStreetMap';
  const live = p.layer === 'bikes';
  const url =
    p.source_url ||
    (label.includes('Refuge')
      ? 'https://www.refugerestrooms.org/'
      : label === 'WPRDC'
      ? 'https://data.wprdc.org/'
      : label === 'POGOH GBFS v2'
      ? 'https://pogoh.com/'
      : 'https://www.openstreetmap.org/');
  return `<div class="popup__src">Source: <a href="${url}" target="_blank" rel="noopener">${escapeHtml(label)}</a>${
    live ? ' · <span class="dot">live</span>' : ''
  }</div>`;
}

function row(label, value) {
  return `<div class="popup__row"><b>${label}:</b> ${escapeHtml(String(value))}</div>`;
}
function numOrUnknown(n) {
  return n === null || n === undefined ? 'unknown' : n;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
