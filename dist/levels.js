// Level definitions for Crystal Garden: Solar System Adventure
// 8 Sequential destinations: Crystal Garden -> Moon -> Mars -> Jupiter -> Saturn -> Uranus -> Neptune -> Pluto

export const LEVELS = [
  // LEVEL 1: CRYSTAL GARDEN
  {
    id: 1,
    name: 'Crystal Garden',
    subtitle: 'The Ancient Courtyard',
    destinationType: 'garden',
    classification: 'Starting World',
    gravity: 20,
    targetTime: 45,
    description: 'Gather six energy crystals scattered across four celestial islands. Watch for the sentinel drones guarding the stone walkways.',
    unlockRequirement: null,
    crystalCount: 6,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 14, y: 0, z: 16 },
    relic: { x: -4, y: 0.5, z: 14, name: 'Sunstone Core' },
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
    enemyType: 'ufo',
    enemyName: 'Sentinel Drone',
    enemyModel: 'Drone',
    enemyIntel: 'Patrols bridge routes in predictable sinusoidal sweeps. Jump over or time your crossings through safe gaps.',
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
    ],
    theme: {
      skyColor: 0x4fa2e8,
      fogColor: 0x7ecbf0,
      fogNear: 25,
      fogFar: 65,
      sunColor: 0xffffff,
      sunIntensity: 1.1,
      ambientColor: 0x7090b0,
      terrainColor: 0x405328,
      pathColor: 0xbfa378,
      skyFeature: 'clouds',
    }
  },

  // LEVEL 2: MOON
  {
    id: 2,
    name: 'The Moon',
    subtitle: 'Mare Tranquillitatis',
    destinationType: 'moon',
    classification: 'Earth’s Natural Satellite',
    gravity: 10, // Noticeably lower gravity!
    targetTime: 45,
    description: 'Traverse gray regolith and basalt craters under a pitch-black starry sky, with the blue marble Earth hanging overhead. Watch for Lunar Hoppers that telegraph landing zones.',
    unlockRequirement: 'Complete Level 1 (Crystal Garden)',
    crystalCount: 6,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 28, y: 0, z: 28 },
    relic: { x: 18, y: 0.5, z: 18, name: 'Apollo Lunar Core' },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Lander Base' },
      { x: 14, z: 0, radius: 5.5, name: 'Mare Basin' },
      { x: 14, z: 14, radius: 6.0, name: 'Central Crater' },
      { x: 28, z: 14, radius: 5.5, name: 'Highlands Spur' },
      { x: 28, z: 28, radius: 6.0, name: 'Telemetry Spire' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 10, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 14, start: 4, end: 10, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 14, start: 18, end: 24, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 28, start: 18, end: 24, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2], [12, -2], [16, 2], [14, 16], [26, 12], [28, 24]
    ],
    enemyType: 'hopper',
    enemyName: 'Lunar Hopper',
    enemyModel: 'Hopper',
    enemyIntel: 'Charges its spring leg and projects a visible red landing reticle on the regolith before leaping. Move out of the landing radius before it slams down.',
    hoppers: [
      { id: 'h1', x: 14, z: 7, homeX: 14, homeZ: 7, targetX: 14, targetZ: 14, radius: 1.8, state: 'idle', timer: 1.0 },
      { id: 'h2', x: 21, z: 14, homeX: 21, homeZ: 14, targetX: 28, targetZ: 14, radius: 1.8, state: 'idle', timer: 2.2 },
    ],
    obstacles: [
      [-2.5, 2.5, 0.5], [11.5, 2.5, 0.5], [16.5, 11.5, 0.5], [26.0, 16.0, 0.5]
    ],
    scenery: [
      { type: 'Rock', x: -2, y: 0, z: -2, height: 0.8 },
      { type: 'Rock', x: 16, y: 0, z: -2, height: 0.9 },
      { type: 'Crate', x: 12, y: 0, z: 12, height: 0.75 },
    ],
    theme: {
      skyColor: 0x010206,
      fogColor: 0x05070f,
      fogNear: 35,
      fogFar: 85,
      sunColor: 0xf0f4ff,
      sunIntensity: 1.3,
      ambientColor: 0x424957,
      terrainColor: 0x6e737d,
      pathColor: 0x9fa4ab,
      skyFeature: 'earth',
    }
  },

  // LEVEL 3: MARS
  {
    id: 3,
    name: 'Mars',
    subtitle: 'Valles Marineris Gateway',
    destinationType: 'mars',
    classification: 'Terrestrial Planet',
    gravity: 16,
    targetTime: 50,
    description: 'Rust-red dusty canyons and basalt ridges under a salmon sky. Autonomous Survey Rovers sweep forward scanning cones — evade their gaze or evade their charge.',
    unlockRequirement: 'Complete Level 2 (Moon)',
    crystalCount: 6,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 30, y: 0, z: 30 },
    relic: { x: -3.0, y: 0.5, z: 18.0, name: 'Martian Silicate Fossil' },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Chryse Base' },
      { x: 15, z: 0, radius: 5.5, name: 'Ochre Ridge' },
      { x: 0, z: 16, radius: 5.5, name: 'Canyon Lookout' },
      { x: 15, z: 16, radius: 6.0, name: 'Rover Depot' },
      { x: 30, z: 16, radius: 5.5, name: 'Volcano Vista' },
      { x: 30, z: 30, radius: 6.0, name: 'Olympus Portal' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 4, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 19, end: 26, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 30, start: 19, end: 26, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2], [14, -2], [0, 16], [15, 14], [28, 14], [30, 26]
    ],
    enemyType: 'rover',
    enemyName: 'Survey Rover',
    enemyModel: 'Rover',
    enemyIntel: 'Projects a visible sensor cone. If you cross into its beam, its alarm sounds and it surges along the causeway in pursuit. Step aside to let it pass into recovery.',
    rovers: [
      { id: 'r1', x: 8, z: 0, dir: 1, range: 4.5, base: 8, axis: 'x', fixedCoord: 0, state: 'scan', timer: 0 },
      { id: 'r2', x: 22, z: 16, dir: 1, range: 4.5, base: 22, axis: 'x', fixedCoord: 16, state: 'scan', timer: 0 },
    ],
    obstacles: [
      [-2.5, 2.5, 0.5], [13.5, 2.5, 0.5], [13.5, 18.5, 0.5], [28.0, 18.5, 0.5]
    ],
    scenery: [
      { type: 'Rock', x: -2, y: 0, z: 14, height: 1.1 },
      { type: 'Rock', x: 18, y: 0, z: 14, height: 0.9 },
      { type: 'Crate', x: 15, y: 0, z: -2, height: 0.75 },
    ],
    theme: {
      skyColor: 0xb55a36,
      fogColor: 0x8a381c,
      fogNear: 25,
      fogFar: 70,
      sunColor: 0xffd1ad,
      sunIntensity: 1.0,
      ambientColor: 0x8f4528,
      terrainColor: 0xa84120,
      pathColor: 0xc46944,
      skyFeature: 'volcano',
    }
  },

  // LEVEL 4: JUPITER
  {
    id: 4,
    name: 'Jupiter',
    subtitle: 'Great Red Spot Aerostation',
    destinationType: 'jupiter',
    classification: 'Gas Giant (Floating Platforms)',
    gravity: 20,
    targetTime: 55,
    description: 'Suspended orbital research platforms floating thousands of kilometers above Jupiter’s violent swirling gas bands. Storm Drones build electrical charges before releasing pulse waves.',
    unlockRequirement: 'Complete Level 3 (Mars)',
    crystalCount: 7,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 32, y: 0, z: 32 },
    relic: { x: 28, y: 0.5, z: 28, name: 'Jovian Lightning Core' },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Docking Aerostat' },
      { x: 16, z: 0, radius: 5.5, name: 'Ion Lab Alpha' },
      { x: 16, z: 16, radius: 6.5, name: 'Turbulence Hub' },
      { x: 0, z: 16, radius: 5.5, name: 'Plasma Array' },
      { x: 32, z: 16, radius: 5.5, name: 'Storm Gantry' },
      { x: 32, z: 32, radius: 6.0, name: 'Red Spot Outpost' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 20, end: 28, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 32, start: 20, end: 28, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2], [14, -2], [18, 2], [16, 14], [-2, 16], [30, 14], [32, 28]
    ],
    enemyType: 'storm_drone',
    enemyName: 'Storm Drone',
    enemyModel: 'StormDrone',
    enemyIntel: 'Charges spinning induction rings with a visible purple aura. When fully charged, it emits an expanding shockwave pulse ring. Stay out of the pulse boundary until it discharges.',
    stormDrones: [
      { id: 'sd1', x: 8, z: 0, state: 'charge', timer: 1.5, maxRadius: 3.2 },
      { id: 'sd2', x: 24, z: 16, state: 'charge', timer: 3.0, maxRadius: 3.4 },
      { id: 'sd3', x: 16, z: 8, state: 'charge', timer: 0.8, maxRadius: 3.0 },
    ],
    obstacles: [
      [14.0, 14.0, 0.5], [18.0, 18.0, 0.5], [30.0, 18.0, 0.5]
    ],
    scenery: [
      { type: 'Bench', x: 14, y: 0, z: 14, height: 1.0 },
      { type: 'Crate', x: -2, y: 0, z: -2, height: 0.75 },
    ],
    theme: {
      skyColor: 0x8a5420,
      fogColor: 0x59320e,
      fogNear: 25,
      fogFar: 75,
      sunColor: 0xffd999,
      sunIntensity: 0.9,
      ambientColor: 0x734820,
      terrainColor: 0x6e4822,
      pathColor: 0xb58045,
      skyFeature: 'jupiter_storm',
    }
  },

  // LEVEL 5: SATURN
  {
    id: 5,
    name: 'Saturn',
    subtitle: 'Cassini Ringway Platform',
    destinationType: 'saturn',
    classification: 'Gas Giant (Orbital Platforms)',
    gravity: 20,
    targetTime: 55,
    description: 'Modular orbital stations cantilevered high above Saturn’s majestic rings. Ring Skimmers glide along luminous curved trajectory ribbons.',
    unlockRequirement: 'Complete Level 4 (Jupiter)',
    crystalCount: 7,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 30, y: 0, z: 30 },
    relic: { x: 14, y: 0.5, z: 32, name: 'Cassini Ring Crystal' },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Terminal Sol' },
      { x: 16, z: 0, radius: 5.5, name: 'Kepler Spur' },
      { x: 0, z: 16, radius: 5.5, name: 'Ring Observation Deck' },
      { x: 16, z: 16, radius: 6.0, name: 'Huygens Node' },
      { x: 16, z: 32, radius: 5.5, name: 'Ring Shard Array' },
      { x: 30, z: 30, radius: 6.0, name: 'Enceladus Vista Portal' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 20, end: 28, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 30, start: 19, end: 26, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2], [14, -2], [0, 14], [16, 14], [14, 18], [16, 28], [29, 30]
    ],
    enemyType: 'skimmer',
    enemyName: 'Ring Skimmer',
    enemyModel: 'RingSkimmer',
    enemyIntel: 'Follows clearly projected curved flight trajectory ribbons over the bridges. Observe its rhythmic loops and cross during open intervals.',
    skimmers: [
      { id: 's1', cx: 8, cz: 0, rx: 3.5, rz: 1.4, speed: 1.2, phase: 0, y: 0.85 },
      { id: 's2', cx: 16, cz: 8, rx: 1.4, rz: 3.5, speed: 1.1, phase: 1.6, y: 0.85 },
      { id: 's3', cx: 16, cz: 24, rx: 1.4, rz: 3.5, speed: 1.3, phase: 3.2, y: 0.85 },
    ],
    obstacles: [
      [14.0, 14.0, 0.5], [18.0, 14.0, 0.5], [28.0, 28.0, 0.5]
    ],
    scenery: [
      { type: 'Bench', x: 14, y: 0, z: 18, height: 1.0 },
      { type: 'Crate', x: -2, y: 0, z: -2, height: 0.75 },
    ],
    theme: {
      skyColor: 0x0a0c14,
      fogColor: 0x141824,
      fogNear: 35,
      fogFar: 85,
      sunColor: 0xfff2cc,
      sunIntensity: 1.0,
      ambientColor: 0x6e6347,
      terrainColor: 0x807352,
      pathColor: 0xcca85a,
      skyFeature: 'saturn_rings',
    }
  },

  // LEVEL 6: URANUS
  {
    id: 6,
    name: 'Uranus',
    subtitle: 'The Tilted Giant',
    destinationType: 'uranus',
    classification: 'Ice Giant (Floating Platforms)',
    gravity: 18,
    targetTime: 50,
    description: 'Cyan research platforms suspended above pale methane clouds, with faint tilted rings slicing the horizon. Wind Sentinels project directional gusts that push unsuspecting explorers.',
    unlockRequirement: 'Complete Level 5 (Saturn)',
    crystalCount: 7,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 30, y: 0, z: 30 },
    relic: { x: -3, y: 0.5, z: 20, name: 'Axial Magnetosphere Sphere' },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Sub-Zero Quay' },
      { x: 15, z: 0, radius: 5.5, name: 'Atmosphere Pylon' },
      { x: 0, z: 16, radius: 5.5, name: 'Jetstream Bluff' },
      { x: 15, z: 16, radius: 6.5, name: 'Centrifuge Deck' },
      { x: 30, z: 16, radius: 5.5, name: 'Tilted Ring Spar' },
      { x: 30, z: 30, radius: 6.0, name: 'Borealis Portal' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 4, end: 11, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 19, end: 26, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 30, start: 19, end: 26, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2], [14, -2], [0, 14], [15, 16], [16, 18], [28, 14], [30, 28]
    ],
    enemyType: 'sentinel',
    enemyName: 'Wind Sentinel',
    enemyModel: 'WindSentinel',
    enemyIntel: 'Charges its ducted turbine and projects an illuminated wind arrow. It unleashes a gust that pushes you sideways. Take cover behind solid crates or press forward against the airflow.',
    sentinels: [
      { id: 'ws1', x: 8, z: 0, dirX: 0, dirZ: 1, state: 'idle', timer: 1.5, gustForce: 6.5, range: 4.5 },
      { id: 'ws2', x: 23, z: 16, dirX: 0, dirZ: -1, state: 'idle', timer: 2.8, gustForce: 6.5, range: 4.5 },
    ],
    obstacles: [
      [8.0, 1.2, 0.45], [23.0, 14.8, 0.45], [15.0, 14.0, 0.5]
    ],
    scenery: [
      { type: 'Crate', x: 8, y: 0, z: 1.2, height: 0.75 },
      { type: 'Crate', x: 23, y: 0, z: 14.8, height: 0.75 },
      { type: 'Bench', x: 13, y: 0, z: 14, height: 1.0 },
    ],
    theme: {
      skyColor: 0x2e757d,
      fogColor: 0x489aa3,
      fogNear: 25,
      fogFar: 75,
      sunColor: 0xd6f7fa,
      sunIntensity: 0.9,
      ambientColor: 0x47858c,
      terrainColor: 0x3d7075,
      pathColor: 0x76b5ba,
      skyFeature: 'uranus_rings',
    }
  },

  // LEVEL 7: NEPTUNE
  {
    id: 7,
    name: 'Neptune',
    subtitle: 'Dark Spot Outpost',
    destinationType: 'neptune',
    classification: 'Ice Giant (Floating Platforms)',
    gravity: 20,
    targetTime: 50,
    description: 'Suspended in Neptune’s deep azure upper cloud layers, with supersonic storms and icy cirrus clouds racing past. Tempest Hunters lock targeting lines before executing lightning dashes.',
    unlockRequirement: 'Complete Level 6 (Uranus)',
    crystalCount: 7,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 30, y: 0, z: 30 },
    relic: { x: 32.5, y: 0.5, z: 14.5, name: 'Great Dark Spot Pearl' },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'Storm Anchorage' },
      { x: 16, z: 0, radius: 5.5, name: 'Methane Pier' },
      { x: 16, z: 16, radius: 6.5, name: 'Vortex Research Lab' },
      { x: 0, z: 16, radius: 5.5, name: 'Supersonic Gantry' },
      { x: 30, z: 16, radius: 5.5, name: 'Triton Uplink' },
      { x: 30, z: 30, radius: 6.0, name: 'Abyssal Gateway' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 20, end: 26, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 30, start: 20, end: 26, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2], [14, -2], [18, 2], [16, 14], [-2, 16], [28, 14], [30, 26]
    ],
    enemyType: 'hunter',
    enemyName: 'Tempest Hunter',
    enemyModel: 'TempestHunter',
    enemyIntel: 'Freezes in midair and projects a crimson targeting laser beam along its flight path. After a 1.4-second warning, it rockets forward. Evade the line of fire.',
    hunters: [
      { id: 'th1', x: 8, z: 0, dirX: 1, dirZ: 0, length: 7, state: 'aim', timer: 1.4, originX: 4, originZ: 0, targetX: 12, targetZ: 0 },
      { id: 'th2', x: 23, z: 16, dirX: 1, dirZ: 0, length: 7, state: 'aim', timer: 2.2, originX: 19, originZ: 16, targetX: 27, targetZ: 16 },
    ],
    obstacles: [
      [14.0, 14.0, 0.5], [18.0, 18.0, 0.5], [28.0, 18.0, 0.5]
    ],
    scenery: [
      { type: 'Bench', x: 14, y: 0, z: 14, height: 1.0 },
      { type: 'Crate', x: -2, y: 0, z: -2, height: 0.75 },
    ],
    theme: {
      skyColor: 0x0f2152,
      fogColor: 0x162c6e,
      fogNear: 25,
      fogFar: 75,
      sunColor: 0xb5d4ff,
      sunIntensity: 0.85,
      ambientColor: 0x2a448a,
      terrainColor: 0x213a7a,
      pathColor: 0x4870bf,
      skyFeature: 'neptune_clouds',
    }
  },

  // LEVEL 8: PLUTO
  {
    id: 8,
    name: 'Pluto',
    subtitle: 'Tombaugh Regio Plains',
    destinationType: 'pluto',
    classification: 'Dwarf Planet (Kuiper Belt)',
    gravity: 8, // Ultra low gravity!
    targetTime: 60,
    description: 'The outermost frontier: vast nitrogen ice plains, towering water-ice mountains, and a distant brilliant pinprick Sun. Frost Crawlers coat the walkways in visibly slippery frost patches.',
    unlockRequirement: 'Complete Level 7 (Neptune)',
    crystalCount: 8,
    spawn: { x: 0, y: 0, z: -2 },
    portal: { x: 32, y: 0, z: 32 },
    relic: { x: 16, y: 0.5, z: 34, name: 'Heart of Pluto (Tombaugh)' },
    islands: [
      { x: 0, z: 0, radius: 6.0, name: 'New Horizons Base' },
      { x: 16, z: 0, radius: 5.5, name: 'Sputnik Planitia' },
      { x: 0, z: 16, radius: 5.5, name: 'Hillary Montes' },
      { x: 16, z: 16, radius: 6.5, name: 'Cryo Glacier' },
      { x: 16, z: 32, radius: 5.5, name: 'Norgay Peak' },
      { x: 32, z: 16, radius: 5.5, name: 'Charon Viewpoint' },
      { x: 32, z: 32, radius: 6.5, name: 'Solar Apex Portal' },
    ],
    bridges: [
      { axis: 'x', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 0, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 4, end: 12, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 16, start: 20, end: 28, lanes: [-0.5, 0.5] },
      { axis: 'x', fixedCoord: 16, start: 20, end: 28, lanes: [-0.5, 0.5] },
      { axis: 'z', fixedCoord: 32, start: 20, end: 28, lanes: [-0.5, 0.5] },
    ],
    crystals: [
      [-2, 2], [14, -2], [0, 14], [16, 14], [14, 18], [16, 30], [30, 14], [30, 30]
    ],
    enemyType: 'crawler',
    enemyName: 'Frost Crawler',
    enemyModel: 'FrostCrawler',
    enemyIntel: 'Low multi-legged crawler that disperses visible cryogenic ice patches. Step around the patches to avoid sliding out of control in Pluto’s microgravity.',
    crawlers: [
      { id: 'fc1', x: 8, z: 0, base: 8, axis: 'x', fixedCoord: 0, speed: 0.8, amp: 2.2, phase: 0 },
      { id: 'fc2', x: 16, z: 8, base: 8, axis: 'z', fixedCoord: 16, speed: 0.8, amp: 2.2, phase: 1.5 },
      { id: 'fc3', x: 24, z: 16, base: 24, axis: 'x', fixedCoord: 16, speed: 0.85, amp: 2.2, phase: 3.0 },
    ],
    obstacles: [
      [-2.5, 2.5, 0.5], [13.5, 2.5, 0.5], [13.5, 14.5, 0.5], [29.0, 14.5, 0.5], [29.0, 30.5, 0.5]
    ],
    scenery: [
      { type: 'Rock', x: -2, y: 0, z: -2, height: 1.0 },
      { type: 'Rock', x: 14, y: 0, z: -2, height: 1.2 },
      { type: 'Rock', x: 18, y: 0, z: 30, height: 1.1 },
      { type: 'Crate', x: 12, y: 0, z: 12, height: 0.75 },
    ],
    theme: {
      skyColor: 0x020206,
      fogColor: 0x060812,
      fogNear: 35,
      fogFar: 85,
      sunColor: 0xf5f8ff,
      sunIntensity: 0.7,
      ambientColor: 0x3d4957,
      terrainColor: 0x7a8e9e,
      pathColor: 0xa8c0d4,
      skyFeature: 'distant_sun',
    }
  }
];

export function getLevel(id) {
  const found = LEVELS.find(l => l.id === id);
  return found || LEVELS[0];
}

/**
 * Computes patrol positions for levels with standard patrols or crawlers
 */
export function getPatrolPositions(level, t) {
  if (!level) return [];
  if (level.patrols) {
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
  if (level.crawlers) {
    return level.crawlers.map(p => {
      const s = Math.sin(t * p.speed + p.phase) * p.amp;
      const y = 0.35;
      if (p.axis === 'x') {
        return { x: p.base + s, y, z: p.fixedCoord };
      } else {
        return { x: p.fixedCoord, y, z: p.base + s };
      }
    });
  }
  return [];
}
