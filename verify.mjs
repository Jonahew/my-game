import assert from 'node:assert/strict';
import { Garden, ground, gems, LEVELS, getLevel, COLLISION_CONFIG } from './dist/logic.js';
import {
  checkUfoCollision,
  isGroundSupported,
  checkHopperShockwave,
  checkStormPulse,
  checkRoverCollision,
  checkTempestHunterDash,
  checkIcePatchSlip
} from './dist/collision.js';
import {
  loadProgress,
  saveProgress,
  unlockLevel,
  recordCompletion,
  resetProgress,
  resetAppearance,
  resetAllProgression,
  isLevelUnlocked,
  isLevelCompleted,
  equipCosmetic,
  unlockCosmetic
} from './dist/storage.js';
import { COSMETICS, evaluateRewards } from './dist/cosmetics.js';

console.log('--- STARTING CRYSTAL GARDEN: SOLAR SYSTEM VERIFICATION SUITES ---');

// --- SUITE 1: Original Core Mechanics & State Machine ---
const g = new Garden(1);
g.start();
for (let i = 0; i < 60; i++) g.step(1 / 60, { z: 1 });
assert(g.z > 2 && g.y === 0, 'Movement along Z on ground');

g.pause();
const time = g.time;
g.step(0.05, { x: 1 });
assert.equal(g.time, time, 'Paused state halts timer');
g.resume();

g.step(0.016, { jump: true });
assert(g.y > 0, 'Jump initiates upward movement');
for (let i = 0; i < 100; i++) g.step(0.016);
assert.equal(g.y, 0, 'Landing returns smoothly to y = 0');

g.x = gems[0][0]; g.z = gems[0][1];
g.step(0.016);
assert.equal(g.collected.size, 1, 'Crystal pickup registered');
g.step(0.016);
assert.equal(g.collected.size, 1, 'Pickups are one-time only');

g.x = 40; g.z = 40; // Fall off island
for (let i = 0; i < 70; i++) g.step(0.016);
assert.equal(g.lives, 2, 'Falling deducts one life');
assert.equal(g.collected.size, 1, 'Crystals retained after fall');
assert.equal(g.x, 0, 'Respawned at spawn X');
assert.equal(g.z, -2, 'Respawned at spawn Z');

for (const [x, z] of gems) { g.x = x; g.z = z; g.y = 0; g.step(0.016); }
assert.equal(g.collected.size, 6, 'All 6 crystals collected');
assert(g.portalActive, 'Portal activated after collecting all crystals');
g.x = 14; g.z = 16; g.step(0.016);
assert.equal(g.mode, 'won', 'Entering portal marks level won');

g.start();
assert.equal(g.lives, 3, 'Restart resets lives');
assert.equal(g.collected.size, 0, 'Restart resets collected crystals');

g.damage(); g.damage(); g.damage();
assert.equal(g.mode, 'lost', 'Three lives lost results in game over');
g.start();
assert.equal(g.mode, 'playing', 'Restart from loss begins playing');

for (let x = 0; x <= 14; x += 0.1) assert(ground(x, 0), `Connected path along X at x=${x}`);
for (let z = 0; z <= 14; z += 0.1) assert(ground(0, z), `Connected path along Z at z=${z}`);
assert(!ground(7, 7), 'Void between islands is not ground');
console.log('✓ PASS: Suite 1: Original core mechanics & state machine');

// --- SUITE 2: Bridge Edges, Footprint, and Connection Continuity ---
const l1 = getLevel(1);
assert(isGroundSupported(7, 0.95, l1), 'x=7, z=0.95 supported inside deck');
assert(isGroundSupported(7, 1.0, l1), 'x=7, z=1.0 exact deck edge supported');
assert(isGroundSupported(7, 1.15, l1), 'x=7, z=1.15 supported by character footprint');
assert(!isGroundSupported(7, 1.35, l1), 'x=7, z=1.35 beyond footprint must fall');

for (let x = 0; x <= 14; x += 0.05) {
  assert(isGroundSupported(x, 0, l1), `Continuous connection at x=${x.toFixed(2)}, z=0`);
}
console.log('✓ PASS: Suite 2: Bridge edges, footprint support, and continuous connections');

// --- SUITE 3: Fair Hitboxes, Warnings, and Invulnerability Across Worlds ---
// 1. UFO fair hitboxes (Level 1)
const ufoPos = { x: 7, y: 0.85, z: 0 };
assert(!checkUfoCollision({ x: 7, y: 0, z: 0.74 }, ufoPos), 'Near miss borderline contact favors player');
assert(checkUfoCollision({ x: 7, y: 0, z: 0.40 }, ufoPos), 'Direct contact triggers collision');
assert(!checkUfoCollision({ x: 7, y: 1.40, z: 0 }, ufoPos), 'Jumping cleanly over UFO avoids damage');

// 2. Lunar Hopper Landing Shockwave (Level 2)
const hopper = { state: 'slam', targetX: 14, targetZ: 14, radius: 1.8 };
assert(checkHopperShockwave({ x: 14.5, y: 0, z: 14 }, hopper), 'Grounded player in hopper landing radius is hit');
assert(!checkHopperShockwave({ x: 14.5, y: 1.0, z: 14 }, hopper), 'Jumping high over hopper landing is safe!');

// 3. Survey Rover Collision (Level 3)
const rover = { state: 'charge', x: 10, z: 0 };
assert(checkRoverCollision({ x: 10.2, y: 0, z: 0 }, rover), 'Charging rover hits grounded player on causeway');
assert(!checkRoverCollision({ x: 10.2, y: 1.2, z: 0 }, rover), 'Jumping cleanly over rover is safe');

// 4. Storm Drone Pulse Wave (Level 4)
const drone = { state: 'pulse', x: 8, y: 1.0, currentPulseRadius: 2.0 };
assert(checkStormPulse({ x: 9.9, y: 0.5, z: 0 }, drone), 'Player inside expanding ring wave is hit');
assert(!checkStormPulse({ x: 11.5, y: 0.5, z: 0 }, drone), 'Player outside expanding ring is safe');
assert(!checkStormPulse({ x: 9.9, y: 2.2, z: 0 }, drone), 'Jumping above drone pulse plane is safe');

// 5. Tempest Hunter Dash (Level 7)
const hunter = { state: 'dash', x: 10, z: 0 };
assert(checkTempestHunterDash({ x: 10.1, y: 0.5, z: 0 }, hunter), 'Dashing hunter hits player in trajectory line');
assert(!checkTempestHunterDash({ x: 10.1, y: 1.4, z: 0 }, hunter), 'Jumping above dash altitude is safe');

// 6. Frost Crawler Slippery Patch (Level 8)
const icePatches = [{ x: 8, z: 0, radius: 1.1 }];
assert(checkIcePatchSlip({ x: 8.2, y: 0, z: 0 }, icePatches), 'Grounded player on ice patch experiences slip physics');
assert(!checkIcePatchSlip({ x: 8.2, y: 0.8, z: 0 }, icePatches), 'Airborne player does not slip on ice patch');
console.log('✓ PASS: Suite 3: Fair hitboxes, telegraphs, and evasions across all enemy types');

// --- SUITE 4: All 8 Sequential Campaign Destinations ---
assert.equal(LEVELS.length, 8, 'All 8 sequential Solar System worlds defined');
const expectedOrder = ['Crystal Garden', 'The Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

for (let idx = 0; idx < LEVELS.length; idx++) {
  const level = LEVELS[idx];
  assert.equal(level.id, idx + 1, `Level ID matches route order ${idx + 1}`);
  assert.equal(level.name, expectedOrder[idx], `World name matches sequential route: ${expectedOrder[idx]}`);
  assert(level.gravity > 0 && level.gravity <= 20, `Valid gravity setting for ${level.name}: ${level.gravity}`);
  assert(level.crystalCount >= 6, `Level has sufficient crystals: ${level.crystalCount}`);
  assert(level.relic && level.relic.name, `Level ${level.name} has a hidden planetary relic: ${level.relic?.name}`);

  // Test full playthrough of each world
  const play = new Garden(level.id);
  play.start();

  // Low gravity verification
  if (level.id === 2 || level.id === 8) {
    play.step(0.016, { jump: true });
    assert(play.gravity <= 10, `Destination ${level.name} has low gravity (g=${play.gravity})`);
    assert(play.vy > 0, `Low-gravity leap launches gracefully in ${level.name}`);
    for (let f = 0; f < 120; f++) play.step(0.016);
    assert.equal(play.y, 0, `Low-gravity landing returns cleanly to 0 in ${level.name}`);
  }

  // Collect planetary relic
  play.x = level.relic.x;
  play.z = level.relic.z;
  play.y = level.relic.y;
  play.step(0.016);
  assert(play.relicCollected, `Planetary relic collected in ${level.name}`);

  // Collect all crystals
  for (const [cx, cz] of level.crystals) {
    play.x = cx;
    play.z = cz;
    play.y = 0;
    play.step(0.016);
  }
  assert.equal(play.collected.size, level.crystals.length, `All crystals collected in ${level.name}`);
  assert(play.portalActive, `Portal active in ${level.name}`);

  // Enter portal to win
  play.x = level.portal.x;
  play.z = level.portal.z;
  play.y = 0;
  play.step(0.016);
  assert.equal(play.mode, 'won', `Successfully reached active portal in ${level.name}`);
}
console.log('✓ PASS: Suite 4: All 8 destinations verified playable, reachable, and completable');

// --- SUITE 5: Customization, Challenges, and Storage v3 Migration ---
resetAllProgression();
let save = loadProgress();
assert.equal(save.version, 3, 'Save file is version 3');
assert.deepEqual(save.unlockedLevels, [1], 'Starting campaign starts exclusively on Level 1');
assert(save.unlockedCosmetics.length >= 6, 'Starting default cosmetics are unlocked');
assert.equal(save.equippedCosmetics.body, 'body_default', 'Equipped default body');

// Complete Level 1 flawlessly under par time with relic
const l1Stats = { time: 32.5, livesRemaining: 3, relicFound: true, targetTime: 45, completed: true };
const unlockedL1Rewards = evaluateRewards(new Set(save.unlockedCosmetics), getLevel(1), l1Stats);
assert(unlockedL1Rewards.some(r => r.id === 'body_emerald'), 'Flawless run in Garden awards Jade Solarium body');

// Record completion in storage
recordCompletion(1, l1Stats);
unlockedL1Rewards.forEach(r => unlockCosmetic(r.id));
save = loadProgress();

assert(isLevelUnlocked(2, save), 'Level 2 (Moon) unlocked after Level 1 completion');
assert(isLevelCompleted(1, save), 'Level 1 marked completed');
assert(save.challenges[1].completed, 'Level 1 completed challenge recorded');
assert(save.challenges[1].flawless, 'Level 1 flawless challenge recorded');
assert(save.challenges[1].speedrun, 'Level 1 speedrun challenge recorded');
assert(save.challenges[1].relic, 'Level 1 relic challenge recorded');

// Equip newly unlocked cosmetic
equipCosmetic('body', 'body_emerald');
save = loadProgress();
assert.equal(save.equippedCosmetics.body, 'body_emerald', 'Equipped newly unlocked body finish');

// Reset appearance restores default cosmetics without wiping progression
resetAppearance();
save = loadProgress();
assert.equal(save.equippedCosmetics.body, 'body_default', 'Appearance reset to default');
assert(isLevelUnlocked(2, save), 'Campaign progression kept after appearance reset');
assert(save.unlockedCosmetics.includes('body_emerald'), 'Earned cosmetic remains unlocked after appearance reset');

// Complete entire campaign through Level 8 (Pluto)
for (let lvl = 2; lvl <= 8; lvl++) {
  assert(isLevelUnlocked(lvl, save), `Level ${lvl} is unlocked sequentially`);
  recordCompletion(lvl, { time: 42.0, livesRemaining: 3, relicFound: true, targetTime: 60 });
  save = loadProgress();
}
assert(isLevelCompleted(8, save), 'Level 8 (Pluto) marked completed - Solar System Campaign Won!');

// Reset all progression wipes back to starting defaults
resetAllProgression();
save = loadProgress();
assert.deepEqual(save.unlockedLevels, [1], 'All levels reset back to starting world');
assert.deepEqual(save.completedLevels, [], 'Completed levels cleared');
console.log('✓ PASS: Suite 5: Progression, challenges, cosmetics, and save migration');

console.log('\n============================================================');
console.log('ALL SOLAR SYSTEM ADVENTURE VERIFICATION SUITES PASSED! (5/5)');
console.log('============================================================');
