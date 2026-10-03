import {angleTo,wrap} from './topology.js';
import { explorationDestination } from './exploration.js';
import { attackReach } from './abilities.js';
import { assignPersonality } from './ecology.js';
import { acceptsAbsorption, pruneEncounters, chooseGeneral } from './species.js';
import { random } from './random.js';
import {apexTerritoryRadius} from './skillCatalog.js';
import { Entity, sizeFromGrowth, computeMaxStack } from './entity.js';
import { canAbsorb, canEatOrb, isHostile, dist } from './collision.js';
import { canStartAttack, startAttack, updateAttack, canStartDodge, startDodge, updateDodge, attackRangeForSize, attackDamageForSize, applyDefense } from './combat.js';

// AI states, implemented in priority order per spec section 25:
// Search -> Chase -> Eat(resolved centrally by Game) -> Attack -> Dodge -> Dead.
// Idle/Recover/Flee are folded into Search/Chase for the prototype.

export class AIEntity extends Entity {
  constructor({ x, y, color, colorHex, balance, startSize }) {
    if (startSize === undefined) startSize = balance.world.minOrbSize * 2.2 + random('ai') * 10;
    super({
      world:balance.world,
      x,
      y,
      size: startSize,
      color,
      colorHex,
      moveSpeed: balance.ai.movementSpeed * (0.8 + random('ai') * 0.4),
      behavior: 'ai',
      hp: startSize * 5,
      maxHp: startSize * 5,
    });
    this.baseSize = startSize;
    this.growth = 0;
    this.state = 'search'; // search | chase_eat | chase_fight | flee
    this.target = null;
    this.decisionTimer = random('ai') * 0.3;
    this.retaliateTarget = null; // last hostile that hit this AI (see combat.applyDamage)
    this.retaliateTimer = 0;
    assignPersonality(this);
    this._recomputeStacks(balance);
  }

  addGrowth(amount, balance) {
    this.growth += amount;
    const newSize = sizeFromGrowth(this.growth, this.baseSize, balance.growth.growthToSizeRatio,balance.growth);
    const newMaxHp = newSize * 5;
    this.hp = Math.min(this.hp + Math.max(0, newMaxHp - this.maxHp), newMaxHp);
    this.size = newSize;
    this.maxHp = newMaxHp;
    this._recomputeStacks(balance);
  }

  // Size-driven stack capacity, identical rule to Player (spec v0.5 §9, §25) — AI gets no banner,
  // and a capacity increase grants the bonus charge(s) immediately full (see player.js).
  _recomputeStacks(balance) {
    const newAttackMax = computeMaxStack(this.size, balance.skills.attackStackThresholds);
    const newDodgeMax = computeMaxStack(this.size, balance.skills.dodgeStackThresholds);
    this.attackStack = Math.min(newAttackMax,Math.max(0,this.attackStack + newAttackMax - this.attackMaxStack));
    this.attackMaxStack = newAttackMax;
    this.attackUnlocked = newAttackMax > 0;
    this.dodgeStack = Math.min(newDodgeMax,Math.max(0,this.dodgeStack + newDodgeMax - this.dodgeMaxStack));
    this.dodgeMaxStack = newDodgeMax;
    this.dodgeUnlocked = newDodgeMax > 0;
  }
}

export function updateAI(ai, dt, game, balance) {
  if (!ai.alive || ai.frozen>0) return;

  if(ai.state==='war_move'&&game.era.phase.id!=='war'){ai.state='search';ai.target=null;ai.decisionTimer=0;}
  pruneEncounters(ai,game,balance);
  if(ai.counterattacker && ai.dodgeState!=="DODGING"){ai.counterTimer=(ai.counterTimer ?? 1)-dt;if(ai.counterTimer<=0||!ai.counterattacker.alive||dist(ai,ai.counterattacker)>balance.ai.detectionRange)ai.counterattacker=null;}

  if(ai.retaliateTarget){ai.retaliateTimer-=dt;if(ai.retaliateTimer<=0||!ai.retaliateTarget.alive||dist(ai,ai.retaliateTarget)>balance.ai.detectionRange)ai.retaliateTarget=null;}

  updateAttack(ai, dt, balance, game.hostileTargetsFor(ai), game);
  updateDodge(ai, dt, balance);
  // NOTE: attack/dodge stack regen is handled once for every player+ai entity in
  // Game.update()'s shared loop — do not also call updateAttackStack/updateDodgeStack here.
  // (A duplicate call here previously made every AI regenerate stacks at 2x the configured
  // rate, which is what made enemies look like they could attack almost nonstop.)

  if(ai.companionGroup){
    if(ai.attackState!=='READY'||ai.dodgeState==='DODGING')return;
    reactToThreats(ai,game,balance);if(ai.dodgeState==='DODGING')return;
    if(!game.biomes.danger(ai)&&!ai.beingAbsorbedByRef&&!ai.escapeAbsorber&&!game.abilities.fields.some(f=>isHostile(ai,f.owner)&&dist(ai,f)<(f.radius??360)+60)&&game.abilities.commandDecision(ai)){moveAI(ai,dt,balance,game);return;}
    if(game.allyLinks.combat(ai)){if(ai.attackState==='READY')moveAI(ai,dt,balance,game);}
    else game.allyLinks.move(ai,dt);return;
  }

  // Committed to an attack or dodge animation: no fresh decisions, but charging already
  // moves the entity inside updateAttack/updateDodge.
  if (ai.attackState !== 'READY' || ai.dodgeState === 'DODGING') return;

  // v0.3 spec §1: being absorbed no longer freezes the target — it actively tries to escape
  // by fleeing straight away from its absorber (reuses the normal 'flee' movement branch).
  if (ai.beingAbsorbedByRef) {
    ai.escapeAbsorber=ai.beingAbsorbedByRef;
    game.abilities?.endCommand(ai,"absorption-escape");
    ai.state = 'flee';
    ai.target = ai.beingAbsorbedByRef;
    moveAI(ai, dt, balance,game);
    return;
  }

  if(ai.state==='relationship' && ai.relationshipOwner && (ai.role!=='predator'||ai.apex||!ai.relationshipOwner.alive||!ai.relationshipOwner.apex||dist(ai,ai.relationshipOwner)>apexTerritoryRadius(ai.relationshipOwner,balance))){ai.target=null;ai.state='search';ai.decisionTimer=0;}
  if(ai.target && ai.state!=="relationship" && ai.state!=="flee" && ai.state!=="command_move" && ai.state!=="war_move" && (!ai.target.alive || dist(ai,ai.target)>game.biomes.sensingRange(ai,ai.state==="chase_eat" && (ai.target.behavior!=="orb"&&ai.target.behavior!=="relic") ? balance.ai.absorptionDetectionRange : balance.ai.detectionRange))){ai.target=null;ai.state="search";ai.decisionTimer=0;}
  ai.decisionTimer -= dt;
  if (ai.decisionTimer <= 0) {
    ai.decisionTimer = 0.2 + random('ai') * 0.15;
    decideAI(ai, game, balance);
  }

  reactToThreats(ai, game, balance);
  moveAI(ai, dt, balance,game);
}

// v0.4 spec §15-19: AI actively hunts for absorbable prey instead of only noticing whichever
// happens to be nearest. It scans a wider `absorptionDetectionRange` and picks the target with
// the *biggest size advantage* (not the closest), then follows the priority ladder from §18:
// survival flee > retaliate if just hit > a clearly-winnable absorption > general hostile
// engagement > wander.
// v0.6 spec §8: not every AI attempts an absorption it spots — `willAttemptAbsorption` is
// re-rolled every decision cycle (~0.2-0.35s), so some AI just ignore a winnable absorption
// this cycle and fall through to orb-grazing/combat/wander instead. Keeps the population from
// reading as one predictable hive mind.
// The apex this predator may currently duel under the approved challenger rule, or null. Start:
// own HP>=60%, target HP<=30%, target size<=1.5x own, within combat sensing (cfg.detectionRange).
// An already-chosen challengeTarget stays valid while decideAI's release rules keep it set.
// Personality gates: cautious needs the target's spot safe from *other* threats, opportunist
// waits for the target's recovery frames.
function duelTarget(ai, game, balance, threats, safe) {
  if(ai.role!=='predator'||ai.apex) return null;
  const range=game.biomes.sensingRange(ai);
  const gate=o=>(ai.personality!=='cautious'||safe(o,o))&&(ai.personality!=='opportunist'||o.attackState==='RECOVERY');
  const held=ai.challengeTarget;
  if(held&&held.alive&&gate(held)) return held;
  if(ai.relationship!=='challenger'||!ai.attackUnlocked||ai.hp/ai.maxHp<.6) return null;
  let best=null;
  for(const o of game.getNearbyEntities(ai,range)){
    if(!o.alive||!o.apex||o.color===ai.color||dist(ai,o)>range) continue;
    if(o.hp/o.maxHp>.3||o.size>ai.size*1.5||!gate(o)) continue;
    if(!best||dist(ai,o)<dist(ai,best)||(dist(ai,o)===dist(ai,best)&&o.id<best.id)) best=o;
  }
  return best;
}

export function decideAI(ai, game, balance) {
  const cfg={...balance.ai,detectionRange:game.biomes.sensingRange(ai),absorptionDetectionRange:game.biomes.sensingRange(ai,balance.ai.absorptionDetectionRange)}, hp=ai.hp/ai.maxHp;
  const environment=game.biomes.danger(ai,!!ai.environmentThreat);ai.environmentThreat=environment;
  if(environment){game.abilities?.endCommand(ai,'environment-escape');ai.state='flee';ai.target=environment;return;}
  const absorber=ai.escapeAbsorber;
  const escapeDistance=absorber ? balance.absorption.baseMaintainDistance+absorber.size*balance.absorption.maintainDistancePerSize+80 : 0;
  if(absorber?.alive && canAbsorb(absorber,ai) && dist(ai,absorber)<escapeDistance){
    game.abilities?.endCommand(ai,'absorption-escape');ai.state='flee';ai.target=absorber;return;
  }
  ai.escapeAbsorber=null;
  const fields=(game.abilities?.fields ?? []).filter(f=>isHostile(ai,f.owner));
  const heldField=ai.fleeField;
  const danger=fields.find(f=>f.owner.color!==ai.color&&dist(ai,f)<=(f.radius??360)) ??
    (fields.includes(heldField)&&heldField.owner.color!==ai.color&&dist(ai,heldField)<(heldField.radius??360)+60 ? heldField : null);
  ai.fleeField=danger;
  if(danger){game.abilities.endCommand(ai,'sand-danger');ai.state='flee';ai.target={x:danger.x,y:danger.y,alive:true};return;}

  ai.recovering=hp<=.3 || (ai.recovering && hp<.6);
  if(ai.challengeTarget && (ai.role!=='predator'||ai.apex||hp<=.4 || !ai.challengeTarget.alive || !ai.challengeTarget.apex ||
    ai.challengeTarget.hp/ai.challengeTarget.maxHp>.4 || dist(ai,ai.challengeTarget)>cfg.detectionRange))ai.challengeTarget=null;
  const nearby=game.getNearbyEntities(ai,Math.max(cfg.detectionRange,cfg.absorptionDetectionRange));
  const within=nearby.filter(e=>e.alive&&dist(ai,e)<=cfg.detectionRange);
  const threats=within.filter(e=>isHostile(ai,e)&&e.size>=ai.size*1.2&&!(ai.command?.kind==='rally'&&(e===ai.command.target||ai.command.targets?.has(e))));
  const safe=(e,except)=>threats.every(t=>t===except||dist(e,t)>=160);
  const food=within.filter(e=>canEatOrb(ai,e,balance));
  const closest=list=>[...list].sort((a,b)=>dist(ai,a)-dist(ai,b)||a.id-b.id)[0];
  // Reuse spatial candidates; only detected food contributes to a local opportunity.
  const clusters=food.map(e=>({food:e,value:food.reduce((v,o)=>v+(dist(e,o)<=120?o.growthValue:0),0)}));
  const rich=closest(clusters.filter(c=>c.value>=80).map(c=>c.food));
  // Approved growth-seeker risk-taking (proposal 005): start needs HP>=60% and a cluster worth
  // >=80; once started it only stops at HP<=50% or cluster<80. The two threat limits (within 160,
  // or bigger than 1.5x own size) override it in both phases.
  const riskReady=ai.role==='prey' && ai.personality==='growth' && rich &&
    (ai.riskTaking ? hp>.5 : hp>=.6);
  const risk=!!(riskReady && !threats.some(t=>dist(ai,t)<=160||t.size>ai.size*1.5));
  ai.riskTaking=risk;
  // Approved challenger exception (proposal 004): an eligible duel target is not a flee reason,
  // but every *other* big threat and the survival rules above still are.
  const duel=duelTarget(ai,game,balance,threats,safe);
  const threat=closest(threats.filter(t=>t!==duel));
  // Keep the last threat beyond the entry sensing boundary; do not reset flee every
  // frame at 320. Release at 400, or immediately when it dies/ceases to be hostile.
  const heldThreat=ai.fleeThreat;
  const heldDanger=heldThreat?.alive && isHostile(ai,heldThreat) && heldThreat.size>=ai.size*1.2 &&
    heldThreat!==duel && dist(ai,heldThreat)<400 ? heldThreat : null;
  const fleeFrom=threat ?? heldDanger;
  ai.fleeThreat=!risk ? fleeFrom : null;
  if(fleeFrom && !risk && hp>.4 && canStartAttack(ai) && fleeFrom.size<=ai.size*(1.8+Math.min(1,Math.max(0,fleeFrom.size-100)/300)) &&
    (fleeFrom.attackState==='RECOVERY'||(fleeFrom.attackState==='READY'&&ai.personality!=='cautious'&&random('ai')<Math.min(.6,Math.max(0,fleeFrom.size-100)/500))) && dist(ai,fleeFrom)<=attackReach(ai,balance)+(ai.size+fleeFrom.size)/2 && game.gameTime>(ai.nextHarass??0)){
    ai.nextHarass=game.gameTime+Math.max(1.5,3-Math.max(0,fleeFrom.size-100)/200);ai.state='chase_fight';ai.target=fleeFrom;return;
  }
  if(fleeFrom && !risk){game.abilities?.endCommand(ai,'threat');ai.state='flee';ai.target=fleeFrom;return;}
  if(ai.state==='flee'){ai.state='search';ai.target=null;}
  if(ai.recovering){game.abilities?.endCommand(ai,'recovery');ai.state='chase_eat';ai.target=closest(food.filter(safe));if(!ai.target)ai.state='search';return;}
  if(game.abilities?.commandDecision(ai))return;
  game.abilities?.considerAI(ai);
  // General retaliation (v0.25): after survival rules, answer whoever just hit us if we can fight.
  // Attackers big enough to be threats were already fled from above; cautious AI also needs the
  // attacker's spot to be free of *other* threats. Applies to every role/color (prey included).
  const hitBy=ai.retaliateTarget;
  if(hitBy && hitBy.alive && ai.attackUnlocked && canStartAttack(ai) && hp>.3 && !threats.includes(hitBy) &&
    dist(ai,hitBy)<=cfg.detectionRange && (ai.personality!=='cautious'||safe(hitBy,hitBy))){
    ai.state='chase_fight';ai.target=hitBy;return;
  }
  // Reactive contact defense, never a new long-distance hunt. Survival/retaliation
  // remain above this rule, and prey only attacks an enemy already at contact range.
  const contact=closest(within.filter(e=>isHostile(ai,e)&&!threats.includes(e)&&
    dist(ai,e)<=Math.min(160,(ai.size+e.size)/2+40)));
  if(contact){
    if(hp>.3 && canStartAttack(ai) && dist(ai,contact)<=attackReach(ai,balance) &&
      (ai.personality!=='cautious'||safe(contact,contact))){ai.state='chase_fight';ai.target=contact;return;}
    game.abilities?.endCommand(ai,'contact-defense');ai.state='flee';ai.target=contact;return;
  }
  const opportunist=ai.personality==='opportunist';
  const lastHit=opportunist && hp>=.6 && canStartAttack(ai) ? closest(within.filter(e=>isHostile(ai,e)&&
    e.size<=ai.size*1.2&&e.attackState==='RECOVERY'&&!e.invincible&&dist(ai,e)<=attackRangeForSize(ai.size,balance)&&
    e.hp<=applyDefense(attackDamageForSize(ai.size,balance),e.size,balance))) : null;
  if(lastHit){ai.state='chase_fight';ai.target=lastHit;return;}
  if(ai.challengeTarget && canStartAttack(ai) && (ai.personality!=='cautious'||safe(ai.challengeTarget,ai.challengeTarget))){ai.state='chase_fight';ai.target=ai.challengeTarget;return;}
  const absorb=closest(nearby.filter(e=>dist(ai,e)<=cfg.absorptionDetectionRange&&canAbsorb(ai,e)&&
    acceptsAbsorption(ai,e,balance)&&
    (ai.personality!=='cautious'||(e.size<=ai.size*(ai.role==='prey'?.7:.8)&&safe(e)))));
  const huntAllowed=hp>.4&&ai.attackUnlocked&&canStartAttack(ai);
  const hunt=huntAllowed && ai.attackUnlocked ? closest(within.filter(e=>isHostile(ai,e)&&e.size<=ai.size*1.15&&
    (ai.personality!=='cautious'||safe(e)))) : null;
  const orb=closest(food.filter(e=>safe(e)||risk));
  if(rich && (safe(rich)||risk) && (ai.personality==='growth'||(ai.role==='predator'&&ai.size>=70&&hp>.5))){ai.state='chase_eat';ai.target=rich;return;}
  const counter=ai.counterattacker;
  const counterAllowed=counter&&hp>=.6&&canStartAttack(ai)&&dist(ai,counter)<=attackRangeForSize(ai.size,balance)&&
    (huntAllowed&&counter.size<=ai.size*.8&&(ai.personality!=='cautious'||safe(counter)));
  if(counterAllowed){ai.state='chase_fight';ai.target=counter;ai.counterattacker=null;return;}
  const choices=[orb&&{target:orb,state:'chase_eat'},absorb&&{target:absorb,state:'chase_eat'},hunt&&{target:hunt,state:'chase_fight'}].filter(Boolean);
  if(choices.length){const c=chooseGeneral(ai,choices,game.era.enabled&&game.era.phase.id==='war'?3:2);ai.state=c.state;ai.target=c.target;return;}
  // Relationship sensing follows the visible size-scaled territory; combat sensing stays local.
  if(ai.role==='predator'&&!ai.apex&&ai.relationship!=='independent'){
    if(duel){ai.challengeTarget=duel;ai.state='chase_fight';ai.target=duel;return;}
    const owners=game.entities.filter(e=>e.alive&&e.apex&&dist(ai,e)<=apexTerritoryRadius(e,balance)&&
      (ai.relationship==='subordinate'?e.color===ai.color:e.color!==ai.color));
    const owner=closest(owners);
    if(owner){
      const gap=balance.absorption.baseMaintainDistance+owner.size*balance.absorption.maintainDistancePerSize+80;
      if(ai.relationship==='subordinate'&&gap>apexTerritoryRadius(owner,balance)){ai.state='search';ai.target=null;return;}
      const d=dist(ai,owner), desired=ai.relationship==='subordinate'?Math.max(450,gap):450;
      const angle=d>0?angleTo(owner,ai):ai.facing;
      const radius=Math.min(apexTerritoryRadius(owner,balance),Math.max(desired,apexTerritoryRadius(owner,balance)*.875));
      const point={x:owner.x+Math.cos(angle)*radius,y:owner.y+Math.sin(angle)*radius,alive:true};
      const w=balance.world;
      if(w.wrap){point.x=wrap(point.x,w.worldWidth);point.y=wrap(point.y,w.worldHeight);}
      if(w.wrap||point.x>=0&&point.y>=0&&point.x<=w.worldWidth&&point.y<=w.worldHeight){
        ai.state='relationship';ai.target=point;ai.relationshipOwner=owner;return;
      }
    }
  }
  ai.relationshipOwner=null;const relic=game.relics.desired(ai,safe);
  if(relic){ai.state='chase_eat';ai.target=relic;return;}
  const front=game.era.warDestination(ai);
  if(front){ai.state='war_move';ai.target=front;return;}
  ai.state='search';ai.target=null;
}

function reactToThreats(ai, game, balance) {
  if (!ai.dodgeUnlocked || !canStartDodge(ai)) return;
  const range = Math.min(game.biomes.sensingRange(ai), attackRangeForSize(ai.size, balance) * 1.5);
  const nearby = game.getNearbyEntities(ai, range);
  for (const other of nearby) {
    if ((other.attackState === 'TELEGRAPH' || other.specialCast) && isHostile(ai, other)) {
      const d = dist(ai, other);
      if (d < range && random('ai') < 0.5) {
        const away = angleTo(other,ai);
        if(ai.color==='blue'){ai.counterattacker=other;ai.counterTimer=1;}
        startDodge(ai, away, balance);
        return;
      }
    }
  }
}

function moveAI(ai, dt, balance,game) {
  let targetAngle = null;
  let speed = ai.moveSpeed*(game?.abilities.speedMultiplier(ai)??1);

  if (ai.state === 'flee' && ai.target) {
    targetAngle = angleTo(ai.target,ai);
    // v0.3: fleeing a low-HP threat gets a burst of speed, but fleeing an absorption grab
    // (spec §1) does not — you're still partly held, so the absorber gets a fair chance.
    speed *= ai.beingAbsorbedByRef ? 1.0 : 1.3;
  } else if((ai.state==='command_move'||ai.state==='war_move')&&ai.target){targetAngle=angleTo(ai,ai.target);if(ai.state==='war_move')speed=Math.min(speed*.75,dist(ai,ai.target)/Math.max(dt,1e-8));
  } else if(ai.state==='relationship'&&ai.target){
    targetAngle=angleTo(ai,ai.target);speed*=.55;
    speed=Math.min(speed,dist(ai,ai.target)/Math.max(dt,1e-8));
  } else if (ai.state === 'chase_eat' && ai.target && ai.target.alive) {
    // actual eating/absorption is resolved centrally in Game.resolveConsumption()
    targetAngle = angleTo(ai,ai.target);
  } else if (ai.state === 'chase_fight' && ai.target && ai.target.alive) {
    const d = dist(ai, ai.target);
    targetAngle = angleTo(ai,ai.target);
    if (d <= attackReach(ai, balance)+(ai.size+ai.target.size)/2 && canStartAttack(ai)) {
      startAttack(ai, targetAngle, balance);
      return;
    }
  } else {
    const destination=game&&explorationDestination(ai,game);
    if(destination){targetAngle=angleTo(ai,destination);speed*=0.55*(ai.color==='cyan'?.7:1);}
    else {
    ai.wanderTimer -= dt;
    if (ai.wanderTimer <= 0) {
      ai.wanderAngle = random('ai') * Math.PI * 2;
      ai.wanderTimer = ai.color==='yellow'?4+random('ai')*2:1+random('ai')*2;
    }
    targetAngle = ai.wanderAngle;
    speed *= 0.55 * (ai.color==='cyan'?.7:1);
    }
  }

  if (targetAngle !== null) {
    if(game&&!ai.environmentThreat){const point=game.biomes.routePoint(ai,{x:ai.x+Math.cos(targetAngle)*300,y:ai.y+Math.sin(targetAngle)*300});targetAngle=angleTo(ai,point);}
    ai.facing = targetAngle;
    ai.x += Math.cos(targetAngle) * speed * dt;
    ai.y += Math.sin(targetAngle) * speed * dt;
  }
}
