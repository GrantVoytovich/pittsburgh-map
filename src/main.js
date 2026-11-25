import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

import { LAYERS, CENTER, layerById } from './config.js';
import { createMap, setLayerData, setLayerVisible, setDestination, openFeaturePopup } from './map.js';
import { nearest, distanceMeters } from './geo.js';
import { parseQuery } from './intent.js';
import { resolvePlace } from './search.js';
import { renderResults } from './results.js';
import { SOURCES } from './sources.js';
import { ICONS, layerBadge } from './icons.js';

const app = {
  map: null,
  data: {},            // layerId -> GeoJSON FeatureCollection
  visible: {},         // layerId -> bool
  meta: null,
  lastOrigin: { coord: CENTER, name: 'Downtown Pittsburgh' }
};

boot();

async function boot() {
  app.map = createMap('map');
  LAYERS.forEach((l) => (app.visible[l.id] = true));

  injectIcons();
  buildLegend();
  wireSearch();
  wireSourcesDialog();

  // Load the DATA immediately, independent of the basemap. This way the search
  // box and results panel work even if the map tiles are slow or unavailable.
  await Promise.all(LAYERS.map(fetchLayerData));
  loadMeta();
  showNearest(app.lastOrigin.coord, app.lastOrigin.name, LAYERS.map((l) => l.id), { perLayer: 4 });

  // Draw the markers once the map style is ready (MapLibre needs the style
  // loaded before you can add layers to it), then keep live bikes fresh.
  whenStyleReady(app.map, () => {
    for (const l of LAYERS) if (app.data[l.id]) setLayerData(app.map, l.id, app.data[l.id]);
    setInterval(() => LAYERS.filter((l) => l.live).forEach(fetchLayerData), 60000);
  });
}

function whenStyleReady(map, cb) {
  if (map.isStyleLoaded()) cb();
  else map.on('load', cb);
}

// ---- Data loading (no map dependency) -------------------------------
// Snapshot layers come from static files in /data; the live bikes layer from
// our /api/bikes function. We store the data and update the legend count here;
// drawing on the map happens separately once the style is ready.
async function fetchLayerData(layer) {
  try {
    const res = await fetch(layer.live ? layer.endpoint : `/data/${layer.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fc = await res.json();
    app.data[layer.id] = fc;
    updateLegendCount(layer.id, fc.features.length);
    if (app.map.isStyleLoaded()) setLayerData(app.map, layer.id, fc);
  } catch (err) {
    console.warn(`Could not load ${layer.id}:`, err);
    app.data[layer.id] = app.data[layer.id] || emptyFC();
    updateLegendCount(layer.id, '!');
    if (layer.live) toast('Live bike data is unavailable right now.');
  }
}

async function loadMeta() {
  try {
    const res = await fetch('/data/meta.json');
    if (res.ok) app.meta = await res.json();
  } catch {
    /* ignore - dialog falls back to generic text */
  }
}

// Put inline SVG icons into the static chrome (brand mark, search, sources).
function injectIcons() {
  document.getElementById('brand-mark').innerHTML = ICONS.pin;
  document.getElementById('search-icon').innerHTML = ICONS.search;
  document.getElementById('sources-icon').innerHTML = ICONS.info;
}

// ---- Legend ---------------------------------------------------------
function buildLegend() {
  const legend = document.getElementById('legend');
  for (const layer of LAYERS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'legend__item';
    btn.id = `legend-${layer.id}`;
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', `${layer.label} layer`);
    btn.innerHTML = `
      ${layerBadge(layer, 30)}
      <span class="legend__body">
        <span class="legend__label">${layer.label}${layer.live ? '<span class="legend__live">live</span>' : ''}</span>
        <span class="legend__count" data-count>…</span>
      </span>
    `;
    btn.addEventListener('click', () => toggleLayer(layer.id));
    legend.appendChild(btn);
  }
}

function toggleLayer(id) {
  app.visible[id] = !app.visible[id];
  setLayerVisible(app.map, id, app.visible[id]);
  document.getElementById(`legend-${id}`).setAttribute('aria-pressed', String(app.visible[id]));
}

function updateLegendCount(id, n) {
  const el = document.querySelector(`#legend-${id} [data-count]`);
  if (el) el.textContent = n === '!' ? 'error' : `${n}`;
}

// ---- Search ---------------------------------------------------------
function wireSearch() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim()) runSearch(input.value);
  });
  document.getElementById('example-chips').addEventListener('click', (e) => {
    const q = e.target.dataset.q;
    if (q) {
      input.value = q;
      runSearch(q);
    }
  });
}

async function runSearch(raw) {
  const intent = parseQuery(raw);
  let origin, originName;

  if (intent.place) {
    const resolved = await resolvePlace(intent.place);
    if (!resolved) {
      toast(`Couldn't find "${intent.place}". Try a Pittsburgh landmark.`);
      return;
    }
    origin = resolved.coord;
    originName = resolved.name;
  } else {
    // "parking" with no place -> use where the map is centred now.
    origin = app.map.getCenter().toArray();
    originName = 'map centre';
  }

  app.lastOrigin = { coord: origin, name: originName };
  const layersToShow = intent.layers.length ? intent.layers : LAYERS.map((l) => l.id);

  // Make sure the requested layers are switched on.
  for (const id of layersToShow) {
    if (!app.visible[id]) toggleLayer(id);
  }

  setDestination(app.map, origin, originName);
  app.map.flyTo({ center: origin, zoom: 15, speed: 0.8 });

  document.getElementById('results-title').textContent = intent.cheapest
    ? `Cheapest parking near ${originName}`
    : `Nearest to ${originName}`;

  showNearest(origin, originName, layersToShow, { perLayer: layersToShow.length === 1 ? 6 : 4, cheapest: intent.cheapest });
}

// ---- Results --------------------------------------------------------
function showNearest(origin, originName, layerIds, { perLayer = 4, cheapest = false } = {}) {
  const groups = layerIds
    .filter((id) => app.visible[id])
    .map((id) => {
      let items;
      if (id === 'parking' && cheapest) {
        items = cheapestParking(origin, perLayer);
      } else {
        items = nearest((app.data[id] || emptyFC()).features, origin, perLayer);
      }
      return { layer: id, items };
    });

  renderResults(document.getElementById('results'), groups, pickFeature);
}

function cheapestParking(origin, n) {
  const feats = (app.data.parking || emptyFC()).features
    .map((f) => ({ feature: f, meters: distanceMeters(origin, f.geometry.coordinates) }))
    .filter((x) => x.meters < 2000);
  feats.sort((a, b) => {
    const pa = priceNum(a.feature.properties.rate);
    const pb = priceNum(b.feature.properties.rate);
    if (pa !== pb) return pa - pb;
    return a.meters - b.meters;
  });
  return feats.slice(0, n);
}

// "$1.50/hr" -> 1.5 ; "Free" -> 0 ; unknown -> big number so it sorts last.
function priceNum(rate) {
  if (!rate) return Number.POSITIVE_INFINITY;
  if (/free/i.test(rate)) return 0;
  const m = rate.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : Number.POSITIVE_INFINITY;
}

function pickFeature(feature, layerId) {
  app.map.flyTo({ center: feature.geometry.coordinates, zoom: 16, speed: 0.9 });
  openFeaturePopup(app.map, layerId, feature.properties, feature.geometry.coordinates);
}

// ---- Sources dialog -------------------------------------------------
function wireSourcesDialog() {
  const dialog = document.getElementById('sources-dialog');
  document.getElementById('sources-btn').addEventListener('click', () => {
    renderSources();
    dialog.showModal();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close') || e.target === dialog) dialog.close();
  });
}

function renderSources() {
  const body = document.getElementById('sources-body');
  body.innerHTML = SOURCES.map((s) => {
    const m = app.meta?.sources?.[s.key];
    const updated = s.live
      ? 'live (fetched on load)'
      : m?.fetched_at
      ? `snapshot updated ${new Date(m.fetched_at).toLocaleDateString()}`
      : 'snapshot';
    const count = m?.count != null ? ` · ${m.count} points` : '';
    return `
      <div class="source">
        <div class="source__name">${s.name}${s.live ? '<span class="live-tag">live</span>' : ''}</div>
        <div class="source__meta">${s.desc}</div>
        <div class="source__meta">${updated}${count} · ${s.license} · <a href="${s.url}" target="_blank" rel="noopener">source</a></div>
      </div>`;
  }).join('');
}

// ---- Tiny helpers ---------------------------------------------------
function emptyFC() {
  return { type: 'FeatureCollection', features: [] };
}

let toastTimer;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
