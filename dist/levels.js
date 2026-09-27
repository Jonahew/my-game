// Level definitions with shared platform geometry, crystals, patrols, and scenery

export const LEVELS = [
  {
    id: 1,
    name: 'Crystal Garden',
    subtitle: 'The Ancient Courtyard',
    description: 'Gather six energy crystals scattered across four celestial islands. Watch for the sentinel drones guarding the stone walkways.',
    unlockRequirement: null,
    crystalCount: 6,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 14, y: 0, z: 16 },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Starting Garden' },
      { x: 14, z: 0, radius: 6.0, name: 'Eastern Terrace' },
      { x: 0, z: 14, radius: 6.0, name: 'Western Grove' },
      { x: 14, z: 14, radius: 6.0, name: 'Portal Sanctuary' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 10, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 0, start: 4, end: 10, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 14, start: 4, end: 10, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 14, start: 4, end: 10, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-3, 0], [3, 0], [14, -3], [17, 1], [-2, 14], [3, 16]
    ],
    patrols: [
      { axis: 'x', fixedCoord: 0, base: 7, amp: 2.1, speed: 1.2, phase: 0, y: 0.85 },
      { axis: 'z', fixedCoord: 0, base: 7, amp: 2.1, speed: 1.2, phase: 1, y: 0.85 },
      { axis: 'z', fixedCoord: 14, base: 7, amp: 2.1, speed: 1.2, phase: 2, y: 0.85 },
    ],
    obstacles: [
      [-2.8, 2.5, 0.46], [2.8, 2.5, 0.46],
      [11.2, 2.5, 0.46], [16.8, 2.5, 0.46],
      [-2.8, 16.5, 0.46], [2.8, 16.5, 0.46],
      [11.2, 16.5, 0.46], [16.8, 16.5, 0.46],
      [-2, -2, 0.7], [11.5, 12, 0.9]
    ],
    scenery: [
      { type: 'Bench', x: 11.5, y: 0, z: 12, height: 1.0 },
      { type: 'Crate', x: -2, y: 0, z: -2, height: 0.75 },
    ]
  },
  {
    id: 2,
    name: 'Skyway Crossing',
    subtitle: 'The Zigzag Causeway',
    description: 'Traverse an extended archipelago high above the cloudline. The sentinels fly with deliberate, measured sweeps — time your passage carefully.',
    unlockRequirement: 'Complete Level 1 (Crystal Garden) to unlock',
    crystalCount: 6,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 32, y: 0, z: 34 },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Sanctuary Isle' },
      { x: 16, z: 0, radius: 6.0, name: 'East Pier' },
      { x: 16, z: 16, radius: 6.0, name: 'High Pivot' },
      { x: 32, z: 16, radius: 6.0, name: 'Causeway Bluff' },
      { x: 32, z: 32, radius: 6.0, name: 'Gateway Spire' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 5, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 5, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 21, end: 27, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 32, start: 21, end: 27, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2],
      [8, 0],
      [16, -2],
      [18, 16],
      [24, 16],
      [34, 14],
    ],
    patrols: [
      { axis: 'x', fixedCoord: 0, base: 8, amp: 2.5, speed: 0.9, phase: 0, y: 0.85 },
      { axis: 'z', fixedCoord: 16, base: 8, amp: 2.5, speed: 0.85, phase: 1.5, y: 0.85 },
      { axis: 'x', fixedCoord: 16, base: 24, amp: 2.5, speed: 1.0, phase: 3.0, y: 0.85 },
    ],
    obstacles: [
      [-2.8, 2.5, 0.46], [2.8, 2.5, 0.46],
      [13.2, 2.5, 0.46], [18.8, 2.5, 0.46],
      [13.2, 18.5, 0.46], [18.8, 18.5, 0.46],
      [29.2, 18.5, 0.46], [34.8, 18.5, 0.46],
      [29.2, 34.5, 0.46], [34.8, 34.5, 0.46],
      [-2, -2, 0.7], [13.5, 14, 0.9], [30, 29, 0.85]
    ],
    scenery: [
      { type: 'Bench', x: 13.5, y: 0, z: 14, height: 1.0 },
      { type: 'Bench', x: 30, y: 0, z: 14, height: 1.0 },
      { type: 'Crate', x: -2, y: 0, z: -2, height: 0.75 },
      { type: 'Crate', x: 18, y: 0, z: -2, height: 0.75 },
    ]
  },
  {
    id: 3,
    name: 'The Far Garden',
    subtitle: 'The Celestial Summit',
    description: 'A grand floating labyrinth with branching skyways, secluded groves, and multiple paths to the apex portal. Master your route and claim the final sanctuary.',
    unlockRequirement: 'Complete Level 2 (Skyway Crossing) to unlock',
    crystalCount: 7,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 16, y: 0, z: 34 },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'South Haven' },
      { x: 16, z: 0, radius: 6.0, name: 'East Pergola' },
      { x: 0, z: 16, radius: 6.0, name: 'West Arboretum' },
      { x: 16, z: 16, radius: 6.0, name: 'Central Conservatory' },
      { x: 0, z: 32, radius: 6.0, name: 'Starlight Bluff' },
      { x: 16, z: 32, radius: 6.0, name: 'Celestial Summit' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 5, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 0, start: 5, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 5, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 5, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 0, start: 21, end: 27, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 21, end: 27, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 32, start: 5, end: 11, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-3, 0],
      [16, -2],
      [-2, 16],
      [16, 16],
      [8, 16],
      [-2, 32],
      [14, 30],
    ],
    patrols: [
      { axis: 'x', fixedCoord: 0, base: 8, amp: 2.5, speed: 1.1, phase: 0, y: 0.85 },
      { axis: 'z', fixedCoord: 0, base: 8, amp: 2.5, speed: 1.0, phase: 1.2, y: 0.85 },
      { axis: 'z', fixedCoord: 0, base: 24, amp: 2.5, speed: 1.15, phase: 2.4, y: 0.85 },
      { axis: 'z', fixedCoord: 16, base: 24, amp: 2.5, speed: 1.1, phase: 0.8, y: 0.85 },
    ],
    obstacles: [
      [-2.8, 2.5, 0.46], [2.8, 2.5, 0.46],
      [13.2, 2.5, 0.46], [18.8, 2.5, 0.46],
      [-2.8, 18.5, 0.46], [2.8, 18.5, 0.46],
      [13.2, 18.5, 0.46], [18.8, 18.5, 0.46],
      [-2.8, 34.5, 0.46], [2.8, 34.5, 0.46],
      [13.2, 34.5, 0.46], [18.8, 34.5, 0.46],
      [-2, -2, 0.7], [13.5, 14, 0.9], [13.5, 30, 0.9]
    ],
    scenery: [
      { type: 'Bench', x: 13.5, y: 0, z: 14, height: 1.0 },
      { type: 'Bench', x: -2, y: 0, z: 14, height: 1.0 },
      { type: 'Bench', x: 13.5, y: 0, z: 30, height: 1.0 },
      { type: 'Crate', x: -2, y: 0, z: -2, height: 0.75 },
      { type: 'Crate', x: 18, y: 0, z: -2, height: 0.75 },
      { type: 'Crate', x: -2, y: 0, z: 30, height: 0.75 },
    ]
  }
];

export function getLevel(id) {
  const found = LEVELS.find(l => l.id === id);
  return found || LEVELS[0];
}

/**
 * Computes current patrol positions for a level at time t.
 * Returns array of objects: { x, y, z }
 */
export function getPatrolPositions(level, t) {
  if (!level || !level.patrols) return [];
  return level.patrols.map(p => {
    const s = Math.sin(t * p.speed + p.phase) * p.amp;
    const y = p.y ?? 0.85;
    if (p.axis === 'x') {
      return { x: p.base + s, y, z: p.fixedCoord };
    } else {
      return { x: p.fixedCoord, y, z: p.base + s };
    }
  });
}
