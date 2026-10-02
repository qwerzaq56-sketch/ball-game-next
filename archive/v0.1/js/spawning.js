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

export function spawnOrb(balance, pos = null) {
  const c = randomColor(balance);
  const size = balance.world.minOrbSize + Math.random() * (balance.world.maxOrbSize - balance.world.minOrbSize);
  const { x, y } = pos || randomWorldPos(balance);
  // growth value scales with orb size: small/medium/large orbs give different amounts.
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

export function spawnFragments(deadEntity, balance) {
  const cfg = balance.fragment;
  const fragments = [];
  for (let i = 0; i < cfg.fragmentCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (deadEntity.size + 20);
    const f = new Entity({
      x: deadEntity.x + Math.cos(angle) * dist,
      y: deadEntity.y + Math.sin(angle) * dist,
      size: cfg.fragmentSize,
      color: deadEntity.color,
      colorHex: deadEntity.colorHex,
      growthValue: cfg.fragmentGrowthValue,
      moveSpeed: 0,
      behavior: 'fragment',
      hp: 1,
      maxHp: 1,
    });
    fragments.push(f);
  }
  return fragments;
}
