// Rule-based understanding of the search box. NO AI, NO network.
// Turns "cheapest parking near PNC Park" into:
//   { layers: ['parking'], place: 'PNC Park', cheapest: true }

const LAYER_WORDS = {
  parking: ['parking', 'park my car', 'garage', 'lot', 'meter'],
  bathrooms: ['bathroom', 'restroom', 'toilet', 'washroom', 'loo'],
  bikes: ['bike', 'bikes', 'pogoh', 'bike share', 'dock'],
  water: ['water', 'fountain', 'drinking water', 'refill'],
  ev: ['ev', 'charger', 'charging', 'charge my car', 'ev charger']
};

const CHEAP_WORDS = ['cheapest', 'cheap', 'free', 'lowest', 'affordable'];

export function parseQuery(raw) {
  const text = ` ${raw.toLowerCase().trim()} `;
  const layers = [];

  for (const [layer, words] of Object.entries(LAYER_WORDS)) {
    if (words.some((w) => text.includes(` ${w} `) || text.includes(`${w} `) || text.includes(` ${w}`))) {
      layers.push(layer);
    }
  }

  const cheapest = CHEAP_WORDS.some((w) => text.includes(w));

  // The place is whatever is left after "near"/"around"/"at", or the whole
  // string if the user didn't name a layer.
  let place = '';
  const nearMatch = raw.match(/\b(?:near|around|at|by|next to)\b\s+(.*)$/i);
  if (nearMatch) {
    place = nearMatch[1].trim();
  } else if (layers.length === 0) {
    place = raw.trim(); // pure place search, e.g. "Market Square"
  } else {
    // "parking downtown" - strip the layer words, keep the rest as the place
    let rest = raw.toLowerCase();
    for (const words of Object.values(LAYER_WORDS)) {
      for (const w of words) rest = rest.replace(new RegExp(`\\b${escapeRe(w)}\\b`, 'gi'), ' ');
    }
    for (const w of CHEAP_WORDS) rest = rest.replace(new RegExp(`\\b${w}\\b`, 'gi'), ' ');
    place = rest.replace(/\s+/g, ' ').trim();
  }

  return { layers, place, cheapest, raw };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
