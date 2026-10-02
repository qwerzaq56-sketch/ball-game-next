// Shared attack (telegraph -> charge -> recovery) and dodge (instant -> invincible burst)
// state machines. Both Player and AI entities use the exact same functions so the two
// systems behave identically wherever they can.
//
// v0.2: attack range and dodge distance are no longer fixed globals — they scale with the
// entity's own Size (spec §16-18), snapshotted at the moment the action starts.
// v0.3: dodge now has priority over attack (can cancel telegraph/charge/recovery — spec §8),
// hits apply knockback and cancel any in-progress absorption on the target (spec §12-13),
// and dodge afterimages fade out on a real timer instead of lingering forever (spec §7).

import { cancelAbsorption } from './absorption.js';

export function attackRangeForSize(size, balance) {
  const c = balance.combatScaling;
  return Math.max(20, c.baseAttackRange + (size - c.referenceSize) * c.attackRangePerSize);
}

export function dodgeDistanceForSize(size, balance) {
  const c = balance.combatScaling;
  return Math.max(20, c.baseDodgeDistance + (size - c.referenceSize) * c.dodgeDistancePerSize);
}

export function canStartAttack(entity) {
  return entity.attackState === 'READY' && entity.attackCooldownTimer <= 0 && entity.dodgeState !== 'DODGING';
}

export function startAttack(entity, dirAngle, balance) {
  entity.attackState = 'TELEGRAPH';
  entity.attackDir = dirAngle;
  entity.attackTimer = 0;
  entity.attackHitSet.clear();
  entity.trail = [];
  entity.currentAttackRange = attackRangeForSize(entity.size, balance);
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
        if (game && entity === game.player) game.audio.attackCharge();
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

      const hitPadding = entity.currentAttackRange * 0.2;
      for (const target of hostiles) {
        if (!target.alive || entity.attackHitSet.has(target.id)) continue;
        const d = Math.hypot(target.x - entity.x, target.y - entity.y);
        if (d <= entity.size / 2 + target.size / 2 + hitPadding) {
          applyDamage(target, cfg.attackDamage, game, entity);
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

// v0.3: applyDamage now takes the attacker (for knockback direction + kill credit) and reads
// combat.* balance for knockback/flash tuning instead of a hardcoded flash duration.
export function applyDamage(target, dmg, game, attacker) {
  if (target.invincible || !target.alive) return;
  const cfg = game ? game.balance.combat : null;

  target.hp -= dmg;
  target.hitFlash = cfg ? cfg.hitFlashDuration : 0.08;

  if (attacker) applyKnockback(target, attacker, game);
  if (target.beingAbsorbedByRef) cancelAbsorption(target); // spec §13: a hit breaks an absorption grip

  if (game) {
    game.spawnHitParticles(target.x, target.y, target.colorHex);
    if (attacker === game.player) game.audio.hit();
    if (target === game.player) game.audio.damage();
  }

  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    if (game) game.onEntityDeath(target, attacker);
  }
}

// Bigger targets resist knockback more (spec §12-2): received = base / (size / referenceSize).
function applyKnockback(target, attacker, game) {
  if (!game) return;
  const cfg = game.balance.combat;
  const ref = game.balance.combatScaling.referenceSize;
  const dir = Math.atan2(target.y - attacker.y, target.x - attacker.x);
  const speed = (cfg.knockbackForce * cfg.knockbackResistance) / Math.max(0.2, target.size / ref);
  target.kx = Math.cos(dir) * speed;
  target.ky = Math.sin(dir) * speed;
  target.knockbackTimer = cfg.knockbackDuration;
  target.knockbackDuration = cfg.knockbackDuration;
}

// Eases the knockback impulse out to zero over knockbackDuration. Called every frame for
// every living player/AI entity, independent of attack/dodge/absorption state.
export function updateKnockback(entity, dt) {
  if (entity.knockbackTimer <= 0) return;
  const fraction = entity.knockbackTimer / entity.knockbackDuration;
  entity.x += entity.kx * fraction * dt;
  entity.y += entity.ky * fraction * dt;
  entity.knockbackTimer -= dt;
  if (entity.knockbackTimer <= 0) {
    entity.knockbackTimer = 0;
    entity.kx = 0;
    entity.ky = 0;
  }
}

// v0.3 spec §8: dodge has priority — it can cancel an in-progress attack outright, and is no
// longer blocked by being mid-absorption (the whole point of v0.3's absorption rework is that
// you can still act while grabbed).
export function canStartDodge(entity) {
  return entity.dodgeState === 'READY' && entity.dodgeCooldownTimer <= 0;
}

export function startDodge(entity, dirAngle, balance) {
  entity.attackState = 'READY';
  entity.attackTimer = 0;
  entity.trail = [];

  entity.dodgeState = 'DODGING';
  entity.dodgeDir = dirAngle;
  entity.dodgeTimer = 0;
  entity.dodgeCooldownTimer = balance.dodge.dodgeCooldown;
  entity.invincible = true;
  entity.currentDodgeDistance = dodgeDistanceForSize(entity.size, balance);
}

export function updateDodge(entity, dt, balance) {
  if (entity.dodgeCooldownTimer > 0) entity.dodgeCooldownTimer -= dt;

  if (entity.dodgeState === 'DODGING') {
    const cfg = balance.dodge;
    entity.dodgeTimer += dt;
    const speed = entity.currentDodgeDistance / cfg.dodgeDuration;
    entity.x += Math.cos(entity.dodgeDir) * speed * dt;
    entity.y += Math.sin(entity.dodgeDir) * speed * dt;
    entity.dodgeTrail.push({ x: entity.x, y: entity.y, life: balance.dodge.effectLifetime });

    if (entity.dodgeTimer >= cfg.dodgeInvincibleTime) {
      entity.invincible = false;
    }
    if (entity.dodgeTimer >= cfg.dodgeDuration) {
      entity.dodgeState = 'READY';
      entity.invincible = false;
    }
  }

  // age and prune afterimages every frame (not just while dodging) so they always fully clear
  if (entity.dodgeTrail.length) {
    for (const t of entity.dodgeTrail) t.life -= dt;
    entity.dodgeTrail = entity.dodgeTrail.filter((t) => t.life > 0);
  }
}
