import assert from 'node:assert/strict';
import { Garden, ground, gems, LEVELS, getLevel, COLLISION_CONFIG } from './dist/logic.js';
import { checkUfoCollision, isGroundSupported } from './dist/collision.js';
import { loadProgress, saveProgress, unlockLevel, recordCompletion, resetProgress, isLevelUnlocked, isLevelCompleted } from './dist/storage.js';

// --- SUITE 1: Original Verification Tests ---
const g = new Garden();
g.start();
for (let i = 0; i < 60; i++) g.step(1 / 60, { z: 1 });
assert(g.z > 2 && g.y === 0, 'Movement along Z on ground');

g.pause();
const time = g.time;
g.step(0.05, { x: 1 });
assert.equal(g.time, time, 'Paused state halts timer');
g.start();

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

// Test bridge edges (Bridge along X from 3.5 to 10.5, deck is z in [-1.0, 1.0])
// Center point inside deck
assert(isGroundSupported(7, 0.95, l1), 'x=7, z=0.95 must be supported (previously bugged!)');
assert(isGroundSupported(7, -0.95, l1), 'x=7, z=-0.95 must be supported');
// Exact visual deck edge (z = 1.0)
assert(isGroundSupported(7, 1.0, l1), 'x=7, z=1.0 exact deck edge must be supported');
assert(isGroundSupported(7, -1.0, l1), 'x=7, z=-1.0 exact deck edge must be supported');
// Footprint support slightly beyond edge (z = 1.15)
assert(isGroundSupported(7, 1.15, l1), 'x=7, z=1.15 supported by character footprint');
// Genuine fall beyond footprint (z = 1.35)
assert(!isGroundSupported(7, 1.35, l1), 'x=7, z=1.35 beyond footprint must fall');
assert(!isGroundSupported(7, -1.35, l1), 'x=7, z=-1.35 beyond footprint must fall');

// Continuous connection from Island 0 (r=6) through Bridge (3.5 to 10.5) to Island 1 (center 14, r=6)
for (let x = 0; x <= 14; x += 0.05) {
  // Test along center of bridge (z = 0)
  assert(isGroundSupported(x, 0, l1), `Continuous connection at x=${x.toFixed(2)}, z=0`);
  // Test along near-edge of bridge (z = 0.9)
  assert(isGroundSupported(x, 0.9, l1), `Continuous connection at x=${x.toFixed(2)}, z=0.9`);
  assert(isGroundSupported(x, -0.9, l1), `Continuous connection at x=${x.toFixed(2)}, z=-0.9`);
}

// Verify actual gameplay stepping along bridge edge
const bridgeRunner = new Garden(1);
bridgeRunner.start();
bridgeRunner.x = 7.0;
bridgeRunner.z = 0.95; // Walk along the edge
for (let i = 0; i < 30; i++) {
  bridgeRunner.step(1 / 60, { x: 1 }); // Move forward along bridge
}
assert.equal(bridgeRunner.y, 0, 'Player stays grounded walking along edge of bridge without falling');
assert.equal(bridgeRunner.lives, 3, 'No lives lost on edge walk');

// Step player intentionally off the bridge
bridgeRunner.x = 7.0;
bridgeRunner.z = 1.4; // Step off into abyss
for (let i = 0; i < 50; i++) {
  bridgeRunner.step(1 / 60, {});
}
assert(bridgeRunner.y < -5 || bridgeRunner.lives < 3, 'Genuine fall occurs when stepping off bridge');
console.log('✓ PASS: Suite 2: Bridge edges, footprint support, and continuous connections');

// --- SUITE 3: Fair UFO Collisions & Invulnerability ---
// Borderline horizontal clearance: combined radius is 0.28 + 0.52 = 0.80.
// With player favor margin 0.08, threshold is 0.72.
const ufoPos = { x: 7, y: 0.85, z: 0 };
const closeMissPlayer = { x: 7, y: 0, z: 0.74 }; // Distance is 0.74 >= 0.72
assert(!checkUfoCollision(closeMissPlayer, ufoPos), 'Near miss borderline contact favors player');

const directHitPlayer = { x: 7, y: 0, z: 0.40 }; // Distance is 0.40 < 0.72
assert(checkUfoCollision(directHitPlayer, ufoPos), 'Direct contact triggers collision');

// Vertical clearance: Jumping safely over UFO
// UFO height is 0.50, top is at 0.85 + 0.50 = 1.35.
// Jumping player with feet at y = 1.40 (above UFO top 1.35)
const jumpingOverPlayer = { x: 7, y: 1.40, z: 0 };
assert(!checkUfoCollision(jumpingOverPlayer, ufoPos), 'Jumping cleanly over UFO avoids damage');

// Safe clearance below elevated UFO
const highUfoPos = { x: 7, y: 1.80, z: 0 }; // Elevated patrol
const standingBelowPlayer = { x: 7, y: 0, z: 0 }; // Player head is at 1.55 < 1.80
assert(!checkUfoCollision(standingBelowPlayer, highUfoPos), 'Walking below elevated UFO avoids damage');

// Invulnerability duration & single-contact protection during continuous contact
const combatGame = new Garden(1);
combatGame.start();
// Place directly on UFO 0 patrol point at t=0 (x=7, z=0)
combatGame.x = 7; combatGame.z = 0; combatGame.y = 0;

// Simulate continuous contact over 60 frames (1 full second)
for (let i = 0; i < 60; i++) {
  combatGame.step(0.016);
}
assert.equal(combatGame.lives, 2, 'Single continuous contact removes exactly 1 life, not multiple');
assert(combatGame.time < combatGame.hurtUntil, 'Player remains invulnerable during damage cooldown');

// Advance time past invulnerability window and touch UFO again
combatGame.time = combatGame.hurtUntil + 0.1;
const { getPatrolPositions } = await import('./dist/logic.js');
const nextUfo = getPatrolPositions(combatGame.level, combatGame.time)[0];
combatGame.x = nextUfo.x; combatGame.z = nextUfo.z; combatGame.y = 0;
combatGame.step(0.016);
assert.equal(combatGame.lives, 1, 'Damage applies normally after invulnerability expires');
console.log('✓ PASS: Suite 3: Fair UFO hitboxes, vertical clearance, and invulnerability');

// --- SUITE 4: Level 1, Level 2, and Level 3 Playability & Objectives ---
assert.equal(LEVELS.length, 3, 'Exactly three playable levels provided');

for (const level of LEVELS) {
  assert(level.id >= 1 && level.id <= 3, `Valid level ID: ${level.id}`);
  assert(level.name && level.name.length > 0, `Level has name: ${level.name}`);
  assert(level.description && level.description.length > 0, `Level has description: ${level.description}`);
  assert(level.crystals.length >= 6, `Level ${level.id} has at least 6 crystals (has ${level.crystals.length})`);
  assert(level.spawn && level.spawn.x !== undefined, `Level ${level.id} has valid spawn`);
  assert(level.portal && level.portal.x !== undefined, `Level ${level.id} has valid portal`);

  // Verify spawn is on ground
  assert(isGroundSupported(level.spawn.x, level.spawn.z, level), `Spawn point in Level ${level.id} is on ground`);

  // Verify portal is on ground
  assert(isGroundSupported(level.portal.x, level.portal.z, level), `Portal in Level ${level.id} is on ground`);

  // Verify every crystal is on valid ground
  for (let i = 0; i < level.crystals.length; i++) {
    const [cx, cz] = level.crystals[i];
    assert(isGroundSupported(cx, cz, level), `Crystal ${i} at (${cx}, ${cz}) in Level ${level.id} is on ground`);
  }

  // Simulate complete playthrough of the level
  const playInstance = new Garden(level.id);
  playInstance.start();

  // Collect all crystals
  for (const [cx, cz] of level.crystals) {
    playInstance.x = cx;
    playInstance.z = cz;
    playInstance.y = 0;
    playInstance.step(0.016);
  }
  assert.equal(playInstance.collected.size, level.crystals.length, `Collected all crystals in Level ${level.id}`);
  assert(playInstance.portalActive, `Portal activated in Level ${level.id}`);

  // Walk into portal
  playInstance.x = level.portal.x;
  playInstance.z = level.portal.z;
  playInstance.y = 0;
  playInstance.step(0.016);
  assert.equal(playInstance.mode, 'won', `Level ${level.id} successfully completed upon entering portal`);
}
console.log('✓ PASS: Suite 4: All three playable levels verified reachable and completable');

// --- SUITE 5: Persistence, Progression, and Storage Edge Cases ---
resetProgress();
let state = loadProgress();
assert.deepEqual(state.unlockedLevels, [1], 'Initial state has only Level 1 unlocked');
assert(!isLevelUnlocked(2, state), 'Level 2 is initially locked');
assert(!isLevelUnlocked(3, state), 'Level 3 is initially locked');

// Complete Level 1
unlockLevel(2);
recordCompletion(1, 38.4);
state = loadProgress();
assert(isLevelUnlocked(2, state), 'Level 2 is unlocked after Level 1 completion');
assert(isLevelCompleted(1, state), 'Level 1 marked completed');
assert.equal(state.bestTimes[1], 38.4, 'Best completion time recorded');

// Improving best time
recordCompletion(1, 32.1);
state = loadProgress();
assert.equal(state.bestTimes[1], 32.1, 'Faster completion time updates best time');

// Slower run does not overwrite best time
recordCompletion(1, 45.0);
state = loadProgress();
assert.equal(state.bestTimes[1], 32.1, 'Slower completion time does not degrade best time');

// Complete Level 2 and unlock Level 3
unlockLevel(3);
recordCompletion(2, 54.2);
state = loadProgress();
assert(isLevelUnlocked(3, state), 'Level 3 is unlocked');
assert(isLevelCompleted(2, state), 'Level 2 marked completed');

// Replaying a level does not erase unlocked levels
const replayInstance = new Garden(1);
replayInstance.start();
replayInstance.reset();
state = loadProgress();
assert(isLevelUnlocked(2, state) && isLevelUnlocked(3, state), 'Replaying Level 1 preserves all unlocks');

// Corrupted storage handling
saveProgress({ corrupt: true, unlockedLevels: 'invalid' });
const recovered = loadProgress();
assert(Array.isArray(recovered.unlockedLevels) && recovered.unlockedLevels.includes(1), 'Corrupted storage safely recovered');

// Reset progress
resetProgress();
const afterReset = loadProgress();
assert.deepEqual(afterReset.unlockedLevels, [1], 'Reset progress restores defaults');
assert.deepEqual(afterReset.completedLevels, [], 'Reset progress clears completions');
assert.deepEqual(afterReset.bestTimes, {}, 'Reset progress clears times');
console.log('✓ PASS: Suite 5: Progression, persistence, and storage resilience');

console.log('\n========================================');
console.log('ALL VERIFICATION TEST SUITES PASSED! (5/5)');
console.log('========================================');
