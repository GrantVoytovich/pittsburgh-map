// Builds the "nearest options" list in the side panel. Each result is a real
// <button> so it is keyboard-focusable; clicking it flies the map to that spot.

import { layerById } from './config.js';
import { walkText } from './geo.js';

export function renderResults(container, groups, onPick) {
  container.innerHTML = '';

  const hasAny = groups.some((g) => g.items.length);
  if (!hasAny) {
    container.innerHTML = '<p class="results__empty">No results in range. Try turning on more layers or searching a different place.</p>';
    return;
  }

  for (const group of groups) {
    if (!group.items.length) continue;
    const def = layerById[group.layer];

    const heading = document.createElement('h3');
    heading.style.cssText = 'font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:10px 0 4px';
    heading.textContent = def.label;
    container.appendChild(heading);

    for (const { feature, meters } of group.items) {
      const p = feature.properties;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'result';
      btn.style.borderLeftColor = def.color;

      const name = p.name || def.label;
      const extra = metaFor(group.layer, p);

      btn.innerHTML = `
        <span class="result__top">
          <span class="result__name"></span>
          <span class="result__dist">${walkText(meters)}</span>
        </span>
        ${extra ? `<span class="result__meta">${extra}</span>` : ''}
      `;
      btn.querySelector('.result__name').textContent = name;
      btn.addEventListener('click', () => onPick(feature, group.layer));
      container.appendChild(btn);
    }
  }
}

function metaFor(layer, p) {
  if (layer === 'bikes') {
    const b = p.bikes ?? '—';
    const d = p.docks ?? '—';
    return `<span class="result__price">${b} bikes</span> · ${d} docks free`;
  }
  if (layer === 'parking') {
    const price = p.rate ? `<span class="result__price">${esc(p.rate)}</span>` : '<span class="result__price">price unknown</span>';
    const kind = p.kind ? ` · ${esc(p.kind)}` : '';
    return price + kind;
  }
  if (layer === 'bathrooms') {
    const bits = [];
    if (p.fee) bits.push(p.fee === 'yes' ? 'fee' : 'free');
    if (p.wheelchair === 'yes') bits.push('wheelchair');
    return bits.join(' · ');
  }
  if (layer === 'ev') return p.operator ? esc(p.operator) : '';
  return '';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
