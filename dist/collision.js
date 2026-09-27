// Collision and physics configuration & geometry functions for Crystal Garden
export const COLLISION_CONFIG = {
  // UFO collision shape (closely matching visible saucer body)
  ufoRadius: 0.52,
  ufoHeight: 0.50,
  ufoYOffset: 0.06,

  // Player collision shape (closely matching Explorer torso/body)
  playerRadius: 0.28,
  playerHeight: 1.55,
  playerYOffset: 0.05,

  // Borderline favor to player
  playerFavorMargin: 0.08,
  verticalFavorMargin: 0.06,

  // Player ground footprint support radius
  footprintRadius: 0.28,

  // Invulnerability duration in seconds
  invulnerabilityDuration: 2.0,

  // Movement & Jump physics
  jumpVelocity: 7.6,
  gravity: 20,
  walkSpeed: 4.2,
  runSpeed: 6.2,
};

/**
 * Checks if a given (x, z) location has ground support from islands or bridges,
 * taking into account the character's footprint radius.
 */
export function isGroundSupported(x, z, level, footprint = COLLISION_CONFIG.footprintRadius) {
  if (!level) return false;

  // 1. Check islands (cylindrical disks of specified radius)
  if (level.islands) {
    for (let i = 0; i < level.islands.length; i++) {
      const isl = level.islands[i];
      const dist = Math.hypot(x - isl.x, z - isl.z);
      if (dist <= isl.radius + footprint) {
        return true;
      }
    }
  }

  // 2. Check bridges (axis-aligned rectangular decks)
  if (level.bridges) {
    for (let i = 0; i < level.bridges.length; i++) {
      const b = level.bridges[i];
      let minX, maxX, minZ, maxZ;

      if (b.minX !== undefined) {
        minX = b.minX;
        maxX = b.maxX;
        minZ = b.minZ;
        maxZ = b.maxZ;
      } else if (b.axis === 'x') {
        minX = b.start - 0.5;
        maxX = b.end + 0.5;
        const hw = b.halfWidth ?? 1.0;
        minZ = b.fixedCoord - hw;
        maxZ = b.fixedCoord + hw;
      } else {
        const hw = b.halfWidth ?? 1.0;
        minX = b.fixedCoord - hw;
        maxX = b.fixedCoord + hw;
        minZ = b.start - 0.5;
        maxZ = b.end + 0.5;
      }

      // 2D distance from (x, z) to axis-aligned box [minX, maxX] x [minZ, maxZ]
      const dx = Math.max(0, minX - x, x - maxX);
      const dz = Math.max(0, minZ - z, z - maxZ);
      if (Math.hypot(dx, dz) <= footprint) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks collision between player and a standard UFO drone or skimmer.
 * Evaluates both horizontal distance (with player-favoring threshold)
 * and vertical clearance (preventing damage when jumping over or below).
 */
export function checkUfoCollision(player, ufo, config = COLLISION_CONFIG) {
  // Horizontal separation
  const dx = player.x - ufo.x;
  const dz = player.z - ufo.z;
  const horizDist = Math.hypot(dx, dz);
  const ufoR = ufo.radius ?? config.ufoRadius;
  const horizThreshold = (config.playerRadius + ufoR) - config.playerFavorMargin;

  if (horizDist >= horizThreshold) {
    return false;
  }

  // Vertical separation
  const playerBottom = player.y + config.playerYOffset;
  const playerTop = player.y + config.playerHeight;
  const ufoHeight = ufo.height ?? config.ufoHeight;
  const ufoBottom = ufo.y + (ufo.yOffset ?? config.ufoYOffset);
  const ufoTop = ufo.y + ufoHeight;

  // Vertical overlap with player favor
  const overlapBottom = Math.max(playerBottom, ufoBottom);
  const overlapTop = Math.min(playerTop, ufoTop);

  // If player is clearly above top or clearly below bottom, safe!
  if (playerBottom > ufoTop - config.verticalFavorMargin) {
    return false; // Jumped safely over
  }
  if (playerTop < ufoBottom + config.verticalFavorMargin) {
    return false; // Walked safely below
  }

  return overlapTop >= overlapBottom;
}

/**
 * Checks if player is within an active hopper shockwave landing zone
 */
export function checkHopperShockwave(player, hopper, config = COLLISION_CONFIG) {
  if (hopper.state !== 'slam') return false;
  // Landing shockwave is grounded: safe if jumping high above ground
  if (player.y > 0.65) return false;
  const targetX = hopper.targetX ?? hopper.x ?? 0;
  const targetZ = hopper.targetZ ?? hopper.z ?? 0;
  const dist = Math.hypot(player.x - targetX, player.z - targetZ);
  return dist <= hopper.radius - config.playerFavorMargin;
}

/**
 * Checks if player is hit by an expanding electrical storm drone pulse
 */
export function checkStormPulse(player, drone, config = COLLISION_CONFIG) {
  if (drone.state !== 'pulse') return false;
  const dx = player.x - (drone.x ?? 0);
  const dz = player.z - (drone.z ?? 0);
  const dist = Math.hypot(dx, dz);
  // Expanding wave ring with thickness 0.45m
  const currentRadius = drone.currentPulseRadius || 1.0;
  const inRing = dist >= (currentRadius - 0.4) && dist <= (currentRadius + 0.15);
  // Safe if player has leaped high above the drone's pulse plane
  const droneY = drone.y ?? 1.0;
  const safeVertical = player.y > (droneY + 0.95);
  return inRing && !safeVertical;
}

/**
 * Checks if player is within a rover's charging hitbox
 */
export function checkRoverCollision(player, rover, config = COLLISION_CONFIG) {
  if (rover.state !== 'charge') return false;
  const dx = player.x - (rover.x ?? 0);
  const dz = player.z - (rover.z ?? 0);
  const dist = Math.hypot(dx, dz);
  if (dist > (0.65 + config.playerRadius - config.playerFavorMargin)) return false;
  // Safe if player jumped cleanly over rover
  if (player.y > 0.85) return false;
  return true;
}

/**
 * Checks if player is hit by a tempest hunter dashing vector
 */
export function checkTempestHunterDash(player, hunter, config = COLLISION_CONFIG) {
  if (hunter.state !== 'dash') return false;
  const dx = player.x - (hunter.x ?? 0);
  const dz = player.z - (hunter.z ?? 0);
  const dist = Math.hypot(dx, dz);
  if (dist > (0.60 + config.playerRadius - config.playerFavorMargin)) return false;
  if (player.y > 1.1) return false;
  return true;
}

/**
 * Checks if player steps into an ice patch on Pluto, returning true if slipping
 */
export function checkIcePatchSlip(player, icePatches) {
  if (!icePatches || !icePatches.length) return false;
  if (player.y > 0.2) return false; // Only slips when on the ground
  for (let i = 0; i < icePatches.length; i++) {
    const patch = icePatches[i];
    const dist = Math.hypot(player.x - patch.x, player.z - patch.z);
    if (dist <= patch.radius) {
      return true;
    }
  }
  return false;
}
