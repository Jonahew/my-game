import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { Garden, LEVELS, getLevel, getPatrolPositions, COLLISION_CONFIG } from './logic.js';
import {
  loadProgress,
  isLevelUnlocked,
  isLevelCompleted,
  unlockLevel,
  recordCompletion,
  resetProgress,
  resetAppearance,
  resetAllProgression,
  equipCosmetic,
  unlockCosmetic
} from './storage.js';
import {
  COSMETICS,
  COSMETIC_CATEGORIES,
  getCosmetic,
  getCosmeticsByCategory,
  evaluateRewards
} from './cosmetics.js';

// DOM selector shorthand
const $ = id => document.getElementById(id);
const canvas = $('world');

// Game Engine State
let currentLevelId = 1;
const state = new Garden(currentLevelId);
const keys = new Set();

// Three.js Core Variables
let renderer, scene, camera, sun, hemiLight;
let hero, heroShield, portalGem, portalFrame, relicModel;
let levelGroup, collisionDebugGroup, backdropGroup, particlesGroup;
let gemModels = [], enemyModels = [], icePatchMeshes = [];
let yaw = Math.PI + 0.25, pitch = 0.58;
let started = false, drag = null, jump = false;
let audio, sound = false, noticeTimer, rewardToastTimer;
let previousMode = 'ready';
let debugOverlayEnabled = false;
let newlyUnlockedLevel = null;
let selectedMapLevel = 1;
let currentCustomCategory = 'body';

// 3D Preview Turntable Variables
let previewRenderer, previewScene, previewCamera, previewHero;
let previewYaw = 0.4, previewPitch = 0.2, previewDrag = null;

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

function showRewardToast(item) {
  $('toast-item-name').textContent = item.name;
  $('toast-item-desc').textContent = item.description;
  const toast = $('reward-toast');
  toast.classList.remove('hidden');

  $('toast-equip-btn').onclick = () => {
    equipCosmetic(item.category, item.id);
    applyCosmeticsToModel(hero);
    applyCosmeticsToModel(previewHero);
    renderCustomizationCatalog();
    toast.classList.add('hidden');
    message(`Equipped ${item.name}!`);
  };

  $('toast-later-btn').onclick = () => {
    toast.classList.add('hidden');
  };

  clearTimeout(rewardToastTimer);
  rewardToastTimer = setTimeout(() => toast.classList.add('hidden'), 7000);
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

// Helper to create cloned GLB models with shadow casting
function createModel(name, x, y, z, height = 0) {
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
  return root;
}

// Helper to create level-bound models that are cleared on level changes
function model(name, x, y, z, height = 0) {
  const root = createModel(name, x, y, z, height);
  levelGroup.add(root);
  return root;
}

// Format seconds into MM:SS
function formatTime(secs) {
  if (secs === undefined || secs === null) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${ms}`;
}

// --- COSMETIC APPLICATION ON EXPLORER 3D MODEL ---
function applyCosmeticsToModel(characterGroup) {
  if (!characterGroup) return;
  const save = loadProgress();
  const eq = save.equippedCosmetics;

  // 1. Apply Body Finish Color
  const bodyItem = getCosmetic(eq.body);
  if (bodyItem && bodyItem.color) {
    characterGroup.traverse(node => {
      if (node.isMesh && node.material) {
        // Suit body meshes are ivory or teal
        if (node.name.includes('Ivory') || node.material.name === 'Ivory') {
          node.material = node.material.clone();
          node.material.color = new THREE.Color(bodyItem.color);
        } else if (node.name.includes('Teal') || node.material.name === 'Teal') {
          node.material = node.material.clone();
          node.material.color = new THREE.Color(bodyItem.accentColor || '#12a39a');
        }
      }
    });
  }

  // 2. Apply Visor & Optics Glow Color
  const visorItem = getCosmetic(eq.visor);
  const visorGlowHex = visorItem?.glowColor || '#ffae33';
  characterGroup.traverse(node => {
    if (node.isMesh && node.material) {
      if (node.name.includes('Glow') || node.material.name === 'Glow') {
        node.material = node.material.clone();
        node.material.color = new THREE.Color(visorGlowHex);
        if (node.material.emissive) {
          node.material.emissive = new THREE.Color(visorGlowHex);
        }
      }
    }
  });

  // 3. Remove existing modular attachments
  const toRemove = [];
  characterGroup.children.forEach(c => {
    if (c.userData.isAttachment) toRemove.push(c);
  });
  toRemove.forEach(c => characterGroup.remove(c));

  // 4. Attach 3D Visor Optics Shield (physically contoured to helmet temples and face)
  if (visorItem) {
    const visorGroup = new THREE.Group();
    visorGroup.userData.isAttachment = true;
    const visorColor = new THREE.Color(visorGlowHex);

    // Side temple hinge pivots connected directly into helmet ear nodes
    const hingeMat = new THREE.MeshStandardMaterial({ color: 0x1f2630, roughness: 0.4, metalness: 0.8 });
    const hingeGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.06, 12);
    const hingeL = new THREE.Mesh(hingeGeo, hingeMat);
    hingeL.rotation.z = Math.PI / 2;
    hingeL.position.set(-0.47, 1.13, 0.08);
    const hingeR = new THREE.Mesh(hingeGeo, hingeMat);
    hingeR.rotation.z = Math.PI / 2;
    hingeR.position.set(0.47, 1.13, 0.08);
    visorGroup.add(hingeL, hingeR);

    // Contoured visor side arms following helmet curvature
    const armMat = new THREE.MeshStandardMaterial({ color: 0x242d38, roughness: 0.4, metalness: 0.6 });
    const armGeo = new THREE.BoxGeometry(0.032, 0.040, 0.28);
    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.42, 1.14, 0.21);
    armL.rotation.y = -0.22;
    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(0.42, 1.14, 0.21);
    armR.rotation.y = 0.22;
    visorGroup.add(armL, armR);

    // Front brow frame resting across forehead
    const browGeo = new THREE.BoxGeometry(0.72, 0.038, 0.05);
    const browMesh = new THREE.Mesh(browGeo, armMat);
    browMesh.position.set(0, 1.22, 0.35);
    visorGroup.add(browMesh);

    // Curved HUD optical glass lens shield
    const lensGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.16, 24, 1, true, -Math.PI * 0.38, Math.PI * 0.76);
    const lensMat = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorColor,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.set(0, 1.14, 0.06);
    visorGroup.add(lensMesh);

    characterGroup.add(visorGroup);
  }

  // 5. Toggle built-in beacon antenna visibility and Attach Custom Headpiece / Antenna
  characterGroup.traverse(node => {
    if (node.name === 'Teal005' || node.name === 'Glow002') {
      node.visible = (eq.antenna === 'antenna_default');
    }
  });

  const antennaItem = getCosmetic(eq.antenna);
  if (antennaItem && eq.antenna !== 'antenna_default') {
    const headGroup = new THREE.Group();
    headGroup.userData.isAttachment = true;

    // Solid mounting collar and gimbal anchoring firmly into the helmet crown at y = 1.35
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x1c232d, roughness: 0.4, metalness: 0.85 });
    const collarGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.04, 14);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 1.36, 0);
    headGroup.add(collar);

    const stemGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10);
    const stem = new THREE.Mesh(stemGeo, collarMat);
    stem.position.set(0, 1.40, 0);
    headGroup.add(stem);

    if (antennaItem.modelName && models[antennaItem.modelName]) {
      // Anchored directly onto the mounting gimbal at y = 1.40 with zero floating gap
      const headgear = createModel(antennaItem.modelName, 0, 1.40, 0, 0.34);
      headGroup.add(headgear);
    } else {
      // Procedural telemetry antennas for other unlocked styles
      if (eq.antenna === 'antenna_solar_mast') {
        const mastGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.30, 8);
        const mast = new THREE.Mesh(mastGeo, collarMat);
        mast.position.set(0, 1.55, 0);
        const camGeo = new THREE.BoxGeometry(0.11, 0.07, 0.09);
        const cam = new THREE.Mesh(camGeo, collarMat);
        cam.position.set(0, 1.70, 0.03);
        const lensGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10);
        const lens = new THREE.Mesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0xff334b }));
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 1.70, 0.08);
        headGroup.add(mast, cam, lens);
      } else if (eq.antenna === 'antenna_storm_coils') {
        for (const x of [-0.07, 0.07]) {
          const coilGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.25, 8);
          const coil = new THREE.Mesh(coilGeo, collarMat);
          coil.position.set(x, 1.52, 0);
          const tipGeo = new THREE.SphereGeometry(0.035, 8, 8);
          const tip = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0xc742ff }));
          tip.position.set(x, 1.65, 0);
          headGroup.add(coil, tip);
        }
      } else if (eq.antenna === 'antenna_axial') {
        const sweptGeo = new THREE.CylinderGeometry(0.018, 0.01, 0.34, 8);
        const swept = new THREE.Mesh(sweptGeo, collarMat);
        swept.rotation.z = 0.45;
        swept.rotation.x = -0.2;
        swept.position.set(0.07, 1.54, -0.04);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2bf7ff }));
        tip.position.set(0.16, 1.68, -0.08);
        headGroup.add(swept, tip);
      } else if (eq.antenna === 'antenna_frost') {
        for (const x of [-0.08, 0.08]) {
          const spikeGeo = new THREE.ConeGeometry(0.028, 0.28, 6);
          const spike = new THREE.Mesh(spikeGeo, new THREE.MeshStandardMaterial({ color: 0xd4ebf7, roughness: 0.1, metalness: 0.4 }));
          spike.rotation.z = x > 0 ? -0.18 : 0.18;
          spike.position.set(x, 1.52, 0);
          headGroup.add(spike);
        }
      }
    }
    characterGroup.add(headGroup);
  }

  // 6. Attach Backpack Gear (firmly mounted on the BACK of the suit, -Z direction)
  const backpackItem = getCosmetic(eq.backpack);
  if (backpackItem) {
    const packGroup = new THREE.Group();
    packGroup.userData.isAttachment = true;

    if (backpackItem.modelName && models[backpackItem.modelName]) {
      // Model packs (RoverPack, CloudPack, FrostPack)
      // Centered on back torso at Z = -0.26, Y = 0.25 (height 0.46)
      const packModel = createModel(backpackItem.modelName, 0, 0, 0, 0.46);
      packGroup.add(packModel);
    } else {
      // Procedural packs for items without prebaked GLB (Explorer Pack default, Lunar, Saturn, Uranus, Neptune)
      const packBodyGeo = new THREE.BoxGeometry(0.32, 0.36, 0.14);
      const packBodyMat = new THREE.MeshStandardMaterial({
        color: eq.backpack === 'backpack_lunar' ? 0xd0d8e4 :
               eq.backpack === 'backpack_saturn' ? 0xe2ba48 :
               eq.backpack === 'backpack_uranus' ? 0x4ac8d0 :
               eq.backpack === 'backpack_neptune' ? 0x1d4cb8 : 0x242e3a,
        roughness: 0.5,
        metalness: 0.3
      });
      const packBody = new THREE.Mesh(packBodyGeo, packBodyMat);
      packBody.position.set(0, 0.18, 0);
      packGroup.add(packBody);

      // Detail canisters / energy cells
      const cellGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.30, 10);
      const cellMat = new THREE.MeshStandardMaterial({
        color: eq.backpack === 'backpack_lunar' ? 0x8899aa :
               eq.backpack === 'backpack_saturn' ? 0xffd166 :
               eq.backpack === 'backpack_uranus' ? 0x2bf7ff :
               eq.backpack === 'backpack_neptune' ? 0x3b70ff : 0x12a39a,
        emissive: eq.backpack === 'backpack_default' ? 0x05403c : 0x112233,
        roughness: 0.3
      });
      const cellL = new THREE.Mesh(cellGeo, cellMat);
      cellL.position.set(-0.10, 0.18, -0.06);
      const cellR = new THREE.Mesh(cellGeo, cellMat);
      cellR.position.set(0.10, 0.18, -0.06);
      packGroup.add(cellL, cellR);
    }

    // Shoulder harness straps mounting pack to body
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x182028, roughness: 0.7 });
    const strapGeo = new THREE.BoxGeometry(0.04, 0.26, 0.24);
    const strapL = new THREE.Mesh(strapGeo, strapMat);
    strapL.position.set(-0.15, 0.18, 0.10);
    const strapR = new THREE.Mesh(strapGeo, strapMat);
    strapR.position.set(0.15, 0.18, 0.10);
    packGroup.add(strapL, strapR);

    // Position securely on the BACK (-Z direction, Z = -0.26, Y = 0.25)
    packGroup.position.set(0, 0.25, -0.26);
    characterGroup.add(packGroup);
  }

  // 7. Attach Suit Badge (firmly on the front chest lapel, +Z direction)
  const badgeItem = getCosmetic(eq.badge);
  if (badgeItem && badgeItem.icon && badgeItem.id !== 'badge_default') {
    const badgeGeo = new THREE.CircleGeometry(0.065, 16);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(0.12, 0.62, 0.26);
    badgeMesh.userData.isAttachment = true;
    characterGroup.add(badgeMesh);
  }

  // Update equipped labels in customization screen
  $('eq-body-name').textContent = getCosmetic(eq.body)?.name || 'Default';
  $('eq-visor-name').textContent = getCosmetic(eq.visor)?.name || 'Default';
  $('eq-antenna-name').textContent = getCosmetic(eq.antenna)?.name || 'Default';
  $('eq-backpack-name').textContent = getCosmetic(eq.backpack)?.name || 'Default';
  $('eq-badge-name').textContent = getCosmetic(eq.badge)?.name || 'Default';
  $('eq-trail-name').textContent = getCosmetic(eq.trail)?.name || 'None';
}

// Build Destination Celestial Backdrop & Environmental Sky
function buildCelestialBackdrop(level) {
  if (backdropGroup) {
    while (backdropGroup.children.length > 0) {
      const child = backdropGroup.children[0];
      backdropGroup.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  const feature = level.theme.skyFeature;

  if (feature === 'earth') {
    // The Moon: Earth visible hanging in the black sky
    const earthGeo = new THREE.SphereGeometry(7, 32, 24);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x2266cc,
      roughness: 0.8,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(-60, 48, -75);
    backdropGroup.add(earthMesh);

    // Earth atmosphere halo
    const haloGeo = new THREE.SphereGeometry(7.4, 32, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x8bffdf,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.copy(earthMesh.position);
    backdropGroup.add(haloMesh);
  } else if (feature === 'volcano') {
    // Mars: Distant Olympus Mons silhouettes
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(24 + i * 8, 20, 16);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0x6e2c14, roughness: 0.9 });
      const mountain = new THREE.Mesh(coneGeo, coneMat);
      mountain.position.set(-80 + i * 70, 0, -110 - i * 20);
      backdropGroup.add(mountain);
    }
  } else if (feature === 'jupiter_storm') {
    // Jupiter: Swirling clouds below floating research station
    const cloudGeo = new THREE.PlaneGeometry(300, 300, 16, 16);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x9e5f28,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.rotation.x = -Math.PI / 2;
    cloudMesh.position.y = -18;
    backdropGroup.add(cloudMesh);
  } else if (feature === 'saturn_rings') {
    // Saturn: Prominent view of Saturn and its rings
    const saturnGeo = new THREE.SphereGeometry(18, 32, 24);
    const saturnMat = new THREE.MeshStandardMaterial({ color: 0xd8c282, roughness: 0.7 });
    const saturnMesh = new THREE.Mesh(saturnGeo, saturnMat);
    saturnMesh.position.set(-65, 35, -95);
    backdropGroup.add(saturnMesh);

    const ringGeo = new THREE.RingGeometry(24, 44, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe875,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.8;
    ringMesh.rotation.y = -0.2;
    ringMesh.position.copy(saturnMesh.position);
    backdropGroup.add(ringMesh);
  } else if (feature === 'uranus_rings') {
    // Uranus: Tilted rings
    const uranusGeo = new THREE.SphereGeometry(14, 32, 24);
    const uranusMat = new THREE.MeshStandardMaterial({ color: 0x5cd4db, roughness: 0.6 });
    const uranusMesh = new THREE.Mesh(uranusGeo, uranusMat);
    uranusMesh.position.set(70, 32, -90);
    backdropGroup.add(uranusMesh);

    const ringGeo = new THREE.RingGeometry(18, 25, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xaef7fc, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.y = Math.PI / 2.1; // Almost 98 degree tilt!
    ringMesh.position.copy(uranusMesh.position);
    backdropGroup.add(ringMesh);
  } else if (feature === 'distant_sun') {
    // Pluto: Small distant brilliant pinprick Sun
    const sunDotGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const sunDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sunDot = new THREE.Mesh(sunDotGeo, sunDotMat);
    sunDot.position.set(-80, 50, -110);
    backdropGroup.add(sunDot);
  }
}

// Build / Rebuild Level Scene from Level Definition
function buildLevelScene(levelId) {
  currentLevelId = levelId;
  const level = getLevel(levelId);
  state.loadLevel(levelId);

  // Apply Environmental Lighting & Theme
  if (scene) {
    scene.background = new THREE.Color(level.theme.skyColor);
    scene.fog = new THREE.Fog(level.theme.fogColor, level.theme.fogNear, level.theme.fogFar);
  }
  if (sun) {
    sun.color = new THREE.Color(level.theme.sunColor);
    sun.intensity = level.theme.sunIntensity * 3.0;
  }
  if (hemiLight) {
    hemiLight.color = new THREE.Color(level.theme.ambientColor);
  }

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
  enemyModels = [];
  icePatchMeshes = [];

  // Build Celestial Backdrop
  buildCelestialBackdrop(level);

  // 1. Build Islands / Platforms
  for (const isl of level.islands) {
    const island = model('Island', isl.x, 0, isl.z);
    const box = new THREE.Box3().setFromObject(island);
    island.position.y -= box.max.y;

    // Apply destination platform material tinting
    island.traverse(node => {
      if (node.isMesh && node.material) {
        if (node.material.name === 'Grass') {
          node.material = node.material.clone();
          node.material.color = new THREE.Color(level.theme.terrainColor);
        }
      }
    });

    // Decorative natural landmarks or tech pylons
    if (level.destinationType === 'garden') {
      for (const dx of [-2.8, 2.8]) {
        model('Tree', isl.x + dx, 0, isl.z + 2.5, 3.2);
        model('Rock', isl.x + dx, 0, isl.z + 1.5, 0.65);
      }
      model('Bracken', isl.x - 3.1, 0, isl.z - 2, 0.7);
      model('Bluebell', isl.x + 3.1, 0, isl.z - 2, 0.75);
      model('Lamp', isl.x - 2, 0, isl.z - 3.1, 1.2);
    } else {
      // Rocky or high-tech planetary terrain
      model('Rock', isl.x - 2.8, 0, isl.z + 2.2, 0.9);
      model('Rock', isl.x + 2.8, 0, isl.z + 2.2, 0.8);
      model('Lamp', isl.x - 2.2, 0, isl.z - 2.8, 1.1);
    }

    // Inner walkways
    for (let zz = -3; zz <= 3; zz++) {
      for (const xx of [-0.5, 0.5]) {
        const p = model('Path', isl.x + xx, 0.008, isl.z + zz, 0.08);
        p.traverse(n => {
          if (n.isMesh && n.material) {
            n.material = n.material.clone();
            n.material.color = new THREE.Color(level.theme.pathColor);
          }
        });
      }
    }
  }

  // 2. Build Bridges / Walkways from shared definition
  for (const b of level.bridges) {
    const lanes = b.lanes || [-0.5, 0.5];
    if (b.axis === 'x') {
      for (let i = b.start; i <= b.end; i++) {
        for (const lane of lanes) {
          const p = model('Path', i, -0.23, b.fixedCoord + lane);
          p.traverse(n => {
            if (n.isMesh && n.material) {
              n.material = n.material.clone();
              n.material.color = new THREE.Color(level.theme.pathColor);
            }
          });
        }
      }
    } else {
      for (let i = b.start; i <= b.end; i++) {
        for (const lane of lanes) {
          const p = model('Path', b.fixedCoord + lane, -0.23, i);
          p.traverse(n => {
            if (n.isMesh && n.material) {
              n.material = n.material.clone();
              n.material.color = new THREE.Color(level.theme.pathColor);
            }
          });
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

  // 6. Build Hidden Planetary Relic
  if (level.relic) {
    relicModel = model('Relic', level.relic.x, level.relic.y, level.relic.z, 1.0);
  }

  // 7. Build Location-Specific Enemies
  if (level.destinationType === 'garden') {
    const patrolStart = getPatrolPositions(level, 0);
    enemyModels = patrolStart.map(p => model('Drone', p.x, p.y, p.z, 0.65));
  } else if (level.destinationType === 'moon') {
    enemyModels = (level.hoppers || []).map(h => {
      const m = model('Hopper', h.homeX, 0, h.homeZ, 1.35);
      // Warning reticle mesh attached
      const reticleGeo = new THREE.RingGeometry(h.radius - 0.2, h.radius, 32);
      const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff334b, side: THREE.DoubleSide });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.rotation.x = -Math.PI / 2;
      reticle.position.set(h.targetX, 0.05, h.targetZ);
      reticle.visible = false;
      levelGroup.add(reticle);
      m.userData.reticle = reticle;
      return m;
    });
  } else if (level.destinationType === 'mars') {
    enemyModels = (level.rovers || []).map(r => {
      const m = model('Rover', r.base, 0, r.fixedCoord, 0.95);
      // Sensor cone projection on ground
      const coneGeo = new THREE.ConeGeometry(3.6, 4.2, 16);
      const coneMat = new THREE.MeshBasicMaterial({ color: 0xff8484, transparent: true, opacity: 0.25, wireframe: true });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(r.base + (r.dir * 2.1), 0.05, r.fixedCoord);
      levelGroup.add(cone);
      m.userData.cone = cone;
      return m;
    });
  } else if (level.destinationType === 'jupiter') {
    enemyModels = (level.stormDrones || []).map(d => {
      const m = model('StormDrone', d.x, 1.0, d.z, 1.1);
      // Electrical expanding ring wave
      const pulseGeo = new THREE.RingGeometry(0.1, 0.35, 32);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xc742ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.rotation.x = -Math.PI / 2;
      pulse.position.set(d.x, 0.08, d.z);
      levelGroup.add(pulse);
      m.userData.pulse = pulse;
      return m;
    });
  } else if (level.destinationType === 'saturn') {
    enemyModels = (level.skimmers || []).map(sk => {
      const m = model('RingSkimmer', sk.cx, sk.y, sk.cz, 0.65);
      // Trajectory ribbon
      const curveGeo = new THREE.RingGeometry(sk.rx - 0.1, sk.rx + 0.1, 48);
      const curveMat = new THREE.MeshBasicMaterial({ color: 0xffe875, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
      const ribbon = new THREE.Mesh(curveGeo, curveMat);
      ribbon.rotation.x = -Math.PI / 2;
      ribbon.position.set(sk.cx, 0.03, sk.cz);
      levelGroup.add(ribbon);
      return m;
    });
  } else if (level.destinationType === 'uranus') {
    enemyModels = (level.sentinels || []).map(ws => {
      const m = model('WindSentinel', ws.x, 0.8, ws.z, 1.2);
      // Wind cone arrow
      const arrowGeo = new THREE.ConeGeometry(1.6, ws.range, 16);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x5cd4db, transparent: true, opacity: 0.3, wireframe: true });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = ws.dirZ > 0 ? -Math.PI / 2 : Math.PI / 2;
      arrow.position.set(ws.x, 0.1, ws.z + (ws.dirZ * ws.range * 0.5));
      levelGroup.add(arrow);
      m.userData.arrow = arrow;
      return m;
    });
  } else if (level.destinationType === 'neptune') {
    enemyModels = (level.hunters || []).map(th => {
      const m = model('TempestHunter', th.originX, 0.8, th.originZ, 0.85);
      // Targeting laser line
      const points = [new THREE.Vector3(th.originX, 0.2, th.originZ), new THREE.Vector3(th.targetX, 0.2, th.targetZ)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xff334b, linewidth: 2 });
      const line = new THREE.Line(lineGeo, lineMat);
      levelGroup.add(line);
      m.userData.line = line;
      return m;
    });
  } else if (level.destinationType === 'pluto') {
    const crawlerStart = getPatrolPositions(level, 0);
    enemyModels = crawlerStart.map(p => model('FrostCrawler', p.x, p.y, p.z, 0.65));
  }

  // 8. Update Hero Position & ensure hero is attached to scene
  if (!hero) {
    hero = createModel('Explorer', state.x, state.y, state.z, 1.65);
    hero.rotation.y = Math.PI;
    scene.add(hero);
  } else {
    if (hero.parent !== scene) {
      scene.add(hero);
    }
    hero.position.set(state.x, state.y, state.z);
    hero.rotation.y = Math.PI;
    hero.visible = true;
  }
  applyCosmeticsToModel(hero);

  // 9. Rebuild Developer Collision Shapes
  buildCollisionDebugShapes(level);

  // Update HUD
  $('level-badge').textContent = `LVL ${level.id} · ${level.name.toUpperCase()}`;
  $('gravity-badge').textContent = `g: ${level.gravity} m/s²`;
  $('dbg-dest-name').textContent = level.name;
  $('dbg-gravity').textContent = `g = ${level.gravity}.0 m/s²`;
  $('pause-level-info').textContent = `${level.name} — ${level.subtitle}`;

  // Reset relic indicator
  $('relic-indicator').classList.add('hidden');

  // Focus sun
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

  const footGeo = new THREE.RingGeometry(COLLISION_CONFIG.footprintRadius - 0.04, COLLISION_CONFIG.footprintRadius, 24);
  const footDbgMesh = new THREE.Mesh(footGeo, footMat);
  footDbgMesh.rotation.x = -Math.PI / 2;
  footDbgMesh.name = 'debugFootprint';
  collisionDebugGroup.add(footDbgMesh);

  collisionDebugGroup.visible = debugOverlayEnabled;
}

function toggleCollisionOverlay() {
  debugOverlayEnabled = !debugOverlayEnabled;
  if (collisionDebugGroup) {
    collisionDebugGroup.visible = debugOverlayEnabled;
  }
  const btn = $('debug-overlay-btn');
  btn.textContent = debugOverlayEnabled ? 'Overlay: On' : 'Overlay: Off';
  btn.classList.toggle('active', debugOverlayEnabled);
  $('debug-panel').classList.toggle('hidden', !debugOverlayEnabled);
  chime(debugOverlayEnabled ? 650 : 420);
}

// Update HUD & Modal DOM elements with game state
function sync() {
  $('energy').textContent = `◇ ${state.collected.size} / ${state.crystalCount}`;
  $('lives').textContent = '♥ '.repeat(Math.max(0, state.lives)).trim() || '—';
  $('lives').setAttribute('aria-label', `${state.lives} lives remaining`);
  $('timer').textContent = formatTime(state.time);

  const invuln = state.time < state.hurtUntil;
  $('shield-indicator').classList.toggle('hidden', !invuln);

  if (state.relicCollected) {
    $('relic-indicator').classList.remove('hidden');
  }

  const isPlaying = state.mode === 'playing';
  $('pause').disabled = !isPlaying && state.mode !== 'paused';
  $('pause').textContent = state.mode === 'paused' ? '▶ Resume' : '☰ Menu';
  $('pause').setAttribute('aria-label', state.mode === 'paused' ? 'Resume Expedition' : 'Open Main Menu');
  document.body.classList.toggle('playing', isPlaying || state.mode === 'paused');

  // Trigger win or loss dialogs
  if (state.mode === 'won' && previousMode !== 'won') {
    handleLevelWin();
  } else if (state.mode === 'lost' && previousMode !== 'lost') {
    chime(120, 0.7, 'sawtooth');
    message('Energy depleted! Returning to start.', 3200);
    setTimeout(() => {
      state.start();
      sync();
    }, 1800);
  }
  previousMode = state.mode;
}

// Handle Level Victory, Challenges, and Rewards
function handleLevelWin() {
  const completionTime = state.time;
  const level = state.level;
  const currentSave = loadProgress();

  const stats = {
    time: completionTime,
    livesRemaining: state.lives,
    relicFound: state.relicCollected,
    targetTime: level.targetTime,
    completed: true,
  };

  // Record completion & challenges in persistent storage
  recordCompletion(currentLevelId, stats);

  // Evaluate newly earned rewards
  const newlyUnlockedRewards = evaluateRewards(new Set(currentSave.unlockedCosmetics), level, stats);
  newlyUnlockedRewards.forEach(item => unlockCosmetic(item.id));

  // Determine next sequential level
  let nextLevel = null;
  if (currentLevelId < 8) {
    newlyUnlockedLevel = currentLevelId + 1;
    unlockLevel(newlyUnlockedLevel);
    nextLevel = getLevel(newlyUnlockedLevel);
  }

  const save = loadProgress();
  const bestTime = save.bestTimes[currentLevelId];

  // If final destination (Pluto) completed, celebrate campaign victory!
  if (currentLevelId === 8) {
    chime(1200, 0.6);
    setTimeout(() => chime(1500, 0.8), 200);
    $('adventure-modal').classList.remove('hidden');
    if (newlyUnlockedRewards.length > 0) {
      setTimeout(() => showRewardToast(newlyUnlockedRewards[0]), 600);
    }
    return;
  }

  // Populate completion modal data
  chime(950, 0.4);
  setTimeout(() => chime(1200, 0.6), 220);

  $('comp-crystals').textContent = `${state.collected.size} / ${state.crystalCount}`;
  $('comp-time').textContent = formatTime(completionTime);
  $('comp-lives').textContent = '♥ '.repeat(state.lives);
  $('comp-relic').textContent = state.relicCollected ? 'Found ★' : 'Missed';
  $('comp-relic').style.color = state.relicCollected ? '#ffd166' : '#a0a4b4';

  // Challenge Badges in modal
  const chalBox = $('comp-challenges-box');
  chalBox.innerHTML = `
    <span class="chal-badge earned">🏁 Mission Clear</span>
    <span class="chal-badge ${state.lives === 3 ? 'earned' : ''}">🛡 Flawless ${state.lives === 3 ? '✓' : ''}</span>
    <span class="chal-badge ${completionTime <= level.targetTime ? 'earned' : ''}">⚡ Speedrun (${formatTime(level.targetTime)}) ${completionTime <= level.targetTime ? '✓' : ''}</span>
    <span class="chal-badge ${state.relicCollected ? 'earned' : ''}">★ Secret Relic ${state.relicCollected ? '✓' : ''}</span>
  `;

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

  // Show reward toast if cosmetics unlocked
  if (newlyUnlockedRewards.length > 0) {
    setTimeout(() => showRewardToast(newlyUnlockedRewards[0]), 500);
  }
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
  $('customize-modal').classList.add('hidden');
  sync();
  chime(480);
  canvas.focus();
}

let mapOrigin = null;

// Interactive Solar System Map Open & Sync
function openLevelMap(origin) {
  if (origin) {
    mapOrigin = origin;
  } else if (!mapOrigin) {
    if (state.mode === 'playing') mapOrigin = 'playing';
    else if (state.mode === 'paused') mapOrigin = 'paused';
    else if (state.mode === 'intro') mapOrigin = 'intro';
    else mapOrigin = 'other';
  }

  if (state.mode === 'playing') {
    state.pause();
  }
  $('pause-modal').classList.add('hidden');
  $('completion-modal').classList.add('hidden');
  $('adventure-modal').classList.add('hidden');
  $('customize-modal').classList.add('hidden');
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

    // Render Challenge Medals on SVG Node
    const medalsEl = $(`medals-${lvl.id}`);
    if (medalsEl) {
      const chal = prog.challenges[lvl.id] || {};
      medalsEl.innerHTML = '';
      if (chal.completed) medalsEl.innerHTML += '<text x="-12" y="0" font-size="9" fill="#ffd166">🏁</text>';
      if (chal.flawless) medalsEl.innerHTML += '<text x="-4" y="0" font-size="9" fill="#8bffdf">🛡</text>';
      if (chal.speedrun) medalsEl.innerHTML += '<text x="4" y="0" font-size="9" fill="#ff8484">⚡</text>';
      if (chal.relic) medalsEl.innerHTML += '<text x="12" y="0" font-size="9" fill="#ffd166">★</text>';
    }
  });

  updateMapCard(selectedMapLevel);
  $('map-modal').classList.remove('hidden');
}

function closeLevelMap() {
  $('map-modal').classList.add('hidden');
  const origin = mapOrigin;
  mapOrigin = null;

  if (origin === 'playing') {
    state.start();
  } else if (origin === 'paused') {
    openMainMenu();
  } else if (origin === 'completion') {
    $('completion-modal').classList.remove('hidden');
  } else if (origin === 'adventure') {
    $('adventure-modal').classList.remove('hidden');
  }
  sync();
  canvas.focus();
}

// In-Game Main Menu Logic & Live Status Dossier
function openMainMenu() {
  if (state.mode === 'playing') {
    state.pause();
  }
  updateMainMenuDossier();
  $('pause-modal').classList.remove('hidden');
  $('map-modal').classList.add('hidden');
  $('customize-modal').classList.add('hidden');
  $('completion-modal').classList.add('hidden');
  $('adventure-modal').classList.add('hidden');
  sync();
}

function closeMainMenu() {
  $('pause-modal').classList.add('hidden');
  if (state.mode === 'paused') {
    state.start();
  }
  sync();
  canvas.focus();
}

function updateMainMenuDossier() {
  const lvl = state.level;
  if (!lvl) return;
  const levelInfoEl = $('pause-level-info');
  if (levelInfoEl) levelInfoEl.textContent = `${lvl.id}. ${lvl.name} — ${lvl.subtitle}`;
  const gravityEl = $('pause-gravity-badge');
  if (gravityEl) gravityEl.textContent = `g: ${lvl.gravity} m/s²`;
  const energyEl = $('pause-energy');
  if (energyEl) energyEl.textContent = `◇ ${state.collected.size} / ${state.crystalCount}`;
  const livesEl = $('pause-lives');
  if (livesEl) livesEl.textContent = '♥ '.repeat(Math.max(0, state.lives)).trim() || '—';
  const timeEl = $('pause-time');
  if (timeEl) timeEl.textContent = formatTime(state.time);
  const relicEl = $('pause-relic');
  if (relicEl) relicEl.textContent = state.relicCollected ? '★ Discovered' : 'Not Found';
  const soundBtn = $('pause-sound-btn');
  if (soundBtn) soundBtn.textContent = sound ? '🔊 Sound: On' : '🔇 Sound: Off';
  const overlayBtn = $('pause-overlay-btn');
  if (overlayBtn) overlayBtn.textContent = debugOverlayEnabled ? '🛡 Overlay: ON' : '🛡 Overlay: OFF';
}

function selectMapLevel(id) {
  selectedMapLevel = id;
  LEVELS.forEach(lvl => {
    const node = $(`map-node-${lvl.id}`);
    node?.classList.toggle('selected', lvl.id === id);
  });
  updateMapCard(id);
  chime(520, 0.15);
}
window.selectMapLevel = selectMapLevel;

function updateMapCard(id) {
  const lvl = getLevel(id);
  const prog = loadProgress();
  const unlocked = isLevelUnlocked(id, prog);
  const completed = isLevelCompleted(id, prog);
  const bestTime = prog.bestTimes[id];
  const chal = prog.challenges[id] || {};

  $('card-title').textContent = `${lvl.id}. ${lvl.name}`;
  $('card-subtitle').textContent = lvl.subtitle;
  $('card-description').textContent = lvl.description;
  $('card-classification').textContent = lvl.classification;
  $('card-gravity').textContent = `g: ${lvl.gravity} m/s²`;
  $('card-enemy-name').textContent = lvl.enemyName;
  $('card-enemy-intel').textContent = lvl.enemyIntel;
  $('card-relic-name').textContent = lvl.relic?.name || 'Unknown';

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

  // Checklist updates
  $('chal-comp').classList.toggle('earned', !!chal.completed);
  $('chal-flaw').classList.toggle('earned', !!chal.flawless);
  $('chal-speed').classList.toggle('earned', !!chal.speedrun);
  $('chal-time').textContent = `${lvl.targetTime}s`;
  $('chal-rel').classList.toggle('earned', !!chal.relic);

  const playBtn = $('card-play-btn');
  if (unlocked) {
    playBtn.disabled = false;
    playBtn.textContent = completed ? `Replay ${lvl.name}` : `Launch to ${lvl.name}`;
    playBtn.onclick = () => {
      $('map-modal').classList.add('hidden');
      buildLevelScene(id);
      begin();
    };
  } else {
    playBtn.disabled = true;
    playBtn.textContent = 'Destination Locked';
    playBtn.onclick = null;
  }
}

// --- CUSTOMIZE EXPLORER SCREEN & 3D TURNTABLE PREVIEW ---
function initPreviewTurntable() {
  const pCanvas = $('preview-canvas');
  if (!pCanvas) return;

  previewRenderer = new THREE.WebGLRenderer({ canvas: pCanvas, antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  previewCamera.position.set(0, 1.0, 3.8);

  const pLight = new THREE.DirectionalLight(0xffffff, 2.8);
  pLight.position.set(2, 4, 3);
  previewScene.add(pLight);

  const pAmbient = new THREE.AmbientLight(0x7080a0, 1.8);
  previewScene.add(pAmbient);

  previewHero = createModel('Explorer', 0, -0.6, 0, 1.7);
  previewScene.add(previewHero);
  applyCosmeticsToModel(previewHero);

  // Turntable interaction drag controls
  pCanvas.addEventListener('pointerdown', e => {
    previewDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    pCanvas.setPointerCapture(e.pointerId);
  });
  pCanvas.addEventListener('pointermove', e => {
    if (previewDrag?.id !== e.pointerId) return;
    previewYaw += (e.clientX - previewDrag.x) * 0.015;
    previewPitch = THREE.MathUtils.clamp(previewPitch - (e.clientY - previewDrag.y) * 0.01, -0.2, 0.6);
    previewDrag.x = e.clientX;
    previewDrag.y = e.clientY;
  });
  pCanvas.addEventListener('pointerup', () => previewDrag = null);
  pCanvas.addEventListener('pointercancel', () => previewDrag = null);
}

function renderPreviewFrame() {
  if (previewRenderer && previewScene && previewCamera && previewHero) {
    if (!previewDrag) {
      previewYaw += 0.008; // Subtle idle rotation
    }
    previewHero.rotation.y = previewYaw;
    previewHero.rotation.x = previewPitch;
    previewRenderer.render(previewScene, previewCamera);
  }
}

let customizeOrigin = null;

function openCustomizeScreen(origin) {
  if (origin) {
    customizeOrigin = origin;
  } else if (!customizeOrigin) {
    if (!$('map-modal').classList.contains('hidden')) customizeOrigin = 'map';
    else if (state.mode === 'playing') customizeOrigin = 'playing';
    else if (state.mode === 'paused') customizeOrigin = 'paused';
    else if (!$('completion-modal').classList.contains('hidden')) customizeOrigin = 'completion';
    else if (!$('adventure-modal').classList.contains('hidden')) customizeOrigin = 'adventure';
    else customizeOrigin = 'intro';
  }

  if (state.mode === 'playing') state.pause();
  $('pause-modal').classList.add('hidden');
  $('completion-modal').classList.add('hidden');
  $('adventure-modal').classList.add('hidden');
  $('map-modal').classList.add('hidden');

  applyCosmeticsToModel(previewHero);
  renderCustomizationCatalog();
  $('customize-modal').classList.remove('hidden');
}

function closeCustomizeScreen() {
  $('customize-modal').classList.add('hidden');
  const origin = customizeOrigin;
  customizeOrigin = null;

  if (origin === 'map') {
    openLevelMap();
  } else if (origin === 'playing') {
    state.start();
  } else if (origin === 'paused') {
    openMainMenu();
  } else if (origin === 'completion') {
    $('completion-modal').classList.remove('hidden');
  } else if (origin === 'adventure') {
    $('adventure-modal').classList.remove('hidden');
  }
  sync();
  canvas.focus();
}

function renderCustomizationCatalog() {
  const prog = loadProgress();
  const items = getCosmeticsByCategory(currentCustomCategory);
  const grid = $('cosmetics-grid');
  grid.innerHTML = '';

  items.forEach(item => {
    const isUnlocked = prog.unlockedCosmetics.includes(item.id);
    const isEquipped = prog.equippedCosmetics[item.category] === item.id;

    const card = document.createElement('div');
    card.className = `cosmetic-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`;
    card.setAttribute('tabindex', '0');

    let chipHtml = '';
    if (item.category === 'body') {
      chipHtml = `<div class="cosmetic-chip" style="background: ${item.color || '#fff'}"></div>`;
    } else if (item.category === 'visor') {
      chipHtml = `<div class="cosmetic-chip" style="background: ${item.glowColor || '#ffae33'}; box-shadow: 0 0 8px ${item.glowColor}"></div>`;
    } else {
      chipHtml = `<div class="cosmetic-chip">${item.icon || '✦'}</div>`;
    }

    card.innerHTML = `
      <div>
        <div class="cosmetic-card-top">
          ${chipHtml}
          <div class="cosmetic-name">${item.name}</div>
        </div>
        <div class="cosmetic-desc">${item.description}</div>
      </div>
      <div class="cosmetic-status">
        ${isEquipped ? '<span class="equipped-tag">EQUIPPED</span>' : ''}
        ${!isUnlocked ? `<span class="lock-tag">🔒 ${item.unlockHint || 'Locked'}</span>` : ''}
      </div>
    `;

    if (isUnlocked) {
      card.onclick = () => {
        equipCosmetic(item.category, item.id);
        applyCosmeticsToModel(hero);
        applyCosmeticsToModel(previewHero);
        renderCustomizationCatalog();
        chime(680, 0.2);
        message(`Equipped ${item.name}`);
      };
    }

    grid.appendChild(card);
  });
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
  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);

  hemiLight = new THREE.HemisphereLight('#d1e5ec', '#423749', 2.1);
  scene.add(hemiLight);

  sun = new THREE.DirectionalLight('#ffe1b4', 3.2);
  sun.position.set(-14, 34, -18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 120 });
  scene.add(sun.target);
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00015;
  scene.add(sun);

  backdropGroup = new THREE.Group();
  scene.add(backdropGroup);

  levelGroup = new THREE.Group();
  scene.add(levelGroup);

  collisionDebugGroup = new THREE.Group();
  scene.add(collisionDebugGroup);

  particlesGroup = new THREE.Group();
  scene.add(particlesGroup);

  // Load all 24 models (original + solar system models)
  const loader = new GLTFLoader();
  const names = [
    'Explorer', 'Drone', 'Crystal', 'Portal', 'Tree', 'Rock', 'Island', 'Path', 'Crate', 'Lamp', 'Bracken', 'Bluebell', 'Bench',
    'Hopper', 'Rover', 'StormDrone', 'RingSkimmer', 'WindSentinel', 'TempestHunter', 'FrostCrawler', 'Relic',
    'AntennaDish', 'RingCrown', 'RoverPack', 'CloudPack', 'FrostPack'
  ];

  let done = 0;
  await Promise.all(names.map(async n => {
    try {
      models[n] = (await loader.loadAsync(`./models/${n}.glb`)).scene;
    } catch (e) {
      console.warn(`Model ${n}.glb optional fallback`);
    }
    done++;
    $('begin').textContent = `Calibrating solar drives… ${Math.round((done / names.length) * 100)}%`;
  }));

  // Build Player Explorer directly in root scene
  hero = createModel('Explorer', 0, 0, -2, 1.65);
  hero.rotation.y = Math.PI;
  scene.add(hero);

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

  // Initialize Turntable Preview
  initPreviewTurntable();

  $('begin').disabled = false;
  $('begin').textContent = 'Begin Solar Expedition';

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

  window.state = state;
  window.hero = hero;
  window.previewHero = previewHero;
  window.models = models;
  window.applyCosmeticsToModel = applyCosmeticsToModel;
  window.buildLevelScene = buildLevelScene;
  window.begin = begin;

  resize();
  setupEventListeners();
  renderer.setAnimationLoop(frame);
}

// Event Listeners for UI, Controls, and Keyboard
function setupEventListeners() {
  $('begin').onclick = begin;
  $('open-map-intro').onclick = () => openLevelMap('intro');
  $('open-customize-intro').onclick = () => openCustomizeScreen('intro');
  $('customize-hud-btn').onclick = () => openCustomizeScreen(state.mode === 'playing' ? 'playing' : (state.mode === 'paused' ? 'paused' : 'intro'));
  $('map-btn').onclick = () => openLevelMap('playing');
  $('open-customize-from-map').onclick = () => {
    openCustomizeScreen('map');
  };
  $('close-map-btn').onclick = () => {
    closeLevelMap();
  };
  $('close-customize-btn').onclick = () => {
    closeCustomizeScreen();
  };

  // Backdrop click to dismiss modals
  $('map-modal').onclick = (e) => {
    if (e.target === $('map-modal')) {
      closeLevelMap();
    }
  };
  $('customize-modal').onclick = (e) => {
    if (e.target === $('customize-modal')) {
      closeCustomizeScreen();
    }
  };

  // Category Tabs click
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCustomCategory = tab.dataset.category;
      renderCustomizationCatalog();
      chime(440, 0.1);
    };
  });

  // Restore Default Appearance
  $('restore-default-btn').onclick = () => {
    resetAppearance();
    applyCosmeticsToModel(hero);
    applyCosmeticsToModel(previewHero);
    renderCustomizationCatalog();
    message('Explorer appearance restored to default');
    chime(540, 0.2);
  };
  $('reset-appearance-btn').onclick = () => {
    resetAppearance();
    applyCosmeticsToModel(hero);
    applyCosmeticsToModel(previewHero);
    message('Explorer appearance restored to default');
  };

  $('pause').onclick = () => {
    if (state.mode === 'playing') {
      openMainMenu();
    } else if (state.mode === 'paused') {
      closeMainMenu();
    }
  };

  $('sound').onclick = () => {
    sound = !sound;
    $('sound').textContent = sound ? 'Sound on' : 'Sound off';
    $('sound').setAttribute('aria-pressed', String(sound));
    const pauseSoundBtn = $('pause-sound-btn');
    if (pauseSoundBtn) pauseSoundBtn.textContent = sound ? '🔊 Sound: On' : '🔇 Sound: Off';
    chime(520);
  };

  $('debug-overlay-btn').onclick = () => {
    toggleCollisionOverlay();
    const pauseOverlayBtn = $('pause-overlay-btn');
    if (pauseOverlayBtn) pauseOverlayBtn.textContent = showCollisionOverlay ? '🛡 Overlay: ON' : '🛡 Overlay: OFF';
  };

  // In-Game Main Menu Handlers
  $('close-pause-btn').onclick = closeMainMenu;
  $('pause-resume-btn').onclick = closeMainMenu;
  $('pause-custom-btn').onclick = () => openCustomizeScreen('paused');
  $('pause-restart-btn').onclick = () => {
    $('pause-modal').classList.add('hidden');
    state.reset();
    begin();
  };
  $('pause-map-btn').onclick = () => {
    $('pause-modal').classList.add('hidden');
    openLevelMap('paused');
  };
  $('pause-title-btn').onclick = () => {
    state.mode = 'ready';
    $('pause-modal').classList.add('hidden');
    $('panel').classList.remove('hidden');
    const lvlName = state.level?.name || 'Crystal Garden';
    $('begin').textContent = `Continue Expedition (${lvlName})`;
    $('begin').disabled = false;
    document.body.classList.remove('playing');
    sync();
  };
  $('pause-sound-btn').onclick = () => {
    sound = !sound;
    $('sound').textContent = sound ? 'Sound on' : 'Sound off';
    $('sound').setAttribute('aria-pressed', String(sound));
    $('pause-sound-btn').textContent = sound ? '🔊 Sound: On' : '🔇 Sound: Off';
    chime(520);
  };
  $('pause-overlay-btn').onclick = () => {
    toggleCollisionOverlay();
    $('pause-overlay-btn').textContent = debugOverlayEnabled ? '🛡 Overlay: ON' : '🛡 Overlay: OFF';
  };
  $('pause-modal').onclick = (e) => {
    if (e.target === $('pause-modal')) {
      closeMainMenu();
    }
  };

  // Completion buttons
  $('comp-next-btn').onclick = () => {
    $('completion-modal').classList.add('hidden');
    if (currentLevelId < 8) {
      buildLevelScene(currentLevelId + 1);
      begin();
    }
  };
  $('comp-map-btn').onclick = () => {
    $('completion-modal').classList.add('hidden');
    openLevelMap('completion');
  };
  $('comp-custom-btn').onclick = () => openCustomizeScreen('completion');
  $('comp-replay-btn').onclick = () => {
    $('completion-modal').classList.add('hidden');
    state.reset();
    begin();
  };

  // Adventure complete buttons
  $('adv-map-btn').onclick = () => {
    $('adventure-modal').classList.add('hidden');
    openLevelMap('adventure');
  };
  $('adv-custom-btn').onclick = () => openCustomizeScreen('adventure');
  $('adv-replay-btn').onclick = () => {
    $('adventure-modal').classList.add('hidden');
    buildLevelScene(8);
    begin();
  };

  // Reset Progress confirmation
  $('reset-progress-btn').onclick = promptResetProgress;
  $('confirm-reset-cancel').onclick = () => $('confirm-reset-modal').classList.add('hidden');
  $('confirm-reset-yes').onclick = () => {
    resetAllProgression();
    $('confirm-reset-modal').classList.add('hidden');
    selectedMapLevel = 1;
    newlyUnlockedLevel = null;
    applyCosmeticsToModel(hero);
    applyCosmeticsToModel(previewHero);
    buildLevelScene(1);
    openLevelMap();
    message('Saved progress reset to defaults');
  };

  // Map Node Clicks for all 8 destinations
  [1, 2, 3, 4, 5, 6, 7, 8].forEach(id => {
    const node = $(`map-node-${id}`);
    if (node) {
      node.onclick = () => selectMapLevel(id);
      node.querySelectorAll('*').forEach(c => {
        c.onclick = (e) => {
          e.stopPropagation();
          selectMapLevel(id);
        };
      });
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectMapLevel(id);
        }
      });
    }
  });

  // Global Keyboard Navigation
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'Escape') {
      if (!$('confirm-reset-modal').classList.contains('hidden')) {
        $('confirm-reset-modal').classList.add('hidden');
      } else if (!$('customize-modal').classList.contains('hidden')) {
        closeCustomizeScreen();
      } else if (!$('map-modal').classList.contains('hidden')) {
        closeLevelMap();
      } else if (!$('completion-modal').classList.contains('hidden')) {
        $('completion-modal').classList.add('hidden');
      } else if (!$('pause-modal').classList.contains('hidden')) {
        closeMainMenu();
      } else if (state.mode === 'playing') {
        openMainMenu();
      } else if (state.mode === 'paused') {
        closeMainMenu();
      }
      sync();
    }
    if (e.code === 'KeyM') {
      if ($('map-modal').classList.contains('hidden')) openLevelMap();
      else closeLevelMap();
    }
    if (e.code === 'KeyC' || e.code === 'KeyG') {
      if ($('customize-modal').classList.contains('hidden')) openCustomizeScreen();
      else closeCustomizeScreen();
    }
    if (e.code === 'KeyO') {
      toggleCollisionOverlay();
    }
    if (e.code === 'KeyR' && (['won', 'lost'].includes(state.mode) || !$('pause-modal').classList.contains('hidden'))) {
      $('pause-modal').classList.add('hidden');
      state.reset();
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

// Spawns subtle movement particle trail
function spawnTrailParticle(pos) {
  const save = loadProgress();
  const trailId = save.equippedCosmetics.trail;
  if (!trailId || trailId === 'trail_default') return;

  const item = getCosmetic(trailId);
  const color = item?.color || '#ffd166';

  const pGeo = new THREE.SphereGeometry(0.06, 6, 6);
  const pMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const pMesh = new THREE.Mesh(pGeo, pMat);
  pMesh.position.set(pos.x + (Math.random() - 0.5) * 0.2, pos.y + 0.08, pos.z + (Math.random() - 0.5) * 0.2);
  pMesh.userData = { life: 0.6, maxLife: 0.6 };
  particlesGroup.add(pMesh);
}

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

  // Hero position, orientation, and subtle movement trail
  if (hero) {
    const bob = state.mode === 'playing' && (moveX || moveZ) && state.y === 0 ? Math.sin(state.time * 16) * 0.035 : 0;
    hero.position.set(state.x, state.y + bob, state.z);

    if (state.mode === 'playing' && (dx || dz)) {
      const angle = Math.atan2(dx, dz);
      hero.rotation.y += Math.atan2(Math.sin(angle - hero.rotation.y), Math.cos(angle - hero.rotation.y)) * Math.min(1, dt * 12);
      if (Math.random() < 0.35) {
        spawnTrailParticle(hero.position);
      }
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

  // Update particles in trail
  for (let i = particlesGroup.children.length - 1; i >= 0; i--) {
    const p = particlesGroup.children[i];
    p.userData.life -= dt;
    p.position.y += dt * 0.3;
    p.scale.multiplyScalar(0.96);
    if (p.material) p.material.opacity = p.userData.life / p.userData.maxLife;
    if (p.userData.life <= 0) {
      particlesGroup.remove(p);
      p.geometry?.dispose();
      p.material?.dispose();
    }
  }

  // Animate Crystals
  gemModels.forEach((m, i) => {
    m.visible = !state.collected.has(i);
    m.rotation.y = state.time * 1.1;
    m.position.y = 0.2 + Math.sin(state.time * 2 + i) * 0.13;
  });

  // Animate Hidden Planetary Relic
  if (relicModel) {
    relicModel.visible = !state.relicCollected;
    relicModel.rotation.y = state.time * 1.4;
    relicModel.rotation.x = Math.sin(state.time * 0.8) * 0.2;
    relicModel.position.y = (state.level.relic?.y || 0.5) + Math.sin(state.time * 2.5) * 0.12;
  }

  // Animate Destination Enemies & Telegraphs
  const level = state.level;
  if (level.destinationType === 'garden') {
    const currentPatrols = getPatrolPositions(level, state.time);
    currentPatrols.forEach((p, i) => {
      if (enemyModels[i]) {
        enemyModels[i].position.set(p.x, p.y + Math.sin(state.time * 3 + i) * 0.08, p.z);
      }
    });
  } else if (level.destinationType === 'moon') {
    state.hoppers.forEach((h, i) => {
      const m = enemyModels[i];
      if (m) {
        m.position.set(h.x, h.y, h.z);
        if (m.userData.reticle) {
          m.userData.reticle.visible = h.reticleVisible;
          m.userData.reticle.position.set(h.targetX, 0.04, h.targetZ);
          m.userData.reticle.scale.setScalar(1 + Math.sin(state.time * 12) * 0.1);
        }
      }
    });
  } else if (level.destinationType === 'mars') {
    state.rovers.forEach((r, i) => {
      const m = enemyModels[i];
      if (m) {
        m.position.set(r.x, 0, r.fixedCoord);
        m.rotation.y = r.dir > 0 ? 0 : Math.PI;
        if (m.userData.cone) {
          m.userData.cone.position.set(r.x + (r.dir * 2.1), 0.05, r.fixedCoord);
          m.userData.cone.material.color = new THREE.Color(r.state === 'alert' || r.state === 'charge' ? 0xff2222 : 0xff8484);
        }
      }
    });
  } else if (level.destinationType === 'jupiter') {
    state.stormDrones.forEach((sd, i) => {
      const m = enemyModels[i];
      if (m) {
        m.position.set(sd.x, sd.y + Math.sin(state.time * 2.5 + i) * 0.1, sd.z);
        m.rotation.y = state.time * 3.0;
        if (m.userData.pulse) {
          m.userData.pulse.visible = sd.state === 'pulse';
          const r = sd.currentPulseRadius || 0.1;
          m.userData.pulse.scale.set(r, r, r);
        }
      }
    });
  } else if (level.destinationType === 'saturn') {
    if (level.skimmers) {
      level.skimmers.forEach((sk, i) => {
        const m = enemyModels[i];
        if (m) {
          const s = state.time * sk.speed + sk.phase;
          const sx = sk.cx + Math.cos(s) * sk.rx;
          const sz = sk.cz + Math.sin(s) * sk.rz;
          m.position.set(sx, sk.y, sz);
          m.rotation.y = -s + Math.PI / 2;
        }
      });
    }
  } else if (level.destinationType === 'uranus') {
    state.sentinels.forEach((ws, i) => {
      const m = enemyModels[i];
      if (m) {
        m.position.set(ws.x, ws.y, ws.z);
        m.rotation.y = state.time * 4.0;
        if (m.userData.arrow) {
          m.userData.arrow.visible = ws.state === 'telegraph' || ws.state === 'gust';
          m.userData.arrow.material.color = new THREE.Color(ws.state === 'gust' ? 0x2bf7ff : 0x5cd4db);
        }
      }
    });
  } else if (level.destinationType === 'neptune') {
    state.hunters.forEach((th, i) => {
      const m = enemyModels[i];
      if (m) {
        m.position.set(th.x, th.y, th.z);
        if (m.userData.line) {
          m.userData.line.visible = th.state === 'aim';
        }
      }
    });
  } else if (level.destinationType === 'pluto') {
    const crawlerPositions = getPatrolPositions(level, state.time);
    crawlerPositions.forEach((p, i) => {
      if (enemyModels[i]) {
        enemyModels[i].position.set(p.x, p.y, p.z);
      }
    });
  }

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

    // Update Live Debug Readout
    $('dbg-player-pos').textContent = `${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)}`;
    $('dbg-ground').textContent = state.isGround(state.x, state.z) ? 'YES' : 'FALLING';
    $('dbg-ground').style.color = state.isGround(state.x, state.z) ? '#8bffdf' : '#ff8484';
    $('dbg-invuln').textContent = state.time < state.hurtUntil ? `YES (${(state.hurtUntil - state.time).toFixed(1)}s)` : 'NO';
    $('dbg-invuln').style.color = state.time < state.hurtUntil ? '#ffd166' : '#a0a0b0';

    let nearestDist = 999;
    if (level.destinationType === 'garden') {
      const patrols = getPatrolPositions(level, state.time);
      patrols.forEach(p => {
        const d = Math.hypot(state.x - p.x, state.z - p.z);
        if (d < nearestDist) nearestDist = d;
      });
    } else if (level.destinationType === 'moon') {
      state.hoppers.forEach(h => {
        const d = Math.hypot(state.x - h.x, state.z - h.z);
        if (d < nearestDist) nearestDist = d;
      });
    } else if (level.destinationType === 'mars') {
      state.rovers.forEach(r => {
        const d = Math.hypot(state.x - r.x, state.z - r.fixedCoord);
        if (d < nearestDist) nearestDist = d;
      });
    }
    $('dbg-ufo-dist').textContent = nearestDist < 900 ? `${nearestDist.toFixed(2)}m` : 'Safe';
  }

  // Audio & Event handling
  for (const event of state.events) {
    if (event === 'gem') {
      chime(650 + state.collected.size * 90);
      message(`${state.collected.size} of ${state.crystalCount} crystals recovered`);
    } else if (event === 'relic') {
      chime(1300, 0.6);
      message(`★ SECRET RELIC DISCOVERED: ${level.relic?.name}!`, 3500);
      $('relic-indicator').classList.remove('hidden');
    } else if (event === 'portal-activated') {
      chime(1050, 0.5);
      message('PORTAL ACTIVE! Return to the celestial gateway.');
    } else if (event === 'hurt') {
      chime(110, 0.4, 'sawtooth');
      message('Energy lost! Returned to landing site.');
    } else if (event === 'rover-alert') {
      chime(780, 0.25, 'triangle');
    } else if (event === 'hopper-slam') {
      chime(90, 0.35, 'square');
    } else if (event === 'storm-pulse') {
      chime(540, 0.35, 'sawtooth');
    } else if (event === 'wind-gust') {
      chime(260, 0.5, 'sine');
    }
  }

  // Smooth Third-Person Orbit Camera
  const target = started ? new THREE.Vector3(state.x, state.y + 1, state.z) : new THREE.Vector3(6, 0, 7);
  // Tune camera distance slightly for low gravity worlds
  const distance = started ? (level.gravity < 12 ? 10.5 : 9) : 35;
  const desired = target.clone().add(new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance
  ));
  camera.position.lerp(desired, started ? 1 - Math.exp(-8 * dt) : 1);
  camera.lookAt(target);

  sync();
  renderer.render(scene, camera);

  // Render 3D Turntable Preview if customization modal is open
  if (!$('customize-modal').classList.contains('hidden')) {
    renderPreviewFrame();
  }
}

// Initialize and handle fatal load errors
init().catch(e => {
  console.error('Failed to initialize Crystal Garden:', e);
  $('eyebrow').textContent = 'EXPEDITION COULD NOT LOAD';
  $('heading').innerHTML = 'Let’s try<br><i>again.</i>';
  $('description').textContent = 'Check your connection and ensure WebGL is enabled in your browser.';
  $('begin').textContent = 'Reload expedition';
  $('begin').disabled = false;
  $('begin').onclick = () => location.reload();
});
