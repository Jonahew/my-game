import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { Garden, LEVELS, getLevel, getPatrolPositions, COLLISION_CONFIG } from './logic.js';
import {
  loadProgress,
  isLevelUnlocked,
  isLevelCompleted,
  unlockLevel,
  recordCompletion,
  resetProgress
} from './storage.js';

// DOM selector shorthand
const $ = id => document.getElementById(id);
const canvas = $('world');

// Game Engine State
let currentLevelId = 1;
const state = new Garden(currentLevelId);
const keys = new Set();

// Three.js Core Variables
let renderer, scene, camera, sun;
let hero, heroShield, portalGem, portalFrame;
let levelGroup, collisionDebugGroup;
let gemModels = [], droneModels = [];
let yaw = Math.PI + 0.25, pitch = 0.58;
let started = false, drag = null, jump = false;
let audio, sound = false, noticeTimer;
let previousMode = 'ready';
let debugOverlayEnabled = false;
let newlyUnlockedLevel = null;
let selectedMapLevel = 1;

const models = {};
const clock = new THREE.Clock();

// UI Notifications
function message(text, duration = 2800) {
  const notice = $('notice');
  notice.textContent = text;
  notice.classList.add('show');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove('show'), duration);
}

// Audio Chime Synthesizer
function chime(freq, duration = 0.3, type = 'sine') {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.08, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + duration);
  } catch (e) {}
}

// Helper to instantiate cloned GLB models with shadow casting
function model(name, x, y, z, height = 0) {
  const root = new THREE.Group();
  if (!models[name]) return root;
  const o = models[name].clone(true);
  root.add(o);
  const b = new THREE.Box3().setFromObject(o);
  const size = b.getSize(new THREE.Vector3());
  const c = b.getCenter(new THREE.Vector3());
  const s = height ? height / size.y : 1;
  o.scale.multiplyScalar(s);
  o.position.add(new THREE.Vector3(-c.x * s, -b.min.y * s, -c.z * s));
  o.traverse(n => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  root.position.set(x, y, z);
  levelGroup.add(root);
  return root;
}

// Format seconds into MM:SS
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Build / Rebuild Level Scene from Level Definition
function buildLevelScene(levelId) {
  currentLevelId = levelId;
  const level = getLevel(levelId);
  state.loadLevel(levelId);

  // Clean up previous level objects from levelGroup
  if (levelGroup) {
    while (levelGroup.children.length > 0) {
      const child = levelGroup.children[0];
      levelGroup.remove(child);
      child.traverse?.(node => {
        if (node.geometry) node.geometry.dispose();
      });
    }
  }

  gemModels = [];
  droneModels = [];

  // 1. Build Islands
  for (const isl of level.islands) {
    const island = model('Island', isl.x, 0, isl.z);
    const box = new THREE.Box3().setFromObject(island);
    island.position.y -= box.max.y;

    // Island natural vegetation and lamps
    for (const dx of [-2.8, 2.8]) {
      model('Tree', isl.x + dx, 0, isl.z + 2.5, 3.2);
      model('Rock', isl.x + dx, 0, isl.z + 1.5, 0.65);
    }
    model('Bracken', isl.x - 3.1, 0, isl.z - 2, 0.7);
    model('Bluebell', isl.x + 3.1, 0, isl.z - 2, 0.75);
    model('Lamp', isl.x - 2, 0, isl.z - 3.1, 1.2);

    // Decorative inner courtyard path
    for (let zz = -3; zz <= 3; zz++) {
      for (const xx of [-0.5, 0.5]) {
        model('Path', isl.x + xx, 0.008, isl.z + zz, 0.08);
      }
    }
  }

  // 2. Build Bridges from shared definition
  for (const b of level.bridges) {
    const lanes = b.lanes || [-0.5, 0.5];
    if (b.axis === 'x') {
      for (let i = b.start; i <= b.end; i++) {
        for (const lane of lanes) {
          model('Path', i, -0.23, b.fixedCoord + lane);
        }
      }
    } else {
      for (let i = b.start; i <= b.end; i++) {
        for (const lane of lanes) {
          model('Path', b.fixedCoord + lane, -0.23, i);
        }
      }
    }
  }

  // 3. Build Scenery (Benches, Crates, etc.)
  if (level.scenery) {
    for (const sc of level.scenery) {
      model(sc.type, sc.x, sc.y, sc.z, sc.height);
    }
  }

  // 4. Build Portal
  portalFrame = model('Portal', level.portal.x, level.portal.y, level.portal.z, 3.0);
  portalGem = model('Crystal', level.portal.x, level.portal.y + 0.7, level.portal.z, 1.4);
  portalGem.visible = false;

  // 5. Build Crystals
  gemModels = level.crystals.map(([x, z]) => model('Crystal', x, 0.2, z, 0.95));

  // 6. Build UFO Sentinel Drones
  const patrolStart = getPatrolPositions(level, 0);
  droneModels = patrolStart.map(p => model('Drone', p.x, p.y, p.z, 0.65));

  // 7. Update Hero Position
  if (hero) {
    hero.position.set(state.x, state.y, state.z);
    hero.rotation.y = Math.PI;
  }

  // 8. Rebuild Developer Collision Shapes
  buildCollisionDebugShapes(level);

  // Update HUD Level Badge
  $('level-badge').textContent = `LVL ${level.id} · ${level.name.toUpperCase()}`;
  $('pause-level-info').textContent = `${level.name} — ${level.subtitle}`;

  // Sun focus
  if (sun) {
    sun.target.position.set(level.islands[0].x + 7, 0, level.islands[0].z + 7);
  }
}

// Build Developer Collision Wireframe Geometries
function buildCollisionDebugShapes(level) {
  if (collisionDebugGroup) {
    while (collisionDebugGroup.children.length > 0) {
      const child = collisionDebugGroup.children[0];
      collisionDebugGroup.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  // Materials
  const islandMat = new THREE.MeshBasicMaterial({ color: 0x3bc7b4, wireframe: true });
  const bridgeMat = new THREE.MeshBasicMaterial({ color: 0x8bffdf, wireframe: true });
  const ufoMat = new THREE.MeshBasicMaterial({ color: 0xffd166, wireframe: true });
  const playerMat = new THREE.MeshBasicMaterial({ color: 0xff8484, wireframe: true });
  const footMat = new THREE.MeshBasicMaterial({ color: 0x8bffdf, wireframe: true });

  // 1. Island Wireframes
  for (const isl of level.islands) {
    const geo = new THREE.CylinderGeometry(isl.radius, isl.radius, 0.2, 32);
    const m = new THREE.Mesh(geo, islandMat);
    m.position.set(isl.x, 0.1, isl.z);
    collisionDebugGroup.add(m);
  }

  // 2. Bridge Wireframes
  for (const b of level.bridges) {
    let widthX, widthZ, cx, cz;
    if (b.axis === 'x') {
      widthX = (b.end - b.start + 1.0);
      widthZ = 2.0;
      cx = (b.start + b.end) / 2;
      cz = b.fixedCoord;
    } else {
      widthX = 2.0;
      widthZ = (b.end - b.start + 1.0);
      cx = b.fixedCoord;
      cz = (b.start + b.end) / 2;
    }
    const geo = new THREE.BoxGeometry(widthX, 0.2, widthZ);
    const m = new THREE.Mesh(geo, bridgeMat);
    m.position.set(cx, 0.05, cz);
    collisionDebugGroup.add(m);
  }

  // 3. Player Collision Cylinder & Footprint Ring
  const playerGeo = new THREE.CylinderGeometry(COLLISION_CONFIG.playerRadius, COLLISION_CONFIG.playerRadius, COLLISION_CONFIG.playerHeight, 16);
  const playerDbgMesh = new THREE.Mesh(playerGeo, playerMat);
  playerDbgMesh.name = 'debugPlayer';
  collisionDebugGroup.add(playerDbgMesh);

  const footGeo = new THREE.RingGeometry(COLLISION_CONFIG.footprintRadius - 0.03, COLLISION_CONFIG.footprintRadius, 24);
  footGeo.rotateX(-Math.PI / 2);
  const footDbgMesh = new THREE.Mesh(footGeo, footMat);
  footDbgMesh.name = 'debugFootprint';
  collisionDebugGroup.add(footDbgMesh);

  // 4. UFO Drones Collision Cylinders
  droneModels.forEach((_, i) => {
    const geo = new THREE.CylinderGeometry(COLLISION_CONFIG.ufoRadius, COLLISION_CONFIG.ufoRadius, COLLISION_CONFIG.ufoHeight, 16);
    const m = new THREE.Mesh(geo, ufoMat);
    m.name = `debugUfo_${i}`;
    collisionDebugGroup.add(m);
  });

  collisionDebugGroup.visible = debugOverlayEnabled;
}

// Toggle Developer Collision Overlay
function toggleCollisionOverlay(forced) {
  debugOverlayEnabled = typeof forced === 'boolean' ? forced : !debugOverlayEnabled;
  if (collisionDebugGroup) {
    collisionDebugGroup.visible = debugOverlayEnabled;
  }
  const btn = $('debug-overlay-btn');
  btn.textContent = debugOverlayEnabled ? 'Overlay: ON' : 'Overlay: Off';
  btn.style.borderColor = debugOverlayEnabled ? '#ffd166' : 'rgba(255, 209, 102, 0.3)';

  const panel = $('debug-panel');
  if (debugOverlayEnabled) {
    panel.classList.remove('hidden');
    message('Developer Collision Overlay Enabled');
  } else {
    panel.classList.add('hidden');
  }
}

// Sync HUD and UI State
function sync() {
  const active = state.mode === 'playing';
  document.body.classList.toggle('playing', active);

  $('pause').disabled = !started;
  $('pause').textContent = active ? 'Ⅱ' : '▷';
  $('energy').textContent = `◇ ${state.collected.size} / ${state.crystalCount}`;
  $('lives').textContent = '♥ '.repeat(Math.max(0, state.lives)).trim() || '—';
  $('lives').setAttribute('aria-label', `${state.lives} lives remaining`);
  $('timer').textContent = formatTime(state.time);

  // Invulnerability shield HUD
  const isInvuln = state.time < state.hurtUntil;
  $('shield-indicator').classList.toggle('hidden', !isInvuln);

  if (state.portalActive) {
    $('objective').textContent = 'PORTAL ACTIVE · STEP INTO THE PORTAL';
  } else {
    $('objective').textContent = `COLLECT ALL ${state.crystalCount} CRYSTALS`;
  }

  // Handle Mode Change transitions
  if (state.mode === previousMode) return;
  const oldMode = previousMode;
  previousMode = state.mode;

  if (state.mode === 'won') {
    handleLevelCompletion();
  } else if (state.mode === 'lost') {
    $('eyebrow').textContent = 'ENERGY DEPLETED · TRY A DIFFERENT ROUTE';
    $('heading').innerHTML = 'Signal<br><i>lost.</i>';
    $('description').textContent = 'Your explorer ran out of energy. A fresh journey awaits.';
    $('begin').textContent = 'Restart Level Attempt';
    $('panel').classList.remove('hidden');
  } else if (state.mode === 'paused') {
    $('pause-modal').classList.remove('hidden');
  } else if (state.mode === 'playing') {
    $('pause-modal').classList.add('hidden');
    $('panel').classList.add('hidden');
    $('completion-modal').classList.add('hidden');
  }
}

// Handle Level Victory & Progression
function handleLevelCompletion() {
  const completionTime = Math.round(state.time * 10) / 10;
  recordCompletion(currentLevelId, completionTime);

  // Check next level unlock
  let nextLevel = null;
  if (currentLevelId === 1) {
    unlockLevel(2);
    newlyUnlockedLevel = 2;
    nextLevel = getLevel(2);
  } else if (currentLevelId === 2) {
    unlockLevel(3);
    newlyUnlockedLevel = 3;
    nextLevel = getLevel(3);
  }

  const save = loadProgress();
  const bestTime = save.bestTimes[currentLevelId];

  // If final level (Level 3) completed, show Adventure Complete
  if (currentLevelId === 3) {
    chime(1200, 0.6);
    setTimeout(() => chime(1500, 0.8), 200);
    $('adventure-modal').classList.remove('hidden');
    return;
  }

  // Fill in completion modal data
  chime(950, 0.4);
  setTimeout(() => chime(1200, 0.6), 220);

  $('comp-crystals').textContent = `${state.collected.size} / ${state.crystalCount}`;
  $('comp-time').textContent = formatTime(completionTime);
  $('comp-best').textContent = formatTime(bestTime);

  const announce = $('unlock-announcement');
  if (nextLevel) {
    announce.classList.remove('hidden');
    $('unlock-name').textContent = `${nextLevel.name} — ${nextLevel.subtitle}`;
    $('comp-next-btn').classList.remove('hidden');
  } else {
    announce.classList.add('hidden');
    $('comp-next-btn').classList.add('hidden');
  }

  $('completion-modal').classList.remove('hidden');
}

// Start / Begin current level
function begin() {
  if (!hero) return;
  state.start();
  started = true;
  keys.clear();
  jump = false;
  $('panel').classList.add('hidden');
  $('pause-modal').classList.add('hidden');
  $('completion-modal').classList.add('hidden');
  $('adventure-modal').classList.add('hidden');
  $('map-modal').classList.add('hidden');
  sync();
  chime(480);
  canvas.focus();
}

// Interactive Level Map Open & Sync
function openLevelMap() {
  if (state.mode === 'playing') {
    state.pause();
  }
  $('pause-modal').classList.add('hidden');
  $('completion-modal').classList.add('hidden');
  const prog = loadProgress();

  // Populate Island Node States
  LEVELS.forEach(lvl => {
    const node = $(`map-node-${lvl.id}`);
    if (!node) return;

    node.classList.remove('unlocked', 'completed', 'locked', 'selected', 'new-unlock');

    const unlocked = isLevelUnlocked(lvl.id, prog);
    const completed = isLevelCompleted(lvl.id, prog);

    if (completed) {
      node.classList.add('completed');
    } else if (unlocked) {
      node.classList.add('unlocked');
    } else {
      node.classList.add('locked');
    }

    if (newlyUnlockedLevel === lvl.id) {
      node.classList.add('new-unlock');
    }

    if (lvl.id === selectedMapLevel) {
      node.classList.add('selected');
    }
  });

  // Connecting Paths
  $('map-path-1-2')?.classList.toggle('active', isLevelUnlocked(2, prog));
  $('map-path-2-3')?.classList.toggle('active', isLevelUnlocked(3, prog));

  updateMapCard(selectedMapLevel);
  $('map-modal').classList.remove('hidden');
}

function selectMapLevel(id) {
  selectedMapLevel = id;
  const prog = loadProgress();
  LEVELS.forEach(lvl => {
    const node = $(`map-node-${lvl.id}`);
    node?.classList.toggle('selected', lvl.id === id);
  });
  updateMapCard(id);
  chime(520, 0.15);
}

function updateMapCard(id) {
  const lvl = getLevel(id);
  const prog = loadProgress();
  const unlocked = isLevelUnlocked(id, prog);
  const completed = isLevelCompleted(id, prog);
  const bestTime = prog.bestTimes[id];

  $('card-title').textContent = `${lvl.name}`;
  $('card-subtitle').textContent = lvl.subtitle;
  $('card-description').textContent = lvl.description;
  $('card-objective').textContent = `◇ ${lvl.crystalCount} Energy Crystals`;

  const badge = $('card-state-badge');
  badge.className = 'badge';
  if (completed) {
    badge.textContent = '✓ COMPLETED';
    badge.classList.add('completed');
  } else if (unlocked) {
    badge.textContent = '✦ UNLOCKED';
    badge.classList.add('unlocked');
  } else {
    badge.textContent = '🔒 LOCKED';
    badge.classList.add('locked');
  }

  $('card-best-time').textContent = bestTime !== undefined ? `Best: ${formatTime(bestTime)}` : 'Best: —';

  const lockReason = $('card-lock-reason');
  const playBtn = $('card-play-btn');

  if (unlocked) {
    lockReason.classList.add('hidden');
    playBtn.disabled = false;
    playBtn.textContent = completed ? 'Replay Garden' : 'Enter Garden';
    playBtn.onclick = () => {
      $('map-modal').classList.add('hidden');
      buildLevelScene(id);
      begin();
    };
  } else {
    lockReason.classList.remove('hidden');
    lockReason.textContent = lvl.unlockRequirement || 'Locked';
    playBtn.disabled = true;
    playBtn.textContent = 'Garden Locked';
    playBtn.onclick = null;
  }
}

// Reset Progress confirmation handling
function promptResetProgress() {
  $('confirm-reset-modal').classList.remove('hidden');
}

// Initialize Three.js Scene and Load Models
async function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#29253b');
  scene.fog = new THREE.Fog('#29253b', 42, 110);
  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 160);

  scene.add(new THREE.HemisphereLight('#d1e5ec', '#423749', 2.1));
  sun = new THREE.DirectionalLight('#ffe1b4', 3.2);
  sun.position.set(-12, 32, -16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 110 });
  scene.add(sun.target);
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00015;
  scene.add(sun);

  levelGroup = new THREE.Group();
  scene.add(levelGroup);

  collisionDebugGroup = new THREE.Group();
  scene.add(collisionDebugGroup);

  // Load all 13 models
  const loader = new GLTFLoader();
  const names = ['Explorer', 'Drone', 'Crystal', 'Portal', 'Tree', 'Rock', 'Island', 'Path', 'Crate', 'Lamp', 'Bracken', 'Bluebell', 'Bench'];
  let done = 0;
  await Promise.all(names.map(async n => {
    models[n] = (await loader.loadAsync(`./models/${n}.glb`)).scene;
    $('begin').textContent = `Growing your garden… ${Math.round((++done / names.length) * 100)}%`;
  }));

  // Build Player Explorer
  hero = model('Explorer', 0, 0, -2, 1.65);
  hero.rotation.y = Math.PI;

  // Invulnerability shield aura mesh
  const shieldGeo = new THREE.SphereGeometry(0.85, 16, 12);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x8bffdf,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  heroShield = new THREE.Mesh(shieldGeo, shieldMat);
  heroShield.visible = false;
  scene.add(heroShield);

  // Build Level 1 by default
  buildLevelScene(1);

  $('begin').disabled = false;
  $('begin').textContent = 'Begin exploring';

  // Read-only model context tool for agent debugging
  const context = document.modelContext;
  if (context?.registerTool) {
    try {
      Promise.resolve(context.registerTool({
        name: 'read_garden_state',
        description: 'Read the current Crystal Garden game status.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute() { return state.snapshot(); }
      })).catch(() => {});
    } catch (e) {}
  }

  resize();
  setupEventListeners();
  renderer.setAnimationLoop(frame);
}

// Event Listeners for UI, Controls, and Keyboard
function setupEventListeners() {
  $('begin').onclick = begin;
  $('open-map-intro').onclick = openLevelMap;
  $('map-btn').onclick = openLevelMap;
  $('close-map-btn').onclick = () => $('map-modal').classList.add('hidden');

  $('pause').onclick = () => {
    if (state.mode === 'playing') state.pause();
    else if (state.mode === 'paused') state.start();
    sync();
  };

  $('sound').onclick = () => {
    sound = !sound;
    $('sound').textContent = sound ? 'Sound on' : 'Sound off';
    $('sound').setAttribute('aria-pressed', String(sound));
    chime(520);
  };

  $('debug-overlay-btn').onclick = () => toggleCollisionOverlay();

  // Pause menu buttons
  $('pause-resume-btn').onclick = () => {
    $('pause-modal').classList.add('hidden');
    state.start();
    sync();
  };
  $('pause-restart-btn').onclick = () => {
    $('pause-modal').classList.add('hidden');
    state.reset();
    begin();
  };
  $('pause-map-btn').onclick = () => {
    $('pause-modal').classList.add('hidden');
    openLevelMap();
  };

  // Completion buttons
  $('comp-next-btn').onclick = () => {
    $('completion-modal').classList.add('hidden');
    if (currentLevelId < 3) {
      buildLevelScene(currentLevelId + 1);
      begin();
    }
  };
  $('comp-map-btn').onclick = () => {
    $('completion-modal').classList.add('hidden');
    openLevelMap();
  };
  $('comp-replay-btn').onclick = () => {
    $('completion-modal').classList.add('hidden');
    state.reset();
    begin();
  };

  // Adventure complete buttons
  $('adv-map-btn').onclick = () => {
    $('adventure-modal').classList.add('hidden');
    openLevelMap();
  };
  $('adv-replay-btn').onclick = () => {
    $('adventure-modal').classList.add('hidden');
    buildLevelScene(3);
    begin();
  };

  // Reset Progress confirmation
  $('reset-progress-btn').onclick = promptResetProgress;
  $('confirm-reset-cancel').onclick = () => $('confirm-reset-modal').classList.add('hidden');
  $('confirm-reset-yes').onclick = () => {
    resetProgress();
    $('confirm-reset-modal').classList.add('hidden');
    selectedMapLevel = 1;
    newlyUnlockedLevel = null;
    openLevelMap();
    message('Saved progress reset to defaults');
  };

  // Map Node Clicks
  [1, 2, 3].forEach(id => {
    const node = $(`map-node-${id}`);
    node?.addEventListener('click', () => selectMapLevel(id));
    node?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectMapLevel(id);
      }
    });
  });

  // Global Keyboard Navigation
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'Escape') {
      if (!$('map-modal').classList.contains('hidden')) {
        $('map-modal').classList.add('hidden');
      } else if (!$('completion-modal').classList.contains('hidden')) {
        $('completion-modal').classList.add('hidden');
      } else if (state.mode === 'playing') {
        state.pause();
      } else if (state.mode === 'paused') {
        state.start();
      }
      sync();
    }
    if (e.code === 'KeyM') {
      if ($('map-modal').classList.contains('hidden')) openLevelMap();
      else $('map-modal').classList.add('hidden');
    }
    if (e.code === 'KeyO') {
      toggleCollisionOverlay();
    }
    if (e.code === 'KeyR' && ['won', 'lost'].includes(state.mode)) {
      begin();
    }
    if (e.code === 'Space' && !keys.has('Space')) {
      jump = true;
    }
    keys.add(e.code);
  });

  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    jump = false;
    state.pause();
    sync();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      keys.clear();
      state.pause();
      sync();
    }
  });

  // Orbit camera drag controls
  canvas.tabIndex = 0;
  canvas.oncontextmenu = e => e.preventDefault();
  canvas.addEventListener('pointerdown', e => {
    if (state.mode === 'playing') {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return;
    yaw -= (e.clientX - drag.x) * 0.007;
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * 0.004, 0.25, 1.05);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  canvas.addEventListener('pointerup', () => drag = null);
  canvas.addEventListener('pointercancel', () => drag = null);

  // Touch on-screen d-pad buttons
  document.querySelectorAll('[data-key]').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys.add(b.dataset.key);
      if (b.dataset.key === 'Space') jump = true;
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      b.addEventListener(event, () => keys.delete(b.dataset.key));
    }
  });
}

function resize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// Main Game Render & Physics Loop
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  // Movement input translation relative to camera yaw
  const moveX = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const moveZ = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const dx = -Math.sin(yaw) * moveZ + Math.cos(yaw) * moveX;
  const dz = -Math.cos(yaw) * moveZ - Math.sin(yaw) * moveX;

  state.step(dt, { x: dx, z: dz, jump, run: keys.has('ShiftLeft') || keys.has('ShiftRight') });
  jump = false;

  // Hero position & orientation
  if (hero) {
    const bob = state.mode === 'playing' && (moveX || moveZ) && state.y === 0 ? Math.sin(state.time * 16) * 0.035 : 0;
    hero.position.set(state.x, state.y + bob, state.z);

    if (state.mode === 'playing' && (dx || dz)) {
      const angle = Math.atan2(dx, dz);
      hero.rotation.y += Math.atan2(Math.sin(angle - hero.rotation.y), Math.cos(angle - hero.rotation.y)) * Math.min(1, dt * 12);
    }

    // Invulnerability visual feedback: blinking + glowing energy shield
    const isInvulnerable = state.time < state.hurtUntil;
    hero.visible = !(isInvulnerable && Math.floor(state.time * 12) % 2 === 0);

    if (heroShield) {
      heroShield.visible = isInvulnerable;
      heroShield.position.set(state.x, state.y + 0.82, state.z);
      heroShield.rotation.y = state.time * 2.5;
    }
  }

  // Animate Crystals
  gemModels.forEach((m, i) => {
    m.visible = !state.collected.has(i);
    m.rotation.y = state.time * 1.1;
    m.position.y = 0.2 + Math.sin(state.time * 2 + i) * 0.13;
  });

  // Animate UFO Sentinels
  const currentPatrols = getPatrolPositions(state.level, state.time);
  currentPatrols.forEach((p, i) => {
    if (droneModels[i]) {
      droneModels[i].position.set(p.x, p.y + Math.sin(state.time * 3 + i) * 0.08, p.z);
    }
  });

  // Portal state & animation
  if (portalGem) {
    portalGem.visible = state.portalActive;
    portalGem.rotation.y = state.time * 1.8;
    portalGem.position.y = state.level.portal.y + 0.7 + Math.sin(state.time * 3) * 0.08;
  }
  if (portalFrame) {
    portalFrame.rotation.y = Math.sin(state.time * 0.5) * 0.05;
  }

  // Developer Collision Overlay Mesh Updates
  if (debugOverlayEnabled && collisionDebugGroup) {
    const playerDbg = collisionDebugGroup.getObjectByName('debugPlayer');
    if (playerDbg) {
      playerDbg.position.set(state.x, state.y + COLLISION_CONFIG.playerHeight / 2 + COLLISION_CONFIG.playerYOffset, state.z);
    }
    const footDbg = collisionDebugGroup.getObjectByName('debugFootprint');
    if (footDbg) {
      footDbg.position.set(state.x, 0.02, state.z);
    }
    currentPatrols.forEach((p, i) => {
      const ufoDbg = collisionDebugGroup.getObjectByName(`debugUfo_${i}`);
      if (ufoDbg) {
        ufoDbg.position.set(p.x, p.y + COLLISION_CONFIG.ufoHeight / 2 + COLLISION_CONFIG.ufoYOffset, p.z);
      }
    });

    // Update Live Debug Readout
    $('dbg-player-pos').textContent = `${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)}`;
    $('dbg-ground').textContent = state.isGround(state.x, state.z) ? 'YES' : 'FALLING';
    $('dbg-ground').style.color = state.isGround(state.x, state.z) ? '#8bffdf' : '#ff8484';
    $('dbg-invuln').textContent = state.time < state.hurtUntil ? `YES (${(state.hurtUntil - state.time).toFixed(1)}s)` : 'NO';
    $('dbg-invuln').style.color = state.time < state.hurtUntil ? '#ffd166' : '#a0a0b0';

    let minUfoDist = 999;
    currentPatrols.forEach(p => {
      const d = Math.hypot(state.x - p.x, state.z - p.z);
      if (d < minUfoDist) minUfoDist = d;
    });
    $('dbg-ufo-dist').textContent = `${minUfoDist.toFixed(2)}m (hit < 0.72m)`;
  }

  // Audio & Event handling
  for (const event of state.events) {
    if (event === 'gem') {
      chime(650 + state.collected.size * 90);
      message(`${state.collected.size} of ${state.crystalCount} crystals recovered`);
    } else if (event === 'portal-activated') {
      chime(1050, 0.5);
      message('PORTAL ACTIVE! Return to the ancient gateway.');
    } else if (event === 'hurt') {
      chime(110, 0.4, 'sawtooth');
      message('Energy lost! Returned to sanctuary.');
    }
  }

  // Smooth Third-Person Orbit Camera
  const target = started ? new THREE.Vector3(state.x, state.y + 1, state.z) : new THREE.Vector3(6, 0, 7);
  const distance = started ? 9 : 35;
  const desired = target.clone().add(new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance
  ));
  camera.position.lerp(desired, started ? 1 - Math.exp(-8 * dt) : 1);
  camera.lookAt(target);

  sync();
  renderer.render(scene, camera);
}

// Initialize and handle fatal load errors
init().catch(e => {
  console.error('Failed to initialize Crystal Garden:', e);
  $('eyebrow').textContent = 'GARDEN COULD NOT LOAD';
  $('heading').innerHTML = 'Let’s try<br><i>again.</i>';
  $('description').textContent = 'Check your connection and ensure WebGL is enabled in your browser.';
  $('begin').textContent = 'Reload garden';
  $('begin').disabled = false;
  $('begin').onclick = () => location.reload();
});
