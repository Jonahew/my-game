import { LEVELS, getLevel, getPatrolPositions } from './levels.js';
import {
  COLLISION_CONFIG,
  isGroundSupported,
  checkUfoCollision,
  checkHopperShockwave,
  checkStormPulse,
  checkRoverCollision,
  checkTempestHunterDash,
  checkIcePatchSlip,
} from './collision.js';

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
    this.gravity = this.level.gravity || this.config.gravity;
    this.targetTime = this.level.targetTime || 60;
    this.reset();
  }

  reset() {
    this.x = this.spawnX ?? 0;
    this.y = this.spawnY ?? 0;
    this.z = this.spawnZ ?? -2;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.time = 0;
    this.lives = 3;
    this.damageTaken = 0;
    this.collected = new Set();
    this.relicCollected = false;
    this.mode = 'ready';
    this.hurtUntil = 0;
    this.portalActive = false;
    this.events = [];

    // Initialize enemy runtime state clones
    this.initEnemies();
  }

  initEnemies() {
    this.hoppers = (this.level.hoppers || []).map(h => ({
      ...h,
      x: h.homeX,
      y: 0,
      z: h.homeZ,
      state: 'idle',
      timer: h.timer || 1.2,
      reticleVisible: false
    }));

    this.rovers = (this.level.rovers || []).map(r => ({
      ...r,
      x: r.base,
      y: 0,
      z: r.fixedCoord,
      dir: r.dir || 1,
      state: 'scan',
      timer: 0,
      alertUntil: 0
    }));

    this.stormDrones = (this.level.stormDrones || []).map(d => ({
      ...d,
      y: 1.0,
      state: 'charge',
      timer: d.timer || 1.5,
      currentPulseRadius: 0
    }));

    this.sentinels = (this.level.sentinels || []).map(s => ({
      ...s,
      y: 0.8,
      state: 'idle',
      timer: s.timer || 1.5,
      gustActive: false
    }));

    this.hunters = (this.level.hunters || []).map(h => ({
      ...h,
      x: h.originX,
      y: 0.8,
      z: h.originZ,
      state: 'aim',
      timer: h.timer || 1.4
    }));

    this.icePatches = [];
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
    this.damageTaken++;
    this.lives--;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.z = this.spawnZ;
    this.vx = 0;
    this.vz = 0;
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

  updateEnemies(dt) {
    // 1. Lunar Hoppers
    for (const h of this.hoppers) {
      h.timer -= dt;
      if (h.state === 'idle') {
        if (h.timer <= 0) {
          h.state = 'telegraph';
          h.timer = 1.0;
          h.reticleVisible = true;
          // Determine next leap target
          const isAtHome = Math.hypot(h.x - h.homeX, h.z - h.homeZ) < 0.5;
          h.targetX = isAtHome ? h.targetX : h.homeX;
          h.targetZ = isAtHome ? h.targetZ : h.homeZ;
          h.startX = h.x;
          h.startZ = h.z;
        }
      } else if (h.state === 'telegraph') {
        if (h.timer <= 0) {
          h.state = 'jump';
          h.timer = 1.0;
        }
      } else if (h.state === 'jump') {
        const progress = 1 - (h.timer / 1.0);
        h.x = h.startX + (h.targetX - h.startX) * progress;
        h.z = h.startZ + (h.targetZ - h.startZ) * progress;
        // Parabolic arc
        h.y = Math.sin(progress * Math.PI) * 2.8;
        if (h.timer <= 0) {
          h.x = h.targetX;
          h.z = h.targetZ;
          h.y = 0;
          h.state = 'slam';
          h.timer = 0.4;
          this.events.push('hopper-slam');
        }
      } else if (h.state === 'slam') {
        if (h.timer <= 0) {
          h.state = 'recovery';
          h.timer = 1.6;
          h.reticleVisible = false;
        }
      } else if (h.state === 'recovery') {
        if (h.timer <= 0) {
          h.state = 'idle';
          h.timer = 1.2;
        }
      }
    }

    // 2. Mars Survey Rovers
    for (const r of this.rovers) {
      if (r.state === 'scan') {
        // Patrol back and forth
        r.x += r.dir * 1.8 * dt;
        if (Math.abs(r.x - r.base) > r.range) {
          r.dir *= -1;
          r.x = r.base + Math.sign(r.x - r.base) * r.range;
        }
        // Detect player in forward scanning cone
        const dx = this.x - r.x;
        const dz = this.z - r.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 4.2 && Math.sign(dx) === r.dir && Math.abs(dz) < 1.4 && this.y < 1.2) {
          r.state = 'alert';
          r.timer = 0.8;
          this.events.push('rover-alert');
        }
      } else if (r.state === 'alert') {
        r.timer -= dt;
        if (r.timer <= 0) {
          r.state = 'charge';
          r.timer = 1.0;
          r.chargeSpeed = r.dir * 5.5;
        }
      } else if (r.state === 'charge') {
        r.x += r.chargeSpeed * dt;
        r.timer -= dt;
        if (r.timer <= 0 || Math.abs(r.x - r.base) > (r.range + 1.5)) {
          r.state = 'recovery';
          r.timer = 2.0;
        }
      } else if (r.state === 'recovery') {
        r.timer -= dt;
        if (r.timer <= 0) {
          r.state = 'scan';
          r.dir *= -1;
        }
      }
    }

    // 3. Jupiter Storm Drones
    for (const sd of this.stormDrones) {
      sd.timer -= dt;
      if (sd.state === 'charge') {
        if (sd.timer <= 0) {
          sd.state = 'pulse';
          sd.timer = 0.85;
          sd.currentPulseRadius = 0.5;
          this.events.push('storm-pulse');
        }
      } else if (sd.state === 'pulse') {
        sd.currentPulseRadius += (sd.maxRadius / 0.85) * dt;
        if (sd.timer <= 0) {
          sd.state = 'recovery';
          sd.timer = 2.4;
          sd.currentPulseRadius = 0;
        }
      } else if (sd.state === 'recovery') {
        if (sd.timer <= 0) {
          sd.state = 'charge';
          sd.timer = 1.5;
        }
      }
    }

    // 4. Uranus Wind Sentinels
    for (const ws of this.sentinels) {
      ws.timer -= dt;
      if (ws.state === 'idle') {
        if (ws.timer <= 0) {
          ws.state = 'telegraph';
          ws.timer = 1.1;
        }
      } else if (ws.state === 'telegraph') {
        if (ws.timer <= 0) {
          ws.state = 'gust';
          ws.timer = 1.4;
          this.events.push('wind-gust');
        }
      } else if (ws.state === 'gust') {
        if (ws.timer <= 0) {
          ws.state = 'recovery';
          ws.timer = 2.5;
        }
      } else if (ws.state === 'recovery') {
        if (ws.timer <= 0) {
          ws.state = 'idle';
          ws.timer = 1.5;
        }
      }
    }

    // 5. Neptune Tempest Hunters
    for (const th of this.hunters) {
      th.timer -= dt;
      if (th.state === 'aim') {
        if (th.timer <= 0) {
          th.state = 'dash';
          th.timer = 0.5;
          this.events.push('tempest-dash');
        }
      } else if (th.state === 'dash') {
        const progress = 1 - (th.timer / 0.5);
        th.x = th.originX + (th.targetX - th.originX) * progress;
        th.z = th.originZ + (th.targetZ - th.originZ) * progress;
        if (th.timer <= 0) {
          th.x = th.targetX;
          th.z = th.targetZ;
          th.state = 'recovery';
          th.timer = 2.0;
        }
      } else if (th.state === 'recovery') {
        if (th.timer <= 0) {
          // Swap origin and target for next run
          const tmpX = th.originX;
          const tmpZ = th.originZ;
          th.originX = th.targetX;
          th.originZ = th.targetZ;
          th.targetX = tmpX;
          th.targetZ = tmpZ;
          th.state = 'aim';
          th.timer = 1.4;
        }
      }
    }

    // 6. Pluto Frost Crawlers (Periodically leave ice patches)
    if (this.level.destinationType === 'pluto') {
      const crawlers = getPatrolPositions(this.level, this.time);
      if (Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) {
        for (const c of crawlers) {
          if (this.icePatches.length < 8) {
            this.icePatches.push({ x: c.x, z: c.z, radius: 1.1, life: 6.5 });
          }
        }
      }
      // Decay ice patches
      for (let i = this.icePatches.length - 1; i >= 0; i--) {
        this.icePatches[i].life -= dt;
        if (this.icePatches[i].life <= 0) {
          this.icePatches.splice(i, 1);
        }
      }
    }
  }

  step(dt, { x = 0, z = 0, jump = false, run = false } = {}) {
    this.events = [];
    if (this.mode !== 'playing') return;

    dt = Math.min(dt, 0.05);
    this.time += dt;

    // Update level enemies
    this.updateEnemies(dt);

    // Lateral wind push from Uranus Wind Sentinels
    let windPushX = 0;
    let windPushZ = 0;
    for (const ws of this.sentinels) {
      if (ws.state === 'gust') {
        const dx = this.x - ws.x;
        const dz = this.z - ws.z;
        if (Math.hypot(dx, dz) < ws.range) {
          windPushX += ws.dirX * ws.gustForce * dt;
          windPushZ += ws.dirZ * ws.gustForce * dt;
        }
      }
    }

    // Pluto Ice Patch traction
    const isSlipping = checkIcePatchSlip({ x: this.x, y: this.y, z: this.z }, this.icePatches);
    const speed = run ? this.config.runSpeed : this.config.walkSpeed;
    const n = Math.max(1, Math.hypot(x, z));

    let nx, nz;
    if (isSlipping) {
      // Retain glide inertia
      this.vx = this.vx * 0.94 + (x / n) * speed * dt * 0.4;
      this.vz = this.vz * 0.94 + (z / n) * speed * dt * 0.4;
      nx = this.x + this.vx + windPushX;
      nz = this.z + this.vz + windPushZ;
    } else {
      this.vx = (x / n) * speed * dt;
      this.vz = (z / n) * speed * dt;
      nx = this.x + this.vx + windPushX;
      nz = this.z + this.vz + windPushZ;
    }

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

    // Jump handling with footprint ground support & low-gravity tuning
    if (jump && this.y === 0 && this.isGround(this.x, this.z)) {
      // Dynamic jump velocity tuned smoothly to destination gravity
      const jumpVel = this.gravity < 12 ? 6.2 : this.config.jumpVelocity;
      this.vy = jumpVel;
    }

    const previousY = this.y;
    this.vy -= this.gravity * dt;
    this.y += this.vy * dt;

    // Landing on ground (footprint supported)
    if (this.isGround(this.x, this.z) && previousY >= 0 && this.y <= 0) {
      this.y = 0;
      this.vy = 0;
    }

    // Fall below level
    if (this.y < -5) {
      this.damage();
      return;
    }

    // Crystal collection
    this.level.crystals.forEach(([gx, gz], i) => {
      if (!this.collected.has(i) && Math.hypot(this.x - gx, this.z - gz) < 1.05 && this.y < 1.9 && this.y >= 0) {
        this.collected.add(i);
        this.events.push('gem');
        if (this.collected.size === this.crystalCount) {
          this.portalActive = true;
          this.events.push('portal-activated');
        }
      }
    });

    // Hidden Planetary Relic collection
    if (!this.relicCollected && this.level.relic) {
      const r = this.level.relic;
      if (Math.hypot(this.x - r.x, this.z - r.z) < 1.2 && Math.abs(this.y - r.y) < 1.4) {
        this.relicCollected = true;
        this.events.push('relic');
      }
    }

    // Hazard & Enemy collisions (with invulnerability check)
    if (this.time >= this.hurtUntil) {
      const p = { x: this.x, y: this.y, z: this.z };

      // 1. Standard UFO patrols (Level 1)
      if (this.level.patrols) {
        const patrolPositions = getPatrolPositions(this.level, this.time);
        for (let i = 0; i < patrolPositions.length; i++) {
          if (checkUfoCollision(p, patrolPositions[i], this.config)) {
            this.damage();
            return;
          }
        }
      }

      // 2. Lunar Hoppers (Level 2)
      for (const h of this.hoppers) {
        if (checkHopperShockwave(p, h, this.config)) {
          this.damage();
          return;
        }
      }

      // 3. Survey Rovers (Level 3)
      for (const r of this.rovers) {
        if (checkRoverCollision(p, r, this.config)) {
          this.damage();
          return;
        }
      }

      // 4. Storm Drones (Level 4)
      for (const sd of this.stormDrones) {
        if (checkStormPulse(p, sd, this.config)) {
          this.damage();
          return;
        }
      }

      // 5. Ring Skimmers (Level 5)
      if (this.level.skimmers) {
        for (const sk of this.level.skimmers) {
          const s = (this.time * sk.speed + sk.phase);
          const sx = sk.cx + Math.cos(s) * sk.rx;
          const sz = sk.cz + Math.sin(s) * sk.rz;
          if (checkUfoCollision(p, { x: sx, y: sk.y, z: sz }, this.config)) {
            this.damage();
            return;
          }
        }
      }

      // 6. Tempest Hunters (Level 7)
      for (const th of this.hunters) {
        if (checkTempestHunterDash(p, th, this.config)) {
          this.damage();
          return;
        }
      }

      // 7. Frost Crawlers (Level 8)
      if (this.level.crawlers) {
        const crawlerPositions = getPatrolPositions(this.level, this.time);
        for (let i = 0; i < crawlerPositions.length; i++) {
          if (checkUfoCollision(p, { ...crawlerPositions[i], radius: 0.45, height: 0.4 }, this.config)) {
            this.damage();
            return;
          }
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
      levelName: this.level.name,
      gravity: this.gravity,
      mode: this.mode,
      crystals: this.collected.size,
      totalCrystals: this.crystalCount,
      relicCollected: this.relicCollected,
      lives: this.lives,
      damageTaken: this.damageTaken,
      targetTime: this.targetTime,
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
