// Shared attack (telegraph -> charge -> recovery) and dodge (instant -> invincible burst)
// state machines. Both Player and AI entities use the exact same functions so the two
// systems behave identically wherever they can — this is what makes AI-vs-AI combat and
// player-vs-AI combat feel consistent.

export function canStartAttack(entity) {
  return entity.attackState === 'READY' && entity.attackCooldownTimer <= 0;
}

export function startAttack(entity, dirAngle) {
  entity.attackState = 'TELEGRAPH';
  entity.attackDir = dirAngle;
  entity.attackTimer = 0;
  entity.attackHitSet.clear();
  entity.trail = [];
}

export function updateAttack(entity, dt, balance, hostiles, game) {
  const cfg = balance.attack;

  if (entity.attackCooldownTimer > 0) entity.attackCooldownTimer -= dt;
  if (entity.hitFlash > 0) entity.hitFlash -= dt;

  switch (entity.attackState) {
    case 'TELEGRAPH': {
      entity.attackTimer += dt;
      if (entity.attackTimer >= cfg.attackTelegraphTime) {
        entity.attackState = 'CHARGING';
        entity.attackTimer = 0;
        entity.attackCooldownTimer = cfg.attackCooldown;
      }
      break;
    }
    case 'CHARGING': {
      entity.attackTimer += dt;
      const speed = cfg.attackChargeSpeed;
      entity.x += Math.cos(entity.attackDir) * speed * dt;
      entity.y += Math.sin(entity.attackDir) * speed * dt;
      entity.trail.push({ x: entity.x, y: entity.y });
      if (entity.trail.length > 8) entity.trail.shift();

      for (const target of hostiles) {
        if (!target.alive || entity.attackHitSet.has(target.id)) continue;
        const d = Math.hypot(target.x - entity.x, target.y - entity.y);
        if (d <= entity.size / 2 + target.size / 2 + 4) {
          applyDamage(target, cfg.attackDamage, game);
          entity.attackHitSet.add(target.id);
        }
      }

      if (entity.attackTimer >= cfg.attackChargeDuration) {
        entity.attackState = 'RECOVERY';
        entity.attackTimer = 0;
      }
      break;
    }
    case 'RECOVERY': {
      entity.attackTimer += dt;
      if (entity.attackTimer >= cfg.attackRecoveryTime) {
        entity.attackState = 'READY';
        entity.attackTimer = 0;
        entity.trail = [];
      }
      break;
    }
  }
}

export function applyDamage(target, dmg, game) {
  if (target.invincible || !target.alive) return;
  target.hp -= dmg;
  target.hitFlash = 0.15;
  if (game) game.spawnHitParticles(target.x, target.y, target.colorHex);
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    if (game) game.onEntityDeath(target);
  }
}

export function canStartDodge(entity) {
  return entity.dodgeState === 'READY' && entity.dodgeCooldownTimer <= 0 && entity.attackState === 'READY';
}

export function startDodge(entity, dirAngle, balance) {
  entity.dodgeState = 'DODGING';
  entity.dodgeDir = dirAngle;
  entity.dodgeTimer = 0;
  entity.dodgeCooldownTimer = balance.dodge.dodgeCooldown;
  entity.invincible = true;
  entity.dodgeTrail = [];
}

export function updateDodge(entity, dt, balance) {
  if (entity.dodgeCooldownTimer > 0) entity.dodgeCooldownTimer -= dt;

  if (entity.dodgeState === 'DODGING') {
    const cfg = balance.dodge;
    entity.dodgeTimer += dt;
    const speed = cfg.dodgeDistance / cfg.dodgeDuration;
    entity.x += Math.cos(entity.dodgeDir) * speed * dt;
    entity.y += Math.sin(entity.dodgeDir) * speed * dt;
    entity.dodgeTrail.push({ x: entity.x, y: entity.y });
    if (entity.dodgeTrail.length > 6) entity.dodgeTrail.shift();

    if (entity.dodgeTimer >= cfg.dodgeInvincibleTime) {
      entity.invincible = false;
    }
    if (entity.dodgeTimer >= cfg.dodgeDuration) {
      entity.dodgeState = 'READY';
      entity.invincible = false;
    }
  }
}
