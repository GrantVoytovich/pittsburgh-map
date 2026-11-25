// A small built-in list of Pittsburgh places so common searches resolve
// instantly and for free, without hitting the geocoder. Each place has a few
// aliases (nicknames) people actually type.

export const LANDMARKS = [
  { name: 'PNC Park', coord: [-80.0057, 40.4469], aliases: ['pnc', 'pirates', 'pnc park'] },
  { name: 'Acrisure Stadium', coord: [-80.0158, 40.4468], aliases: ['heinz field', 'steelers', 'acrisure'] },
  { name: 'PPG Paints Arena', coord: [-79.9897, 40.4395], aliases: ['ppg', 'penguins', 'consol', 'civic arena'] },
  { name: 'Market Square', coord: [-80.0019, 40.442], aliases: ['market square'] },
  { name: 'Strip District', coord: [-79.979, 40.4505], aliases: ['the strip', 'strip'] },
  { name: 'Point State Park', coord: [-80.0071, 40.4418], aliases: ['the point', 'point park', 'point state'] },
  { name: 'University of Pittsburgh', coord: [-79.9533, 40.4444], aliases: ['pitt', 'cathedral of learning', 'oakland'] },
  { name: 'Carnegie Mellon University', coord: [-79.9436, 40.4433], aliases: ['cmu', 'carnegie mellon'] },
  { name: 'Duquesne University', coord: [-79.991, 40.436], aliases: ['duquesne', 'dukes'] },
  { name: 'Carnegie Science Center', coord: [-80.0177, 40.4458], aliases: ['science center'] },
  { name: 'Phipps Conservatory', coord: [-79.9478, 40.4388], aliases: ['phipps'] },
  { name: 'Pittsburgh Zoo', coord: [-79.9214, 40.4676], aliases: ['zoo', 'ppg aquarium'] },
  { name: 'Station Square', coord: [-80.0075, 40.434], aliases: ['station square'] },
  { name: 'South Side', coord: [-79.977, 40.4284], aliases: ['south side', 'east carson', 'carson street'] },
  { name: 'Schenley Park', coord: [-79.943, 40.436], aliases: ['schenley'] },
  { name: 'Downtown', coord: [-79.9959, 40.4406], aliases: ['downtown', 'golden triangle', 'cbd', 'the triangle'] },
  { name: 'Bakery Square', coord: [-79.9208, 40.4559], aliases: ['bakery square', 'google pittsburgh'] },
  { name: 'Lawrenceville', coord: [-79.9609, 40.4668], aliases: ['lawrenceville', 'lville'] },
  { name: 'Mount Washington', coord: [-80.01, 40.4312], aliases: ['mt washington', 'mount washington', 'grandview'] },
  { name: 'Heinz History Center', coord: [-79.992, 40.4466], aliases: ['history center', 'heinz history'] },
  { name: 'David L. Lawrence Convention Center', coord: [-79.995, 40.444], aliases: ['convention center', 'dlcc'] },
  { name: "Children's Museum", coord: [-80.009, 40.4485], aliases: ["children's museum", 'childrens museum'] }
];

// Find a landmark by loose text match (name or alias contains the query).
export function matchLandmark(text) {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  for (const lm of LANDMARKS) {
    if (lm.name.toLowerCase() === q) return lm;
    if (lm.aliases.some((a) => a === q)) return lm;
  }
  for (const lm of LANDMARKS) {
    if (lm.name.toLowerCase().includes(q) || lm.aliases.some((a) => q.includes(a) || a.includes(q))) {
      return lm;
    }
  }
  return null;
}
