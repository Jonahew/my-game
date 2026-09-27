// Collision and physics configuration & geometry functions
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
 * Checks collision between player and a UFO drone.
 * Evaluates both horizontal distance (with player-favoring threshold)
 * and vertical clearance (preventing damage when jumping over or below).
 */
export function checkUfoCollision(player, ufo, config = COLLISION_CONFIG) {
  // Horizontal separation
  const dx = player.x - ufo.x;
  const dz = player.z - ufo.z;
  const horizDist = Math.hypot(dx, dz);
  const horizThreshold = (config.playerRadius + config.ufoRadius) - config.playerFavorMargin;

  if (horizDist >= horizThreshold) {
    return false;
  }

  // Vertical separation
  const playerBottom = player.y + config.playerYOffset;
  const playerTop = player.y + config.playerHeight;
  const ufoBottom = ufo.y + config.ufoYOffset;
  const ufoTop = ufo.y + config.ufoHeight;

  // Vertical overlap with player favor
  const overlapBottom = Math.max(playerBottom, ufoBottom);
  const overlapTop = Math.min(playerTop, ufoTop);

  // If player is clearly above UFO top or clearly below UFO bottom, safe!
  if (playerBottom > ufoTop - config.verticalFavorMargin) {
    return false; // Jumped safely over UFO
  }
  if (playerTop < ufoBottom + config.verticalFavorMargin) {
    return false; // Walked safely below elevated UFO
  }

  return overlapTop >= overlapBottom;
}
