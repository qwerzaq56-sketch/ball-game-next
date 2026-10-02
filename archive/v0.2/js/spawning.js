import { Entity } from './entity.js';
import { AIEntity } from './ai.js';

function randomColor(balance) {
  return balance.colors[Math.floor(Math.random() * balance.colors.length)];
}

function randomWorldPos(balance) {
  return {
    x: Math.random() * balance.world.worldWidth,
    y: Math.random() * balance.world.worldHeight,
  };
}

// v0.2: Orb and Fragment are unified — both are just "orb" behavior entities. Color is kept
// purely for visual variety / to mark which faction an orb came from; it no longer gates
// whether it can be eaten (see collision.js#canEatOrb).
export function spawnOrb(balance, pos = null) {
  const c = randomColor(balance);
  const size = balance.world.minOrbSize + Math.random() * (balance.world.maxOrbSize - balance.world.minOrbSize);
  const { x, y } = pos || randomWorldPos(balance);
  const growthValue = Math.round(5 + (size - balance.world.minOrbSize) * 2);
  return new Entity({
    x,
    y,
    size,
    color: c.id,
    colorHex: c.color,
    growthValue,
    moveSpeed: 0,
    behavior: 'orb',
    hp: 1,
    maxHp: 1,
  });
}

export function spawnAI(balance, colorDef, pos = null) {
  const { x, y } = pos || randomWorldPos(balance);
  return new AIEntity({ x, y, color: colorDef.id, colorHex: colorDef.color, balance });
}

// Orbs generated when a Player/AI dies in combat — same Entity type as spawnOrb(), just
// smaller and keeping the dead entity's color (spec v0.2 §4: no more separate "Fragment").
export function spawnDeathOrbs(deadEntity, balance) {
  const cfg = balance.deathOrb;
  const orbs = [];
  for (let i = 0; i < cfg.deathOrbCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (deadEntity.size + 20);
    const orb = new Entity({
      x: deadEntity.x + Math.cos(angle) * dist,
      y: deadEntity.y + Math.sin(angle) * dist,
      size: cfg.deathOrbSize,
      color: deadEntity.color,
      colorHex: deadEntity.colorHex,
      growthValue: cfg.deathOrbGrowthValue,
      moveSpeed: 0,
      behavior: 'orb',
      hp: 1,
      maxHp: 1,
    });
    orb.fromDeath = true; // purely cosmetic marker, does not affect eating rules
    orbs.push(orb);
  }
  return orbs;
}
