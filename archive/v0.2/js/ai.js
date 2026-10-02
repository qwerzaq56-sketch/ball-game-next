import { Entity, sizeFromGrowth, computeSkillStage } from './entity.js';
import { canAbsorb, canEatOrb, isHostile, dist } from './collision.js';
import { canStartAttack, startAttack, updateAttack, canStartDodge, startDodge, updateDodge, attackRangeForSize } from './combat.js';

// AI states, implemented in priority order per spec section 25:
// Search -> Chase -> Eat(resolved centrally by Game) -> Attack -> Dodge -> Dead.
// Idle/Recover/Flee are folded into Search/Chase for the prototype.

export class AIEntity extends Entity {
  constructor({ x, y, color, colorHex, balance }) {
    const startSize = balance.world.minOrbSize * 2.2 + Math.random() * 10;
    super({
      x,
      y,
      size: startSize,
      color,
      colorHex,
      moveSpeed: balance.ai.movementSpeed * (0.8 + Math.random() * 0.4),
      behavior: 'ai',
      hp: startSize * 5,
      maxHp: startSize * 5,
    });
    this.baseSize = startSize;
    this.growth = 0;
    this.state = 'search'; // search | chase_eat | chase_fight | flee
    this.target = null;
    this.decisionTimer = Math.random() * 0.3;
    this._recomputeSkillStage(balance);
  }

  addGrowth(amount, balance) {
    this.growth += amount;
    const newSize = sizeFromGrowth(this.growth, this.baseSize, balance.growth.growthToSizeRatio);
    const newMaxHp = newSize * 5;
    this.hp = Math.min(this.hp + Math.max(0, newMaxHp - this.maxHp), newMaxHp);
    this.size = newSize;
    this.maxHp = newMaxHp;
    this._recomputeSkillStage(balance);
  }

  // Size-driven Skill Stage, identical rule to Player (spec v0.2 §12-15) — AI gets no banner.
  _recomputeSkillStage(balance) {
    this.skillStage = computeSkillStage(this.size, balance);
    this.attackUnlocked = this.skillStage >= 1;
    this.dodgeUnlocked = this.skillStage >= 2;
  }
}

export function updateAI(ai, dt, game, balance) {
  if (!ai.alive) return;

  updateAttack(ai, dt, balance, game.hostileTargetsFor(ai), game);
  updateDodge(ai, dt, balance);

  // Held in an absorption grip: no independent action until it resolves.
  if (ai.beingAbsorbedByRef) return;

  // Committed to an attack or dodge animation: no fresh decisions, but charging already
  // moves the entity inside updateAttack/updateDodge.
  if (ai.attackState !== 'READY' || ai.dodgeState === 'DODGING') return;

  ai.decisionTimer -= dt;
  if (ai.decisionTimer <= 0) {
    ai.decisionTimer = 0.2 + Math.random() * 0.15;
    decideAI(ai, game, balance);
  }

  reactToThreats(ai, game, balance);
  moveAI(ai, dt, balance);
}

function decideAI(ai, game, balance) {
  const cfg = balance.ai;
  const nearby = game.getNearbyEntities(ai, cfg.detectionRange);

  let nearestEdible = null;
  let edibleDist = Infinity;
  let nearestAbsorbable = null;
  let absorbableDist = Infinity;
  let nearestHostile = null;
  let hostileDist = Infinity;

  for (const other of nearby) {
    if (!other.alive) continue;
    const d = dist(ai, other);
    if (canEatOrb(ai, other, balance) && d < edibleDist) {
      nearestEdible = other;
      edibleDist = d;
    }
    if (canAbsorb(ai, other) && d < absorbableDist) {
      nearestAbsorbable = other;
      absorbableDist = d;
    }
    if (isHostile(ai, other) && d < hostileDist) {
      nearestHostile = other;
      hostileDist = d;
    }
  }

  const hpRatio = ai.hp / ai.maxHp;
  if (nearestHostile && hpRatio <= cfg.fleeThreshold && nearestHostile.size > ai.size) {
    ai.state = 'flee';
    ai.target = nearestHostile;
    return;
  }

  // pick whichever consumable target (orb or same-color rival) is closest
  const consumeTarget = absorbableDist < edibleDist ? nearestAbsorbable : nearestEdible;
  const consumeDist = Math.min(absorbableDist, edibleDist);
  if (consumeTarget) {
    ai.state = 'chase_eat';
    ai.target = consumeTarget;
    if (!nearestHostile || consumeDist <= hostileDist) return;
  }

  if (nearestHostile && ai.attackUnlocked && Math.random() < cfg.aggression) {
    ai.state = 'chase_fight';
    ai.target = nearestHostile;
    return;
  }

  if (!consumeTarget) {
    ai.state = 'search';
    ai.target = null;
  }
}

function reactToThreats(ai, game, balance) {
  if (!ai.dodgeUnlocked || !canStartDodge(ai)) return;
  const range = attackRangeForSize(ai.size, balance) * 1.5;
  const nearby = game.getNearbyEntities(ai, range);
  for (const other of nearby) {
    if (other.attackState === 'TELEGRAPH' && isHostile(ai, other)) {
      const d = dist(ai, other);
      if (d < range && Math.random() < 0.5) {
        const away = Math.atan2(ai.y - other.y, ai.x - other.x);
        startDodge(ai, away, balance);
        return;
      }
    }
  }
}

function moveAI(ai, dt, balance) {
  let targetAngle = null;
  let speed = ai.moveSpeed;

  if (ai.state === 'flee' && ai.target) {
    targetAngle = Math.atan2(ai.y - ai.target.y, ai.x - ai.target.x);
    speed *= 1.3;
  } else if (ai.state === 'chase_eat' && ai.target && ai.target.alive) {
    // actual eating/absorption is resolved centrally in Game.resolveConsumption()
    targetAngle = Math.atan2(ai.target.y - ai.y, ai.target.x - ai.x);
  } else if (ai.state === 'chase_fight' && ai.target && ai.target.alive) {
    const d = dist(ai, ai.target);
    targetAngle = Math.atan2(ai.target.y - ai.y, ai.target.x - ai.x);
    if (d <= attackRangeForSize(ai.size, balance) && canStartAttack(ai)) {
      startAttack(ai, targetAngle, balance);
      return;
    }
  } else {
    ai.wanderTimer -= dt;
    if (ai.wanderTimer <= 0) {
      ai.wanderAngle = Math.random() * Math.PI * 2;
      ai.wanderTimer = 1 + Math.random() * 2;
    }
    targetAngle = ai.wanderAngle;
    speed *= 0.55;
  }

  if (targetAngle !== null) {
    ai.facing = targetAngle;
    ai.x += Math.cos(targetAngle) * speed * dt;
    ai.y += Math.sin(targetAngle) * speed * dt;
  }
}
