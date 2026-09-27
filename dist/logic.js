import { LEVELS, getLevel, getPatrolPositions } from './levels.js';
import { COLLISION_CONFIG, isGroundSupported, checkUfoCollision } from './collision.js';

// Backwards-compatible exports for Level 1
export const centers = LEVELS[0].islands.map(i => [i.x, i.z]);
export const gems = LEVELS[0].crystals;

export function ground(x, z) {
  return isGroundSupported(x, z, LEVELS[0]);
}

export function patrols(t) {
  return getPatrolPositions(LEVELS[0], t).map(p => [p.x, p.z]);
}

export { COLLISION_CONFIG, LEVELS, getLevel, getPatrolPositions };

export class Garden {
  constructor(levelId = 1, customConfig = {}) {
    this.config = { ...COLLISION_CONFIG, ...customConfig };
    this.levelId = levelId;
    this.loadLevel(levelId);
  }

  loadLevel(levelId) {
    this.levelId = levelId;
    this.level = getLevel(levelId);
    this.spawnX = this.level.spawn.x;
    this.spawnY = this.level.spawn.y ?? 0;
    this.spawnZ = this.level.spawn.z;
    this.portal = this.level.portal;
    this.crystalCount = this.level.crystals.length;
    this.reset();
  }

  reset() {
    this.x = this.spawnX ?? 0;
    this.y = this.spawnY ?? 0;
    this.z = this.spawnZ ?? -2;
    this.vy = 0;
    this.time = 0;
    this.lives = 3;
    this.collected = new Set();
    this.mode = 'ready';
    this.hurtUntil = 0;
    this.portalActive = false;
    this.events = [];
  }

  start() {
    if (this.mode === 'won' || this.mode === 'lost') {
      this.reset();
    }
    this.mode = 'playing';
  }

  pause() {
    if (this.mode === 'playing') this.mode = 'paused';
  }

  resume() {
    if (this.mode === 'paused') this.mode = 'playing';
  }

  damage() {
    // Prevent single contact or rapid hits within invulnerability from taking multiple lives
    if (this.time < this.hurtUntil && this.time > 0) {
      return;
    }
    this.lives--;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.z = this.spawnZ;
    this.vy = 0;
    this.hurtUntil = this.time + this.config.invulnerabilityDuration;
    this.events.push('hurt');
    if (!this.lives) {
      this.mode = 'lost';
    }
  }

  isGround(x, z) {
    return isGroundSupported(x, z, this.level, this.config.footprintRadius);
  }

  step(dt, { x = 0, z = 0, jump = false, run = false } = {}) {
    this.events = [];
    if (this.mode !== 'playing') return;

    dt = Math.min(dt, 0.05);
    this.time += dt;

    const speed = run ? this.config.runSpeed : this.config.walkSpeed;
    const n = Math.max(1, Math.hypot(x, z));
    let nx = this.x + (x / n) * speed * dt;
    let nz = this.z + (z / n) * speed * dt;

    // Obstacle avoidance / collision
    const obstacles = this.level.obstacles || [];
    const pRadius = this.config.playerRadius;
    for (let i = 0; i < obstacles.length; i++) {
      const [ox, oz, r] = obstacles[i];
      const dx = nx - ox;
      const dz = nz - oz;
      const d = Math.hypot(dx, dz);
      const minD = r + pRadius;
      if (this.y < 1.5 && d < minD) {
        nx = ox + ((dx || 0.01) / Math.max(d, 0.01)) * minD;
        nz = oz + ((dz || 0.01) / Math.max(d, 0.01)) * minD;
      }
    }
    this.x = nx;
    this.z = nz;

    // Jump handling with footprint ground support
    if (jump && this.y === 0 && this.isGround(this.x, this.z)) {
      this.vy = this.config.jumpVelocity;
    }

    const previousY = this.y;
    this.vy -= this.config.gravity * dt;
    this.y += this.vy * dt;

    // Landing on ground (footprint supported)
    if (this.isGround(this.x, this.z) && previousY >= 0 && this.y <= 0) {
      this.y = 0;
      this.vy = 0;
    }

    // Genuine fall below garden
    if (this.y < -5) {
      this.damage();
      return;
    }

    // Crystal collection
    this.level.crystals.forEach(([gx, gz], i) => {
      if (!this.collected.has(i) && Math.hypot(this.x - gx, this.z - gz) < 0.95 && this.y < 1.7 && this.y >= 0) {
        this.collected.add(i);
        this.events.push('gem');
        if (this.collected.size === this.crystalCount) {
          this.portalActive = true;
          this.events.push('portal-activated');
        }
      }
    });

    // Fair UFO drone collision check
    if (this.time >= this.hurtUntil) {
      const patrolPositions = getPatrolPositions(this.level, this.time);
      for (let i = 0; i < patrolPositions.length; i++) {
        const ufo = patrolPositions[i];
        if (checkUfoCollision({ x: this.x, y: this.y, z: this.z }, ufo, this.config)) {
          this.damage();
          return;
        }
      }
    }

    // Entering the active portal triggers level completion
    const portal = this.portal;
    if (
      this.collected.size === this.crystalCount &&
      Math.hypot(this.x - portal.x, this.z - portal.z) < 1.35 &&
      this.y >= 0 &&
      this.y < 1.5
    ) {
      this.mode = 'won';
      this.events.push('win');
    }
  }

  snapshot() {
    return {
      level: this.levelId,
      mode: this.mode,
      crystals: this.collected.size,
      totalCrystals: this.crystalCount,
      lives: this.lives,
      elapsed: Math.round(this.time * 10) / 10,
      portalActive: this.collected.size === this.crystalCount,
      invulnerable: this.time < this.hurtUntil,
      position: {
        x: Math.round(this.x * 100) / 100,
        y: Math.round(this.y * 100) / 100,
        z: Math.round(this.z * 100) / 100,
      }
    };
  }
}
