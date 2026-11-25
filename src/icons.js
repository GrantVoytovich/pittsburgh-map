// Inline SVG icons. Keeping them as strings (not icon-font / image files) means
// zero extra network requests and they inherit colour via `currentColor`.

// UI icons.
export const ICONS = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  pin:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/></svg>',
  walk:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="1.6"/><path d="M11 21l2-6-3-2 1-5 3 3 3 1"/><path d="M11 13l-2 3"/></svg>'
};

// Per-layer glyphs, drawn white inside a coloured badge. A couple use short text
// (P, WC) because those read faster than any line icon for parking and toilets.
export const GLYPHS = {
  bike:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="3.3"/><circle cx="18" cy="17" r="3.3"/><path d="M6 17l4.5-8H15l3 8"/><path d="M10.5 9 9 6h3.2"/></svg>',
  bathroom: '<span class="glyph-text">WC</span>',
  parking: '<span class="glyph-text">P</span>',
  water:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.4 12 3 12 3z"/></svg>',
  ev:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  gas:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="9" height="18" rx="1.4"/><path d="M4 11h9"/><path d="M16 8.5l2.5 2.5V17a1.8 1.8 0 0 1-3.6 0v-2.5H13"/></svg>'
};

// Build a round coloured badge containing a layer's glyph.
export function layerBadge(layer, size = 28) {
  const glyph = GLYPHS[layer.icon] || '';
  return `<span class="badge" style="--c:${layer.color};width:${size}px;height:${size}px">${glyph}</span>`;
}
