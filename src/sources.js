// Human-readable description of every data source, shown in the "Data sources"
// dialog. The `last updated` time for snapshot layers is read at runtime from
// data/meta.json (written by scripts/fetch-data.mjs), so it is always honest.

export const SOURCES = [
  {
    key: 'bikes',
    name: 'POGOH bike share',
    live: true,
    url: 'https://pittsburgh.publicbikesystem.net/customer/gbfs/v2/gbfs.json',
    desc: 'Live station availability via the open GBFS feed. Fetched fresh in your browser through our /api/bikes proxy.',
    license: 'POGOH / CC-BY 4.0'
  },
  {
    key: 'bathrooms',
    name: 'Public bathrooms',
    url: 'https://overpass-api.de/',
    desc: 'OpenStreetMap toilets (amenity=toilets) via Overpass, plus community-submitted spots from Refuge Restrooms.',
    license: 'OpenStreetMap ODbL · Refuge Restrooms'
  },
  {
    key: 'parking',
    name: 'Parking',
    url: 'https://data.wprdc.org/dataset/parking-meters-and-payment-points',
    desc: 'Garages & lots from OpenStreetMap. On-street meter locations, zones and rates from the Western PA Regional Data Center. Meter RATES are labelled as of 2019 and may be out of date.',
    license: 'OpenStreetMap ODbL · WPRDC'
  },
  {
    key: 'water',
    name: 'Water fountains',
    url: 'https://overpass-api.de/',
    desc: 'OpenStreetMap drinking water points (amenity=drinking_water) via Overpass.',
    license: 'OpenStreetMap ODbL'
  },
  {
    key: 'ev',
    name: 'EV charging',
    url: 'https://overpass-api.de/',
    desc: 'OpenStreetMap charging stations (amenity=charging_station) via Overpass.',
    license: 'OpenStreetMap ODbL'
  },
  {
    key: 'gas',
    name: 'Gas stations',
    url: 'https://overpass-api.de/',
    desc: 'OpenStreetMap fuel stations (amenity=fuel) via Overpass. Brand where known; this source does not include live gas prices.',
    license: 'OpenStreetMap ODbL'
  },
  {
    key: 'basemap',
    name: 'Base map tiles',
    url: 'https://openfreemap.org/',
    desc: 'OpenFreeMap "Positron" vector tiles, built from OpenStreetMap data. Free, no API key.',
    license: '© OpenStreetMap contributors · OpenFreeMap'
  },
  {
    key: 'geocoder',
    name: 'Place search fallback',
    url: 'https://nominatim.openstreetmap.org/',
    desc: 'When a search is not in our built-in landmark list, we ask Nominatim (OpenStreetMap) to find it, at most once per second.',
    license: 'OpenStreetMap ODbL'
  }
];
