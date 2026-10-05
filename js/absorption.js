import {growthRewardFor} from './entity.js';
import {growthFromSize} from './entity.js';
import {dist} from './collision.js';
import {delta} from './topology.js';
// Absorption system for same-color Player/AI hierarchy.
//
// v0.5 rework (spec §10-14): absorption no longer requires the two balls to physically overlap.
// A bigger ball projects a "maintain distance" (Size-scaled) around itself; any smaller
// same-color ball inside that range is connected by a visible link and drains toward the
// absorber at a rate that scales continuously with distance — fast up close, slow at the edge,
// and zero (connection severed) past maintainDistance. This replaces the discrete
// escape/break-distance step model from v0.3/v0.4 entirely.
//
// This is also a structural bug fix, not just a feature: v0.3/v0.4's position-pulling physics
// could reach a stable equilibrium where a fleeing target neither escaped nor got absorbed (see
// v0.4's BALANCE_NOTES for the postmortem). v0.5 has no antagonistic position-pulling loop to
// fight over — the connection speed is a pure function of the current distance every frame, so
// there is nothing for a "stuck forever" equilibrium to form around. A light cosmetic pull
// (`pullForce`) still eases the target toward the absorber for feel, but it never gates whether
// progress advances — only distance does.

export function maintainDistanceFor(absorber, balance, target=null) {
  const cfg = balance.absorption;
  // R-ABS-008: include both bodies so large touching allies remain reachable.
  return Math.max(cfg.baseMaintainDistance + absorber.size * cfg.maintainDistancePerSize,target?(absorber.size+target.size)/2+cfg.baseMaintainDistance+absorber.size*(cfg.surfaceReachPerSize??.15):0);
}

// R-ABS-008
export function resistanceTimeFor(target, balance) {
  const cfg = balance.absorption;
  return Math.max(0.05, (cfg.baseResistanceTime + target.size * cfg.resistancePerSize)*((cfg.woundedTimeFloor??.2)+(1-(cfg.woundedTimeFloor??.2))*Math.max(0,Math.min(1,target.hp/target.maxHp))));
}

// R-ABS-002
export function absorptionHealthFraction(absorber,target,balance){
 const points=balance.absorption.healthRatioCurve??[{ratio:0,hpFraction:-.03},{ratio:.15,hpFraction:-.03},{ratio:.5,hpFraction:.2},{ratio:.95,hpFraction:.75},{ratio:1,hpFraction:.8}],ratio=Math.max(0,Math.min(1,target.size/absorber.size));
 let value=points.at(-1).hpFraction;for(let i=1;i<points.length;i++)if(ratio<=points[i].ratio){const a=points[i-1],b=points[i];value=a.hpFraction+(b.hpFraction-a.hpFraction)*(ratio-a.ratio)/(b.ratio-a.ratio);break;}
 if(value>0){const floor=balance.absorption.woundedCostFloor??.5;value*=floor+(1-floor)*Math.max(0,Math.min(1,target.hp/target.maxHp));}return value;
}
export function startAbsorption(absorber, target, balance, game) {
  // R-ABS-010: a new connection never discards an outstanding cancellation refund.
  if(target.absorptionRefund)settleCancellation(target,Infinity);
  target.absorptionDecaySeconds=balance.absorption.cancelDecaySeconds??.6;
  target.beingAbsorbedByRef = absorber;
  target.absorptionProgress = 0;
  target.absorptionRequired = resistanceTimeFor(target, balance);
  target.absorptionHealthPaid=0;
  const c=balance.absorption,ratio=target.size/absorber.size,t=Math.max(0,Math.min(1,(ratio-(c.nearEqualRefundStartRatio??.6))/Math.max(.01,(c.nearEqualRefundFullRatio??.9)-(c.nearEqualRefundStartRatio??.6))));
  target.absorptionSuccessRefundFraction=Math.max(0,Math.min(1,(c.successHealthRefundFraction??1)+((c.nearEqualHealthRefundFraction??.9)-(c.successHealthRefundFraction??1))*t));
  target.absorptionHealthCost=absorber.maxHp*absorptionHealthFraction(absorber,target,balance);
  if (game && (absorber === game.player || target === game.player)) game.audio.absorbStart();
}

// R-ABS-010: refund only health actually paid by this connection, not combat damage.
export function cancelAbsorption(target,refund=true) {
  const owner=target.beingAbsorbedByRef;
  if(!owner&&target.absorptionRefund)return;
  if(refund&&owner?.alive&&(target.absorptionHealthPaid??0)>0){target.absorptionRefund={owner,paid:target.absorptionHealthPaid,progress:target.absorptionProgress,elapsed:0,duration:target.absorptionDecaySeconds??.6,life:owner.defeatSerial??0};owner.absorptionRefundTargets??=new Set();owner.absorptionRefundTargets.add(target);target.absorptionHealthPaid=0;}
  else {target.absorptionProgress=0;target.absorptionRequired=0;}
  target.beingAbsorbedByRef=null;
}
function settleCancellation(target,dt){
 const r=target.absorptionRefund;if(!r)return;
 const previous=Math.min(1,r.elapsed/r.duration);r.elapsed+=dt;const next=Math.min(1,r.elapsed/r.duration);
 if(r.owner.alive&&(r.owner.defeatSerial??0)===r.life)r.owner.hp=Math.min(r.owner.maxHp,r.owner.hp+r.paid*(next-previous));
 target.absorptionProgress=r.progress*(1-next);
 if(next>=1){r.owner.absorptionRefundTargets?.delete(target);target.absorptionRefund=null;target.absorptionProgress=0;target.absorptionRequired=0;}
}

// R-ABS-001
export function absorptionGrowthFor(absorber,target,balance){
 const ratio=balance.growth.growthToSizeRatio,efficiency=balance.absorption.areaEfficiency??.8;
 const size=Math.sqrt(absorber.size*absorber.size+target.size*target.size*efficiency);
 return Math.max(0,growthFromSize(size,absorber.baseSize,ratio,balance.growth)-absorber.growth)*(absorber.color==='green'?(balance.absorption.greenGrowthMultiplier??.85):1);
}

export function payAbsorptionHealth(absorber,target,amount,balance){
 const floor=absorber.maxHp*(balance.absorption.healthFloorFraction??.01),lost=Math.min(Math.max(0,amount),Math.max(0,absorber.hp-floor));
 absorber.hp-=lost;target.absorptionHealthPaid=(target.absorptionHealthPaid??0)+lost;
 if(lost>0){absorber.regenTimer=0;absorber.hitFlash=balance.combat.hitFlashDuration;absorber.damageReceived=(absorber.damageReceived??0)+lost;absorber.damageHpRatio=(absorber.damageHpRatio??0)+lost/absorber.maxHp;}
 return lost;
}
function completeAbsorption(absorber, target, game, balance) {
  const gained = growthRewardFor(target.behavior === 'orb' ? target.growthValue : absorptionGrowthFor(absorber,target,balance),absorber,balance);
  const beforeGrowth={...absorber};
  absorber.addGrowth(gained, balance);
  // Absorption growth raises capacity; it does not erase the intended health risk.
  absorber.hp=Math.max(absorber.maxHp*(balance.absorption.healthFloorFraction??.01),Math.min(beforeGrowth.hp,absorber.maxHp));
  const recovery=Math.min(Math.max(0,-(target.absorptionHealthCost??0))+(target.absorptionHealthPaid??0)*(target.absorptionSuccessRefundFraction??1),Math.max(0,absorber.maxHp-absorber.hp));absorber.hp+=recovery;target.absorptionHealthRecovered=recovery;
  if(recovery>0)game.spawnFloatingText(absorber.x,absorber.y,`+${Math.round(recovery)} HP`,'#86efac');
  if(target.behavior!=='orb')game.balanceLog?.absorb({...beforeGrowth,maxHp:absorber.maxHp},target,gained);
  game.awardScore(absorber, gained);
  game.spawnAbsorptionParticles(target.x, target.y, target.colorHex);
  absorber.scalePulseTimer = 0.3; // short "grew bigger" scale pulse on the absorber
  if (absorber === game.player || target === game.player) game.audio.absorbSuccess();
  if (absorber === game.player) {
    game.spawnFloatingText(absorber.x, absorber.y - absorber.size / 2 - 10, `+${Math.round(gained)} GROWTH`, '#93c5fd');

  }
  cancelAbsorption(target,false);

  if (target.behavior === 'player') {
    // v0.6 spec §16: being fully absorbed costs a Life exactly like a combat death — route
    // through the same shared handler so Game Over triggers consistently either way.
    game.handlePlayerDefeat('ABSORBED');
  } else {
    // Kill Count only tracks the player's own attack finishing an enemy off, not absorption —
    // so no kills++ here even when the player is the absorber.
    target.alive = false;
    game.relics.release(target);
    game.ecology.release(target, game.gameTime, "absorbed");
  }
}

// Advances every in-progress absorption: the connection's fill rate scales continuously with
// distance (max speed at 0, zero at maintainDistance), a light cosmetic pull eases the target
// inward without ever being strong enough to trap it, and the whole thing severs the instant the
// target drifts past maintainDistance, the size hierarchy flips, or the absorber dies.
export function updateAbsorptions(game, dt, balance) {
  const cfg = balance.absorption;
  for(const owner of game.entities)for(const target of owner.absorptionRefundTargets??[])settleCancellation(target,dt);
  for (const target of game.entities) {
    if(!target.alive&&target.beingAbsorbedByRef)cancelAbsorption(target);
    if (!target.alive || !target.beingAbsorbedByRef) continue;
    const absorber = target.beingAbsorbedByRef;

    if (!absorber.alive || absorber.companionGroup || absorber.behavior==='player'&&!absorber.allyAbsorptionEnabled || target.size >= absorber.size) {
      cancelAbsorption(target);
      continue;
    }

    const maintainDistance = maintainDistanceFor(absorber, balance,target);
    const d = dist(absorber,target);
    if (d > maintainDistance) {
      cancelAbsorption(target);
      continue;
    }

    const surface=Math.max(0,d-(absorber.size+target.size)/2);
    const proximity = 1 - Math.min(1, surface / Math.max(1,maintainDistance-(absorber.size+target.size)/2)); // 1 at contact, 0 at the edge
    const advance=Math.min(Math.max(0,target.absorptionRequired-target.absorptionProgress),cfg.maxAbsorptionSpeed*proximity*dt);
    const cost=(target.absorptionHealthCost??0)*(cfg.healthCostProgressFraction??1)*advance/target.absorptionRequired;
    payAbsorptionHealth(absorber,target,cost,balance);
    target.absorptionProgress += advance;

    if (proximity > 0) {
      // R-ABS-011: exponential pull remains finite above strength 1.
      const pull = 1-Math.exp(-cfg.pullForce*(absorber.color==='blue'?(cfg.bluePullMultiplier??1.3):1)*proximity*dt);
      const toward=delta(target,absorber);target.x += toward.x*pull;target.y += toward.y*pull;
    }

    if (target.absorptionProgress >= target.absorptionRequired) {
      completeAbsorption(absorber, target, game, balance);
    }
  }
}
