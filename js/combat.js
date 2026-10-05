import {angleTo,delta} from './topology.js';
// Shared attack (telegraph -> charge -> recovery) and dodge (instant -> invincible burst)
// state machines. Both Player and AI entities use the exact same functions so the two
// systems behave identically wherever they can.
//
// v0.2: attack range and dodge distance are no longer fixed globals — they scale with the
// entity's own Size (spec §16-18), snapshotted at the moment the action starts.
// v0.3: dodge now has priority over attack (can cancel telegraph/charge/recovery — spec §8),
// hits apply knockback and cancel any in-progress absorption on the target (spec §12-13),
// and dodge afterimages fade out on a real timer instead of lingering forever (spec §7).
// v0.4: attack damage scales with Size, HP regenerates after a no-damage delay.
// v0.5: attack/dodge are stack-based resources instead of a single-shot cooldown (spec §7-8,
// §25) — `attackCooldown`/`dodgeCooldown` are now the *per-stack regen interval*, not a
// mandatory wait between every use. Defense reduces incoming damage (spec §3). Charge distance
// is derived from the attack's own range instead of a fixed speed constant, fixing the v0.4 bug
// where a bigger attack range didn't actually make the dash travel any further (spec §6).
// v0.6: Defense moved under combatScaling (spec §2-1) — it's Size-driven combat scaling, not
// its own subsystem. Attack *charge duration* now also scales with Size (spec §4-2, separate
// from charge *distance* — see startAttack), and AI gets its own, slower attack cadence: a
// dedicated `ai.attackCooldown` for stack regen plus a hard per-attack gate
// (`aiAttackGateTimer`) so a multi-stack AI can't burst every charge out instantly (spec §3).
// Dodge distance switches from the exponential Size curve to the flat linear one the spec
// gives directly (spec §6): `baseDistance + size * distanceGrowth`.

import {isHostile,dist} from './collision.js';
import { cancelAbsorption } from './absorption.js';

export function attackDamageForSize(size, balance) {
  const c = balance.combatScaling;
  return Math.max(1, c.baseAttackDamage + size * c.attackDamagePerSize);
}

export function attackDamageForEntity(e,balance){
 return attackDamageForSize(e.size,balance)+(e.summoned?.owner?.alive?attackDamageForSize(e.summoned.owner.size,balance)*(e.summoned.attackInheritance??.5):0);
}

export function defenseForSize(size, balance) {
  const c = balance.combatScaling;
  return Math.max(0, c.baseDefense + size * c.defensePerSize);
}

export function applyDefense(rawDamage, targetSize, balance, multiplier=1) {
  const c = balance.combatScaling;
  return Math.max(c.minimumDamage, rawDamage - defenseForSize(targetSize, balance)*multiplier);
}

export function attackRangeForSize(size, balance) {
  const c = balance.combatScaling;
  return Math.max(20, c.baseAttackRange * Math.pow(size / c.referenceSize, c.attackRangeGrowthExponent));
}

export function attackChargeDistanceForSize(size,balance,apex=false){
 const c=balance.combatScaling;
 return Math.min(c.maxChargeDistance??600,attackRangeForSize(size,balance)*c.chargeDistanceMultiplier)*(apex?.7:1);
}

// Shared by actual movement and the charge preview; zero charge still advances visibly.
export function chargedAttackDistance(size,balance,apex=false,charge=0){
 const full=attackChargeDistanceForSize(size,balance,apex),minimum=Math.min(full,Math.max(balance.attack.minimumChargeDistance??70,full*(balance.attack.minChargeDistanceFraction??.12)));
 return minimum+(full-minimum)*Math.max(0,Math.min(1,charge));
}

// v0.6 spec §4-2: bigger balls hit harder and further, but need longer to wind up — a
// deliberate risk/reward tradeoff, not just a range bonus. Independent of attackRangeForSize;
// see startAttack for how the two combine into an actual dash speed.
export function attackChargeDurationForSize(size, balance) {
  const c = balance.combatScaling;
  return Math.max(0.05, c.attackChargeDurationBase + (Math.min(size,c.attackTimingSoftcapSize??Infinity)+Math.max(0,size-(c.attackTimingSoftcapSize??Infinity))*(c.attackTimingBeyondScale??1)) * (c.attackTimingSizeScale ?? 1) * c.attackChargeDurationPerSize);
}

// v0.6 balance pass: Telegraph time used to be a flat constant (0.4s for every size) — now it
// scales with Size exactly like Charge Duration, so a bigger ball also gives opponents more
// Legacy tuning helper; basic attacks now use the charge hold as their only preparation.
export function attackTelegraphTimeForSize(size, balance) {
  const c = balance.combatScaling;
  return Math.max(0, c.attackTelegraphTimeBase + (Math.min(size,c.attackTimingSoftcapSize??Infinity)+Math.max(0,size-(c.attackTimingSoftcapSize??Infinity))*(c.attackTimingBeyondScale??1)) * (c.attackTimingSizeScale ?? 1) * c.attackTelegraphTimePerSize);
}

// v0.6 spec §6: linear instead of v0.5's exponential curve — Base(100) + Size × Growth(0.8).
export function dodgeDistanceForSize(size, balance) {
  const d = balance.dodge;
  return Math.max(20, d.baseDistance + size * d.distanceGrowth);
}

export function canStartAttack(entity) {
  if (entity.frozen>0 || entity.specialCast || entity.attackStack <= 0 || entity.attackState !== 'READY' || entity.dodgeState === 'DODGING') return false;
  if (entity.behavior === 'ai' && entity.aiAttackGateTimer > 0) return false;
  return true;
}

export function aiAttackCharge(entity,balance){
 const target=entity.target;
 const gap=target?.alive?Math.max(0,dist(entity,target)-(entity.size+target.size)/2):Infinity;
 // Reserve hurried attacks for an incoming contact strike or an urgent escape.
 const urgent=!!entity.beingAbsorbedByRef || (entity.state==='flee'&&entity.hp/entity.maxHp<=.3) || (target?.attackState==='CHARGING'&&gap<=60);
 return urgent?(balance.attack.aiMinChargeFraction??.3):1;
}
export function startAttack(entity, dirAngle, balance,charge=entity.behavior==='ai'?aiAttackCharge(entity,balance):1) {
  const level=Math.max(0,Math.min(1,Number.isFinite(charge)?charge:0)),minPower=balance.attack.minChargeDamageMultiplier??.35;
  entity.currentAttackPower=minPower+(1+(balance.attack.maxChargeDamageBonus??1)-minPower)*level;
  entity.currentAttackCharge=level;if(entity.behavior==='ai')entity.attackHoldProgress=0;
  entity.attackStack -= 1;
  entity.attackState = entity.behavior==='ai'?'TELEGRAPH':'CHARGING';
  entity.attackDir = dirAngle;
  entity.attackTimer = 0;
  entity.attackHitSet.clear();
  entity.trail = [];
  const c = balance.combatScaling;
  entity.currentAttackRange = attackRangeForSize(entity.size, balance);
  entity.currentChargeDistance = chargedAttackDistance(entity.size,balance,entity.apex,level);
  entity.currentChargeDuration = Math.max(.08,attackChargeDurationForSize(entity.size, balance)*(.2+.8*level));
  entity.currentTelegraphTime = entity.behavior==='ai'?(balance.attack.manualChargeSeconds??.9)*level:0;
  if (entity.behavior === 'ai') entity.aiAttackGateTimer = balance.ai.attackCooldown;
}

export function updateAttack(entity, dt, balance, hostiles, game) {
  const cfg = balance.attack;

  if(entity.behavior==='ai'&&entity.attackState!=='TELEGRAPH')entity.attackHoldProgress=0;
  if (entity.hitFlash > 0) entity.hitFlash -= dt;

  switch (entity.attackState) {
    case 'TELEGRAPH': {
      entity.attackTimer += dt;
      if(entity.behavior==='ai')entity.attackHoldProgress=Math.min(entity.currentAttackCharge,entity.attackTimer/(cfg.manualChargeSeconds??.9));
      if (entity.attackTimer + 1e-8 >= entity.currentTelegraphTime) {
        entity.attackState = 'CHARGING';
        entity.attackTimer = 0;
        if (game && entity === game.player) game.audio.attackCharge();
      }
      break;
    }
    case 'CHARGING': {
      const used=Math.min(dt,Math.max(0,entity.currentChargeDuration-entity.attackTimer));
      const previous={x:entity.x,y:entity.y};
      entity.attackTimer += dt;
      // v0.5 fix: speed is derived from the range-scaled charge distance so a bigger attack
      // range always means the dash actually travels further, not just a wider hit padding.
      // v0.6: the duration it's spread over now also scales with Size independently (see
      // attackChargeDurationForSize) — a bigger ball's dash covers more ground but takes longer.
      const speed = entity.currentChargeDistance / entity.currentChargeDuration;
      entity.x += Math.cos(entity.attackDir) * speed * used;
      entity.y += Math.sin(entity.attackDir) * speed * used;
      entity.trail.push({ x: entity.x, y: entity.y });
      if (entity.trail.length > 8) entity.trail.shift();

      const dx=entity.x-previous.x,dy=entity.y-previous.y,length=dx*dx+dy*dy;
      const rawDamage = attackDamageForEntity(entity, balance) * (balance.attack.baseDamageMultiplier??1) * (entity.currentAttackPower??1) * (game?.abilities?.damageMultiplier(entity) ?? 1);
      for (const target of hostiles) {
        if (!target.alive || entity.attackHitSet.has(target.id)) continue;
        const relative=delta(previous,target,entity._world),t=length?Math.max(0,Math.min(1,(relative.x*dx+relative.y*dy)/length)):0;
        const d=Math.hypot(relative.x-dx*t,relative.y-dy*t);
        if (d <= entity.size / 2 + target.size / 2) {
          applyDamage(target, rawDamage, game, entity, balance);
          entity.attackHitSet.add(target.id);
        }
      }

      if (entity.attackTimer >= entity.currentChargeDuration) {
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

// v0.5: attackStack/dodgeStack refill one charge at a time, every `cooldownSeconds`, capped at
// the entity's current max (itself Size-driven — see entity.js#computeMaxStack and
// player.js/ai.js's skill-stage recompute).
// v0.6: `cooldownSeconds` is now passed in explicitly rather than always read from
// `balance.attack.attackCooldown` — AI uses its own, slower `balance.ai.attackCooldown` (spec
// §3), the player keeps `balance.attack.attackCooldown`. See game.js's shared per-entity loop.
export function updateAttackStack(entity, dt, cooldownSeconds) {
  if (entity.aiAttackGateTimer > 0) entity.aiAttackGateTimer = Math.max(0, entity.aiAttackGateTimer - dt);
  if (entity.attackStack >= entity.attackMaxStack) {
    entity.attackStackTimer = 0;
    return;
  }
  entity.attackStackTimer += dt;
  if (entity.attackStackTimer >= cooldownSeconds) {
    entity.attackStackTimer -= cooldownSeconds;
    entity.attackStack = Math.min(entity.attackMaxStack, entity.attackStack + 1);
  }
}

export function updateDodgeStack(entity, dt, balance) {
  if (entity.dodgeStack >= entity.dodgeMaxStack) {
    entity.dodgeStackTimer = 0;
    return;
  }
  entity.dodgeStackTimer += dt;
  if (entity.dodgeStackTimer >= balance.dodge.dodgeCooldown) {
    entity.dodgeStackTimer -= balance.dodge.dodgeCooldown;
    entity.dodgeStack = Math.min(entity.dodgeMaxStack, entity.dodgeStack + 1);
  }
}

export const RETALIATION_MEMORY = 3; // seconds an AI remembers its last attacker

// v0.5: applyDamage now runs raw damage through Defense (spec §3) before it touches HP.
export function applyDamage(target, rawDamage, game, attacker, balance, options = {}) {
  if ((attacker && !isHostile(attacker,target)) || target.invincible || target.dustInvulnerableRemaining>0 || !target.alive) return false;
  if(options.kind!=='field' && game?.abilities?.miss(target)){game.spawnFloatingText(target.x,target.y-target.size/2,"MISS","#eab308");return false;}
  const bal = balance || (game && game.balance);
  const defended = bal && !options.ignoreDefense ? applyDefense(rawDamage, target.size, bal,game?.abilities?.defenseMultiplier(target)??1) : rawDamage;
  let dmg = Math.max(bal?.combatScaling?.minimumDamage??1,defended*Math.max(0,Math.min(1,options.postDefenseMultiplier??1)));
  let shield=Math.min(dmg,Math.max(0,target.shieldHp??0));target.shieldHp=Math.max(0,(target.shieldHp??0)-shield);dmg-=shield;
  if((target.obsidianShieldUntil??0)>(game?.gameTime??Infinity)){const blocked=Math.min(dmg,Math.max(0,target.obsidianShieldHp??0));target.obsidianShieldHp-=blocked;dmg-=blocked;shield+=blocked;}
  if(shield>0){target.shieldDamageAbsorbed=(target.shieldDamageAbsorbed??0)+shield;target.regenTimer=0;}
  if(dmg<=0){target.hitFlash=.08;game?.spawnHitImpact?.(target,attacker,shield,{shield:true,field:options.kind==='field'});return true;}
  const cfg = game ? game.balance.combat : null;

  const lost=Math.min(Math.max(0,target.hp),dmg);
  game?.balanceLog?.hit(target,lost,target.maxHp);
  if(options.skillToken)game?.abilities?.metrics?.hit(options.skillToken,lost,target.maxHp);
  target.damageReceived=(target.damageReceived??0)+lost;
  target.damageHpRatio=(target.damageHpRatio??0)+lost/Math.max(1,target.maxHp);
  game?.era?.observeWarDamage(attacker,target,lost,options);
  game?.abilities?.observeMusterCombat(attacker,target,lost);
  target.hp -= dmg;
  target.hitFlash = cfg ? cfg.hitFlashDuration : 0.08;
  target.regenTimer = 0; // taking a hit resets the HP regen delay
  // General retaliation memory (v0.25): an AI remembers who hit it for a few seconds. Field ticks
  // (kind 'field') are environment-like and never create a retaliation target.
  if (attacker && attacker !== target && target.behavior === 'ai' && options.kind !== 'field' &&
      attacker.behavior !== 'orb' && attacker.color !== target.color) {
    target.retaliateTarget = attacker;
    // R-AI-010
    target.retaliateTimer = bal.ai.retaliationSeconds??RETALIATION_MEMORY;
    target.decisionTimer=0;
  }

  if(attacker&&options.kind!=='field'&&target.companionGroup){const group=game?.allyLinks?.groups.get(target.companionGroup);if(group){group.aggressor=attacker;group.aggressorUntil=game.gameTime+5;}}
  if (attacker && options.knockback!==false) applyKnockback(target, attacker, game);
  if (target.beingAbsorbedByRef) cancelAbsorption(target); // a hit breaks an absorption connection

  if (game) {
    if(game.spawnHitImpact)game.spawnHitImpact(target,attacker,lost,{field:options.kind==='field'});else game.spawnHitParticles(target.x, target.y, target.colorHex);
    if (attacker === game.player) game.audio.hit();
    if (target === game.player) game.audio.damage();
  }

  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    if (game) game.onEntityDeath(target, attacker);
  }
  return true;
}

// Bigger targets resist knockback more (received = base / (size / referenceSize)).
function applyKnockback(target, attacker, game) {
  if (!game) return;
  const cfg = game.balance.combat;
  const cs = game.balance.combatScaling;
  const dir = angleTo(attacker,target);
  const speed = (cs.knockbackForce * cfg.knockbackResistance) / Math.max(0.2, target.size / cs.referenceSize);
  target.kx = Math.cos(dir) * speed;
  target.ky = Math.sin(dir) * speed;
  target.knockbackTimer = cfg.knockbackDuration;
  target.knockbackDuration = cfg.knockbackDuration;
}

// v0.4 spec §6-11: HP regenerates automatically, but only after `delay` seconds have passed
// since the last hit. v0.5: both the delay and the rate now come from Size (spec §15).
export function updateHealthRegen(entity, dt, balance,multiplier=1) {
  entity.regenTimer += dt;
  const cfg = balance.healthRegen;
  if (entity.hp >= entity.maxHp || entity.regenTimer < cfg.delay) return false;
  const rate = cfg.baseRate + entity.size * cfg.regenPerSize;
  entity.hp = Math.min(entity.maxHp, entity.hp + rate * multiplier * dt);
  return true;
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

// v0.3 spec §8: dodge has priority — it can cancel an in-progress attack outright.
export function canStartDodge(entity) {
  if(entity.frozen>0)return false;
  return entity.dodgeStack > 0 && entity.dodgeState === 'READY';
}

export function startDodge(entity, dirAngle, balance) {
  // Dodge preserves both incoming and outgoing absorption links; distance checks own escape.
  entity.specialCast=null;
  entity.dodgeStack -= 1;

  entity.attackState = 'READY';
  entity.attackTimer = 0;
  entity.trail = [];

  entity.dodgeState = 'DODGING';
  entity.dodgeDir = dirAngle;
  entity.dodgeTimer = 0;
  entity.invincible = true;
  entity.currentDodgeDistance = dodgeDistanceForSize(entity.size, balance);
}

// R-ABS-012: weaken only an active target's dodge near its absorber, with a smooth release.
export function absorptionDodgeDistance(entity,balance,fullDistance=entity.currentDodgeDistance){
 const owner=entity.beingAbsorbedByRef,cfg=balance.absorption;
 if(!owner?.alive||!entity.alive||entity.size>=owner.size)return fullDistance;
 const surface=Math.max(0,dist(entity,owner)-(entity.size+owner.size)/2);
 const range=cfg.escapeDodgeSurfaceRange??80;
 if(range<=0||surface>=range)return fullDistance;
 const t=surface/range,release=t*t*(3-2*t);
 const reduced=Math.min(fullDistance*(cfg.escapeDodgeMultiplier??.35),cfg.escapeDodgeMaxDistance??90);
 return reduced+(fullDistance-reduced)*release;
}

export function updateDodge(entity, dt, balance) {
  if (entity.dodgeState === 'DODGING') {
    const cfg = balance.dodge;
    entity.dodgeTimer += dt;
    const speed = absorptionDodgeDistance(entity,balance) / cfg.dodgeDuration;
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
