// Base entity used by orbs, fragments, AI balls and the player.
// Combat/dodge state fields live here so combat.js can operate on any entity generically.

let nextId = 1;

export function sizeFromGrowth(growth, baseSize, growthToSizeRatio) {
  return baseSize + Math.sqrt(Math.max(growth, 0)) * growthToSizeRatio;
}

export class Entity {
  constructor({ x, y, size, color, colorHex, growthValue = 0, moveSpeed = 80, behavior = 'orb', hp = null, maxHp = null }) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.colorHex = colorHex;
    this.growthValue = growthValue;
    this.moveSpeed = moveSpeed;
    this.behavior = behavior; // 'orb' | 'fragment' | 'ai' | 'player'
    this.maxHp = maxHp ?? size * 5;
    this.hp = hp ?? this.maxHp;
    this.alive = true;
    this.facing = 0;

    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;

    // shared attack state machine (see combat.js)
    this.attackState = 'READY'; // READY | TELEGRAPH | CHARGING | RECOVERY
    this.attackTimer = 0;
    this.attackCooldownTimer = 0;
    this.attackDir = 0;
    this.attackHitSet = new Set();
    this.trail = [];

    // shared dodge state machine
    this.dodgeState = 'READY'; // READY | DODGING
    this.dodgeTimer = 0;
    this.dodgeCooldownTimer = 0;
    this.dodgeDir = 0;
    this.invincible = false;
    this.dodgeTrail = [];

    this.hitFlash = 0;
    this.isFragment = behavior === 'fragment';
  }
}
