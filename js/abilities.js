import {terrainDamageMultiplier} from './biomes.js';
import {delta,angleTo,wrap} from './topology.js';
import { boundCenter } from './worldBounds.js';
import { attackChargeDistanceForSize, attackDamageForSize, applyDamage, canStartAttack, hpDefenseScale } from './combat.js?forest-composition-01';
import { cancelAbsorption } from './absorption.js';
import { dist, isHostile, canAbsorb, canEatOrb } from './collision.js';
import { random } from './random.js';
import {scaledSkill} from './skillCatalog.js';
import {AIEntity} from './ai.js?forest-composition-01';
import {AbilityMetrics} from './abilityMetrics.js';
import {drawAbilityPresentation} from './abilityPresentation.js?effects-direction-02';
export const ABILITIES = {
  cyan:{windup:.6,cooldown:10,radius:260}, blue:{windup:.6,cooldown:10,length:400,width:180},
  green:{windup:.5,cooldown:12,radius:350},red:{windup:.8,cooldown:12,radius:250},yellow:{windup:.8,cooldown:14,radius:360},
};
// Side lanes are sampled once at cast start, then shared by windup and projectiles.
export function blueWaveDirections(dir) {
  const radians = Math.PI / 180;
  return [dir, dir + (-120 + random('ai') * 80) * radians, dir + (40 + random('ai') * 80) * radians];
}
export function attackReach(e,b){return attackChargeDistanceForSize(e.size,b,e.apex);}
export function inCone(origin,target,dir,radius,angle=Math.PI*2/3){
  const d=dist(origin,target);return d<=radius && Math.abs(Math.atan2(Math.sin(angleTo(origin,target)-dir),Math.cos(angleTo(origin,target)-dir)))<=angle/2;
}
export function inWave(origin,target,dir,length=400,width=180){
 const {x,y}=delta(origin,target);const along=x*Math.cos(dir)+y*Math.sin(dir),across=-x*Math.sin(dir)+y*Math.cos(dir);
 return along>=0&&along<=length&&Math.abs(across)<=width/2;
}
function angleDelta(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
export class Abilities {
 constructor(game){this.enabled=game.options.abilitiesEnabled!==false;this.game=game;this.waves=[];this.vortices=[];this.fields=[];this.embers=[];this.frostMarks=[];this.frostFields=[];this.musters=[];this.teleports=[];this.guarded=new Set();this.events=[];this.castId=0;this.flashes=[];this.specialFires=0;this.rallies=[];this.metrics=new AbilityMetrics(game);}
 units(){return this.game.entities.filter(e=>e.alive&&e.behavior!=='orb');}
 log(type,e,extra={}){if(type==='special-fire')this.specialFires++;this.events.push({time:this.game.gameTime,type,id:e.id,...extra});if(!this.game.options.collect&&this.events.length>256)this.events.shift();}
 release(owner){
   owner.specialCast=null;this.vortices=this.vortices.filter(f=>f.owner!==owner);this.rallies=this.rallies.filter(r=>r.owner!==owner);
   for(const unit of this.game.entities)unit.rallyBuffs?.delete(owner.id);
   this.fields=this.fields.filter(f=>f.owner!==owner);
   // A launched wave is an instantaneous cast's continuing projectile, not a maintained field.
   for(const e of this.game.entities){if(e.command?.owner===owner)this.endCommand(e,'owner-loss');e.morale?.delete(owner.id);e.moralePower?.delete(owner.id);}
 }
 loseApex(e){const normal=e.specialCast?.slot==='E'?e.specialCast:null;this.release(e);e.specialCast=normal;e._specialApex=false;}
 endCommand(e,reason){if(!e.command)return;this.log('command-end',e,{kind:e.command.kind,reason});e.command=null;e.commandLock=3;e.target=null;e.state='search';e.decisionTimer=0;}
 redTarget(owner,dir){return this.units().filter(e=>isHostile(owner,e)&&dist(owner,e)<=500).sort((a,b)=>angleDelta(angleTo(owner,a),dir)-angleDelta(angleTo(owner,b),dir)||dist(owner,a)-dist(owner,b)||a.id-b.id)[0];}
 skill(e,slot='R'){return scaledSkill(this.game.balance,e,slot);}
 unlocked(e,slot='R'){return e.behavior!=='orb'&&!e.summoned&&(slot==='R'?!!e.apex:e.apex||e.size>=(this.game.balance.abilitySkills?.unlockSize??100));}
 cooldown(e,slot='R'){return slot==='R'?(e.specialCooldown??0):(e.normalSkillCooldown??0);}
 canCast(e,slot='R'){return this.enabled&&e.alive&&this.unlocked(e,slot)&&this.cooldown(e,slot)<=0&&!e.specialCast&&!(e.frozen>0)&&!e.beingAbsorbedByRef;}
 instantGeometry(e,cast){
  if(!(cast.slot==='E'&&['chill','ripple'].includes(cast.skill?.effect)||cast.slot==='R'&&e.color==='cyan'))return null;
  const hostiles=this.units().filter(t=>isHostile(e,t));return {hostiles,targets:hostiles.filter(t=>inCone(e,t,cast.dir,cast.skill.radius))};
 }
 aimPoint(e,dir,point=null,cfg=this.skill(e,'R')){
  const w=this.game.balance.world,castRange=cfg.castRange??350;let p=point??{x:e.x+Math.cos(dir)*castRange,y:e.y+Math.sin(dir)*castRange};const d=dist(e,p);
  if(d>castRange){const toward=delta(e,p);p={x:e.x+toward.x*castRange/d,y:e.y+toward.y*castRange/d};}
  return {x:boundCenter(p.x,0,w.worldWidth,w.wrap),y:boundCenter(p.y,0,w.worldHeight,w.wrap)};
 }
 start(e,dir,point,seenTarget,slot='R'){
  if(!this.canCast(e,slot)||!ABILITIES[e.color])return false;
  if(slot==='E'){const cfg=this.skill(e,slot);e.normalSkillCooldown=cfg.cooldown;e.specialCast={id:++this.castId,time:0,dir,point:{x:e.x,y:e.y},slot,skill:cfg,directions:cfg.effect==='wave'?(cfg.lanes===3?blueWaveDirections(dir):[dir]):null};this.metrics.start(e,e.specialCast,this.instantGeometry(e,e.specialCast));this.log('special-start',e,{slot,skill:cfg.id,cast:e.specialCast.id});return true;}
  const cfg=this.skill(e,slot);
  if(cfg.effect==='muster'){e.specialCooldown=cfg.cooldown;e.specialCast={slot,skill:cfg,id:++this.castId,time:0,dir,point:{x:e.x,y:e.y}};this.metrics.start(e,e.specialCast);this.log('special-start',e,{slot,skill:cfg.id,cast:e.specialCast.id});return true;}
  const target=e.color==='red'?(seenTarget??this.redTarget(e,dir)):null;if(e.color==='red'&&!target&&!point)return false;
  const w=this.game.balance.world;
  const p=this.aimPoint(e,dir,point??(target?{x:target.x,y:target.y}:null),cfg);
  if(e.color==='red'&&!this.units().some(t=>isHostile(e,t)&&dist({...p,_world:w},t)<=cfg.radius))return false;
  const directions=e.color==='blue'&&cfg.effect!=='vortex'?blueWaveDirections(dir):null;
  e.specialCooldown=cfg.cooldown;e.specialCast={slot,skill:cfg,directions,id:++this.castId,time:0,dir,point:p,target,targetPoint:target?{x:target.x,y:target.y}:null};
  this.metrics.start(e,e.specialCast,this.instantGeometry(e,e.specialCast));this.log('special-start',e,{color:e.color,slot,skill:cfg.id,cast:e.specialCast.id});return true;
 }
 damage(owner,target,multiplier,kind='direct',cast=null){
  const life=target.defeatSerial??0;
  const hit=applyDamage(target,attackDamageForSize(owner.size,this.game.balance)*this.damageMultiplier(owner)*multiplier,this.game,owner,this.game.balance,{knockback:false,kind,skillToken:this.metrics.token(owner,cast)});
  return hit&&(target.defeatSerial??0)===life;
 }
 command(owner,kind,seconds,range,cast){
  const eligible=this.units().filter(e=>e.behavior==='ai'&&!e.companionGroup&&e.color===owner.color&&e.size<owner.size&&!e.apex&&dist(owner,e)<=range&&!e.command&&!e.beingAbsorbedByRef&&!(e.commandLock>0)&&!e.recovering&&e.hp/e.maxHp>.3);
  const recipients=eligible.filter(e=>kind!=='rally'||(e.attackUnlocked&&e.attackStack>0&&cast.target?.alive&&cast.target.size<=e.size*1.5&&e.hp/e.maxHp>.4)).sort((a,b)=>dist(owner,a)-dist(owner,b)||a.id-b.id).slice(0,4);
  for(const e of recipients){e.command={owner,kind,remaining:seconds,choices:new Map(),cast:cast.id,target:cast.target,point:cast.targetPoint};this.log('command-start',e,{kind,owner:owner.id});}
 }
 fire(e,cast){
  const cfg=cast.skill??this.skill(e,cast.slot??'R');
  this.metrics.fire(e,cast,this.instantGeometry(e,cast));
  if(cast.slot==='E'){this.fireNormal(e,cast);return;}
  if(cfg.effect==='vortex'){this.vortices=this.vortices.filter(f=>f.owner!==e);this.vortices.push({owner:e,remaining:cfg.fieldDuration,skill:cfg});this.log('special-fire',e,{slot:'R',skill:cfg.id,cast:cast.id});return;}
  if(cfg.effect==='muster'){this.muster(e,cast);this.log('special-fire',e,{slot:'R',skill:cfg.id,cast:cast.id});return;}
  if(cast.skill?.effect==='summon')this.summon(e,cast);
  this.flashes.push({x:e.x,y:e.y,color:e.color,colorHex:e.colorHex,dir:cast.dir,directions:cast.directions ? [...cast.directions] : null,point:{...cast.point},remaining:.75,skill:cast.skill});
  this.log('special-fire',e,{color:e.color,slot:cast.slot??'R',skill:cast.skill?.id,cast:cast.id});const units=this.units();
  if(cfg.effect==='frost-burst'){for(const t of units)if(isHostile(e,t)&&inCone(e,t,cast.dir,cfg.radius)&&this.damage(e,t,cfg.damage,'direct',cast)&&t.alive)this.frostMarks.push({owner:e,target:t,life:t.defeatSerial??0,remaining:cfg.blastDelay,skill:{...cfg},skillToken:this.metrics.token(e,cast)});return;}
  if(e.color==='cyan')for(const t of units){if(!isHostile(e,t)||!inCone(e,t,cast.dir,cfg.radius))continue;
    if(this.damage(e,t,cfg.damage??.5,'direct',cast)&&t.alive&&!(t.freezeImmune>0)){t.frozen=cfg.freezeSeconds??1;t.attackState='READY';t.dodgeState='READY';t.invincible=false;t.trail=[];cancelAbsorption(t);for(const o of units)if(o.beingAbsorbedByRef===t)cancelAbsorption(o);if(t.specialCast)t.specialCast=null;}
  }
  if(e.color==='blue'){
    // One cast, one shared registry: even overlapping lanes hit each target only once.
    const hit=new Set();
    for(const dir of cast.directions ?? [cast.dir])this.waves.push({owner:e,cast:cast.id,x:e.x,y:e.y,dir,time:0,hit,skill:cast.skill,metricKey:cast.metricKey,slot:cast.slot});
    this.command(e,'devour',cfg.commandDuration??4,cfg.commandRadius??350,cast);
  }
  if(e.color==='green'){
    for(const t of units)if(t.color===e.color&&!isHostile(e,t)&&dist(e,t)<=cfg.radius){t.morale??=new Map();t.morale.set(e.id,Math.max(t.morale.get(e.id)??0,cfg.buffDuration??5));t.moralePower??=new Map();t.moralePower.set(e.id,cfg.buffDamage??.15);this.metrics.count(e,cast,'buffs');}
    for(const t of units.filter(t=>(t.behavior==='ai'||t.behavior==='player')&&t!==e&&t.color===e.color&&!isHostile(e,t)&&dist(e,t)<=cfg.radius&&!t.beingAbsorbedByRef&&t.hp/t.maxHp>.3).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id))if(this.game.allyLinks.recruit(e,t))this.metrics.count(e,cast,'recruits');
  }
  if(e.color==='red'){
    const origin={...cast.point,_world:this.game.balance.world};
    const rally={owner:e,point:{...cast.point},expires:this.game.gameTime+(cfg.buffDuration??6),buffSpeed:cfg.buffSpeed??1.25,buffDamage:cfg.buffDamage??.3,targets:new Set(units.filter(t=>isHostile(e,t)&&dist(origin,t)<=cfg.radius))};
    if(rally.targets.size){this.rallies=this.rallies.filter(r=>r.owner!==e);this.rallies.push(rally);this.metrics.count(e,cast,'marks',rally.targets.size);
     for(const ally of units.filter(t=>t.color===e.color&&!isHostile(e,t)&&dist(e,t)<=(cfg.buffRadius??450))){
      ally.rallyBuffs??=new Map();ally.rallyBuffs.set(e.id,rally);this.metrics.count(e,cast,'buffs');
      if(ally.behavior==='ai'&&ally.attackUnlocked&&ally.hp/ally.maxHp>.4&&!ally.beingAbsorbedByRef){this.endCommand(ally,'new-rally');ally.command={owner:e,kind:'rally',remaining:cfg.buffDuration??6,targets:rally.targets,point:rally.point,target:[...rally.targets][0]};this.log('command-start',ally,{kind:'rally',owner:e.id});}
     }
    }
  }
  if(e.color==='yellow'){this.fields=this.fields.filter(f=>f.owner!==e);this.fields.push({owner:e,...cast.point,time:0,tick:0,radius:cfg.radius,duration:cfg.fieldDuration??5,tickInterval:cfg.tickInterval??.25,hpFraction:cfg.hpFraction??.2,missChance:cfg.missChance??.25,skillToken:this.metrics.token(e,cast)});}
 }
 fireNormal(e,cast){
  const cfg=cast.skill,units=this.units();
  this.flashes.push({x:e.x,y:e.y,color:e.color,colorHex:e.colorHex,dir:cast.dir,point:{x:e.x,y:e.y},remaining:.75,normal:true,skill:cfg,size:e.size,directions:cast.directions});
  this.log('special-fire',e,{slot:'E',skill:cfg.id,cast:cast.id});
  // R-ABIL-004: same swept projectile and shared hit registry for one/three lanes.
  if(cfg.effect==='wave'){const hit=new Set(),dirs=cast.directions??(cfg.lanes===3?blueWaveDirections(cast.dir):[cast.dir]);for(const dir of dirs)this.waves.push({owner:e,cast:cast.id,x:e.x,y:e.y,dir,time:0,hit,skill:cfg,metricKey:cast.metricKey,slot:cast.slot});return;}
  if(cfg.effect==='shield'){for(const t of units)if(!isHostile(e,t)&&(t===e||t.color===e.color||e.companionGroup&&e.companionGroup===t.companionGroup)&&dist(e,t)<=cfg.radius){t.shieldHp=Math.max(t.shieldHp??0,t.maxHp*cfg.shieldHpFraction);t.shieldRemaining=cfg.shieldDuration;t.shieldTextureKind='frost';this.metrics.count(e,cast,'buffs');}return;}
  // R-ABIL-006: recruitment probability changes without weakening existing ally buffs.
  if(cfg.effect==='invite'){
   const attemptedGroups=new Set();
   for(const t of units.filter(t=>t!==e&&(!t.companionGroup||t.companionGroup!==e.companionGroup)&&t.color===e.color&&!isHostile(e,t)&&dist(e,t)<=cfg.radius&&!t.beingAbsorbedByRef&&t.hp/t.maxHp>.3).sort((a,b)=>dist(e,a)-dist(e,b))) {
    const group=this.game.allyLinks.groups.get(e.companionGroup);if(group?.members.size>=6)break;
    if(t.companionGroup){if(attemptedGroups.has(t.companionGroup))continue;attemptedGroups.add(t.companionGroup);}
    if(random('ai')<this.game.allyLinks.acceptChance(e,t,cfg.acceptChance??.8)&&this.game.allyLinks.merge(e,t))this.metrics.count(e,cast,'recruits');
   }
   const group=this.game.allyLinks.groups.get(e.companionGroup),recipients=group?[...group.members]:[e];
   for(const t of recipients)if(t.alive&&!isHostile(e,t)){
    t.inviteBuffs=(t.inviteBuffs??[]).filter(b=>b.expires>this.game.gameTime);t.inviteBuffs.push({expires:this.game.gameTime+(cfg.buffDuration??30),damage:cfg.buffDamage??.05,defense:cfg.buffDefense??.05,regen:cfg.buffRegen??0});
    t.inviteBuffs=t.inviteBuffs.slice(-Math.max(1,Math.floor(cfg.buffStackCap??5)));t.recruitedUntil=Math.max(t.recruitedUntil??0,this.game.gameTime+20);this.metrics.count(e,cast,'buffs');
   }
  }else if(cfg.effect==='embers'){this.embers=this.embers.filter(f=>f.owner!==e);this.embers.push({owner:e,x:e.x,y:e.y,_world:this.game.balance.world,time:0,tick:0,radius:cfg.radius,duration:cfg.fieldDuration,tickInterval:cfg.tickInterval,damage:cfg.damage,skillToken:this.metrics.token(e,cast)});
  }else if(cfg.effect==='vigor'){
   for(const t of units)if(t.color===e.color&&!isHostile(e,t)&&dist(e,t)<=cfg.radius){t.vigorUntil=this.game.gameTime+(cfg.buffDuration??4);t.vigorEffect={damage:cfg.buffDamage??.15,speed:cfg.buffSpeed??1.12};this.metrics.count(e,cast,'buffs');}
  }else if(cfg.effect==='dust'){e.dustUntil=this.game.gameTime+(cfg.buffDuration??3);e.dustChance=cfg.missChance??.15;e.dustVisualMultiplier=cfg.visualRadiusMultiplier??3;e.dustZone={x:e.x,y:e.y,radius:(e.size/2+12)*e.dustVisualMultiplier};/* R-ABIL-010 (2026-10-08): placed where cast, it no longer follows the caster */e.dustInvulnerableRemaining=cfg.invulnerableSeconds??.8;}
  else for(const t of units)if(isHostile(e,t)&&inCone(e,t,cast.dir,cfg.radius)&&this.damage(e,t,cfg.damage??(cfg.effect==='chill'?.35:.4),'direct',cast)&&t.alive){
   if(cfg.effect==='chill'&&!(t.freezeImmune>0)){t.frozen=cfg.freezeSeconds??.35;t.attackState='READY';t.dodgeState='READY';t.invincible=false;t.trail=[];cancelAbsorption(t);for(const other of units)if(other.beingAbsorbedByRef===t)cancelAbsorption(other);t.specialCast=null;}
   if(cfg.effect==='ripple'&&!t.wavePush&&!(t.waveImmune>0))t.wavePush={remaining:cfg.pushDuration??.15,vx:Math.cos(cast.dir)*(cfg.pushSpeed??400),vy:Math.sin(cast.dir)*(cfg.pushSpeed??400)};
  }
 }
 muster(owner,cast){
  // R-ABIL-009 (2026-10-08): AI allies in range teleport beside the caster, then everyone gets the buff and a short absorb guard.
  const cfg=cast.skill,total=cfg.gatherDuration+cfg.buffDuration,units=this.units(),w=this.game.balance.world;
  const recipients=units.filter(t=>!isHostile(owner,t)&&(t.color===owner.color||owner.companionGroup&&t.companionGroup===owner.companionGroup)&&dist(owner,t)<=cfg.radius);
  this.musters=this.musters.filter(r=>r.owner!==owner);this.rallies=this.rallies.filter(r=>r.owner!==owner);
  const r={owner,recipients:new Set(recipients),targets:new Set(),point:{x:owner.x,y:owner.y},gatherRemaining:cfg.gatherDuration,remaining:total,expires:this.game.gameTime+total,buffSpeed:cfg.buffSpeed,buffDamage:cfg.buffDamage,muster:true};
  this.musters.push(r);this.rallies.push(r);let moved=0;
  for(const e of recipients){
   e.rallyBuffs??=new Map();e.rallyBuffs.set(owner.id,r);this.metrics.count(owner,cast,'buffs');
   e.absorbGuardRemaining=Math.max(e.absorbGuardRemaining??0,cfg.absorbGuardSeconds??0);if(e.absorbGuardRemaining>0)this.guarded.add(e);
   if(e===owner||e.behavior!=='ai')continue;
   if(e.beingAbsorbedByRef)cancelAbsorption(e);for(const other of units)if(other.beingAbsorbedByRef===e)cancelAbsorption(other);
   const angle=e.id*2.399963229728653,d=owner.size/2+e.size/2+40;let x=owner.x+Math.cos(angle)*d,y=owner.y+Math.sin(angle)*d;
   if(w?.wrap){x=wrap(x,w.worldWidth);y=wrap(y,w.worldHeight);}
   this.teleports.push({from:{x:e.x,y:e.y},to:{x,y},size:e.size,remaining:.6});e.x=x;e.y=y;e.trail=[];moved++;
   this.endCommand(e,'new-muster');e.command={owner,kind:'muster',rally:r,remaining:total};
  }
  if(owner===this.game.player||recipients.includes(this.game.player))this.game.spawnFloatingText(this.game.player.x,this.game.player.y-this.game.player.size/2-20,`집결 · 공격 +${Math.round(cfg.buffDamage*100)}% 이동 +${Math.round((cfg.buffSpeed-1)*100)}%`,'#fca5a5');
  this.log('muster',owner,{recipients:recipients.map(e=>e.id),teleported:moved,gatherSeconds:cfg.gatherDuration,fightSeconds:cfg.buffDuration,guardSeconds:cfg.absorbGuardSeconds});
 }
 observeMusterCombat(attacker,target,lost){
  if(!attacker||lost<=0)return;
  for(const r of this.musters){const enemy=attacker===r.owner?target:target===r.owner?attacker:null;if(enemy?.alive&&isHostile(r.owner,enemy))r.targets.add(enemy);}
 }
 updateMusters(dt){
  for(const r of this.musters){r.point={x:r.owner.x,y:r.owner.y};r.gatherRemaining=Math.max(0,r.gatherRemaining-dt);r.remaining-=dt;}
  for(const e of this.guarded){e.absorbGuardRemaining=Math.max(0,(e.absorbGuardRemaining??0)-dt);if(e.absorbGuardRemaining<=0||!e.alive){e.absorbGuardRemaining=0;this.guarded.delete(e);}}
  for(const t of this.teleports)t.remaining-=dt;this.teleports=this.teleports.filter(t=>t.remaining>0);
  this.musters=this.musters.filter(r=>r.remaining>0&&r.expires>this.game.gameTime&&r.owner.alive&&r.owner.apex);
  this.rallies=this.rallies.filter(r=>!r.muster||this.musters.includes(r));
 }
 summon(e,cast){
  const cfg=cast?.skill??this.skill(e,'R');
  const g=this.game,existing=this.units().filter(t=>t.summoned?.owner===e),group=g.allyLinks.groups.get(e.companionGroup);
  const room=Math.max(0,Math.min((cfg.summonCount??2)-existing.length,6-(group?.members.size??1)));
  for(let i=0;i<room;i++){
   const dir=e.facing+(i?1:-1)*Math.PI/2,d=e.size/2+55,w=g.balance.world;
   const size=e.size*Math.min(.2,cfg.summonSizeCapFraction??.2,Math.max(.01,(cfg.summonSizeFraction??.16)*(1+(random('ai')*2-1)*(cfg.summonSizeVariation??.2))));
   const t=new AIEntity({balance:g.balance,color:e.color,colorHex:e.colorHex,x:boundCenter(e.x+Math.cos(dir)*d,0,w.worldWidth,w.wrap),y:boundCenter(e.y+Math.sin(dir)*d,0,w.worldHeight,w.wrap),startSize:size});
   t.growth=0;t.summoned={owner:e,attackInheritance:cfg.summonAttackInheritance??.5,absorbableAt:g.gameTime+(cfg.summonAbsorbDelay??30)};t.displayName='숲의 동행';t.companionAffinity='social';t._recomputeStacks(g.balance,true);t.attackMaxStack=Math.max(1,t.attackMaxStack);t.attackStack=t.attackMaxStack;t.attackUnlocked=true;t.dodgeMaxStack=Math.max(1,t.dodgeMaxStack);t.dodgeStack=t.dodgeMaxStack;t.dodgeUnlocked=true;g.entities.push(t);g.ecology.initializeUnit(g,t);t.personality='growth';g.allyLinks.recruit(e,t);this.metrics.count(e,cast,'summons');this.log('summon',e,{target:t.id,absorbableAt:t.summoned.absorbableAt});
  }
 }
 update(dt){
  for(const flash of this.flashes)flash.remaining-=dt;
  this.flashes=this.flashes.filter(f=>f.remaining>0);
  const units=this.units(),w=this.game.balance.world;
  this.rallies=this.rallies.filter(r=>r.expires>this.game.gameTime&&r.owner.alive&&r.owner.apex);
  this.updateMusters(dt);
  for(const unit of units)for(const [id,r] of unit.rallyBuffs??[])if(!this.rallies.includes(r)||isHostile(unit,r.owner))unit.rallyBuffs.delete(id);
  for(const e of this.game.entities){
    e.dustInvulnerableRemaining=Math.max(0,(e.dustInvulnerableRemaining??0)-dt);
    if(!e.alive||(e.obsidianShieldUntil??0)<=this.game.gameTime)e.obsidianShieldHp=0;
    e.shieldRemaining=Math.max(0,(e.shieldRemaining??0)-dt);if(!e.shieldRemaining||!e.alive)e.shieldHp=0;
    if(e.summoned)e.summoned.absorbable=this.game.gameTime>=e.summoned.absorbableAt;
    if(!e.alive){if(!e._abilitiesReleased){this.release(e);e._abilitiesReleased=true;}e._specialApex=false;}
    else if(e._abilitiesReleased)e._abilitiesReleased=false;
    else if(!e.apex&&e._specialApex){this.loseApex(e);}
    e.inviteBuffs=(e.inviteBuffs??[]).filter(b=>b.expires>this.game.gameTime);
    // R-ABIL-006: the invite buff regenerates HP regardless of the hit delay; stacks do not add up.
    const regen=this.inviteRegen(e);if(regen>0&&e.alive&&e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*regen*dt);
    e.normalSkillCooldown=Math.max(0,(e.normalSkillCooldown??0)-dt);
    e.specialCooldown=Math.max(0,(e.specialCooldown??0)-dt);
    if(e.alive&&e.apex&&!e._specialApex){e.specialCooldown=Math.max(e.specialCooldown??0,5);e._specialApex=true;}e.commandLock=Math.max(0,(e.commandLock??0)-dt);
    e.freezeImmune=Math.max(0,(e.freezeImmune??0)-dt);e.waveImmune=Math.max(0,(e.waveImmune??0)-dt);
    if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);if(!e.frozen)e.freezeImmune=2;}
    if(e.wavePush){const p=e.wavePush,used=Math.min(dt,p.remaining);e.x+=p.vx*used;e.y+=p.vy*used;p.remaining-=used;
      e.x=boundCenter(e.x,e.size,w.worldWidth,w.wrap);e.y=boundCenter(e.y,e.size,w.worldHeight,w.wrap);
      if(p.remaining<=1e-8){e.wavePush=null;e.waveImmune=1;}}
    if(e.morale)for(const [id,time]of e.morale){if(time<=dt){e.morale.delete(id);e.moralePower?.delete(id);}else e.morale.set(id,time-dt);}
    if(e.command){e.command.remaining-=dt;if(e.command.remaining<=0||!e.command.owner.alive||!e.command.owner.apex)this.endCommand(e,'expiry-or-owner');}
    if(e.specialCast){if(!e.alive||!this.unlocked(e,e.specialCast.slot??'R')||e.frozen>0)e.specialCast=null;else {e.specialCast.time+=dt;if(e.specialCast.time+1e-8>=(e.specialCast.skill?.windup??ABILITIES[e.color].windup)){const cast=e.specialCast;e.specialCast=null;this.fire(e,cast);}}}
  }
  // R-ABIL-005: pull every movable entity; strongest near the living caster.
  for(const f of this.vortices){const used=Math.min(dt,f.remaining);f.remaining-=dt;if(!f.owner.alive)continue;for(const t of this.game.getNearbyEntities(f.owner,f.skill.radius)){if(!t.alive||t===f.owner)continue;const v=delta(t,f.owner),d=Math.hypot(v.x,v.y);if(d>f.skill.radius||d<1e-8)continue;const move=Math.min(d,f.skill.pullSpeed*(1-d/f.skill.radius)*used);t.x=boundCenter(t.x+v.x/d*move,0,w.worldWidth,w.wrap);t.y=boundCenter(t.y+v.y/d*move,0,w.worldHeight,w.wrap);}}
  this.vortices=this.vortices.filter(f=>f.remaining>0&&f.owner.alive);
  for(const wave of this.waves){const cfg=wave.skill??ABILITIES.blue,duration=cfg.waveDuration??.5,length=cfg.length??400,width=cfg.width??180;const previous=wave.time;wave.time=Math.min(duration,wave.time+dt);
    // Swept advancing strip avoids tunneling across frame boundaries.
    for(const t of units){if(!t.alive||!isHostile(wave.owner,t)||wave.hit.has(t.id))continue;
      if(!inWave(wave,t,wave.dir,wave.time/duration*length,width))continue;
      const relative=delta(wave,t),along=relative.x*Math.cos(wave.dir)+relative.y*Math.sin(wave.dir);
      if(along<previous/duration*length-1e-8)continue;
      wave.hit.add(t.id);if(this.damage(wave.owner,t,(cfg.damage??.5)*(1+((cfg.nearDamageMultiplier??1)-1)*(1-Math.min(1,Math.max(0,along)/length))),'direct',wave)&&t.alive&&!t.wavePush&&!(t.waveImmune>0))t.wavePush={remaining:cfg.pushDuration??.2,vx:Math.cos(wave.dir)*(cfg.pushSpeed??600),vy:Math.sin(wave.dir)*(cfg.pushSpeed??600)};
    }
  }
  this.waves=this.waves.filter(f=>f.time<(f.skill?.waveDuration??.5)-1e-8);
  for(const f of this.embers){f.x=f.owner.x;f.y=f.owner.y;const used=Math.min(dt,Math.max(0,f.duration-f.time));f.time+=dt;f.tick+=used;if(!f.owner.alive)continue;
   while(f.tick+1e-8>=f.tickInterval){f.tick-=f.tickInterval;for(const t of units)if(t.alive&&isHostile(f.owner,t)&&dist(f,t)<=f.radius)applyDamage(t,attackDamageForSize(f.owner.size,this.game.balance)*this.damageMultiplier(f.owner)*f.damage,this.game,f.owner,this.game.balance,{knockback:false,skillToken:f.skillToken});}
  }
  this.embers=this.embers.filter(f=>f.time<f.duration-1e-8&&f.owner.alive);
  // Marks follow the victim; each explosion leaves a fixed area at the victim's last position.
  for(const mark of this.frostMarks){mark.remaining-=dt;if(mark.remaining>0||!mark.target.alive||(mark.target.defeatSerial??0)!==mark.life)continue;
   const cfg=mark.skill,field={owner:mark.owner,x:mark.target.x,y:mark.target.y,_world:w,radius:cfg.blastRadius,remaining:cfg.fieldDuration,initialDt:Math.max(0,-mark.remaining),tick:0,skill:cfg,skillToken:mark.skillToken,hits:new Map(),frozen:new Set()};
   for(const t of units)if(t.alive&&isHostile(mark.owner,t)&&dist(field,t)<=field.radius)applyDamage(t,attackDamageForSize(mark.owner.size,this.game.balance)*cfg.blastDamage,this.game,mark.owner,this.game.balance,{kind:'field',knockback:false,skillToken:mark.skillToken});
   this.frostFields.push(field);this.game.spawnFloatingText(field.x,field.y,'냉기 폭발','#a5f3fc');
  }
  this.frostMarks=this.frostMarks.filter(m=>m.remaining>0&&m.target.alive&&(m.target.defeatSerial??0)===m.life);
  for(const field of this.frostFields){const cfg=field.skill,elapsed=field.initialDt??dt,used=Math.min(elapsed,field.remaining);delete field.initialDt;field.remaining-=elapsed;field.tick+=used;
   while(field.tick+1e-8>=cfg.tickInterval){field.tick-=cfg.tickInterval;for(const t of units)if(t.alive&&isHostile(field.owner,t)&&dist(field,t)<=field.radius){const life=t.defeatSerial??0;
    if(!applyDamage(t,attackDamageForSize(field.owner.size,this.game.balance)*cfg.fieldDamage,this.game,field.owner,this.game.balance,{kind:'field',knockback:false,skillToken:field.skillToken})||!t.alive||(t.defeatSerial??0)!==life)continue;
    const count=(field.hits.get(t.id)??0)+1;field.hits.set(t.id,count);
    if(count>=cfg.freezeHitCount&&!field.frozen.has(t.id)&&!(t.freezeImmune>0)){field.frozen.add(t.id);t.frozen=cfg.freezeSeconds;t.attackState=t.dodgeState='READY';t.invincible=false;t.trail=[];t.specialCast=null;cancelAbsorption(t);for(const o of units)if(o.beingAbsorbedByRef===t)cancelAbsorption(o);}
   }}
  }
  this.frostFields=this.frostFields.filter(f=>f.remaining>1e-8);
  const hits=new Map();
  for(const f of this.fields){f.time+=dt;f.tick+=dt;if(!f.owner.alive||!f.owner.apex)continue;
    if(f.tick+1e-8>=(f.tickInterval??.25)&&f.time<=(f.duration??5)+1e-8){f.tick-=f.tickInterval??.25;for(const t of units)if(isHostile(f.owner,t)&&dist(f,t)<=(f.radius??360)){const raw=t.maxHp*(f.hpFraction??.20)*this.damageMultiplier(f.owner);if(!hits.has(t.id)||hits.get(t.id).raw<raw)hits.set(t.id,{t,owner:f.owner,raw,skillToken:f.skillToken});}}}
  for(const {t,owner,raw,skillToken}of hits.values())if(owner.alive&&owner.apex)applyDamage(t,raw,this.game,owner,this.game.balance,{knockback:false,kind:'field',skillToken,defenseScale:hpDefenseScale(t,this.game.balance),postDefenseMultiplier:terrainDamageMultiplier(t.size,this.game.balance)});
  this.fields=this.fields.filter(f=>f.time<(f.duration??5)-1e-8&&f.owner.alive&&f.owner.apex);
  this.metrics.reconcile();
 }
 inDust(target,owner=target){return (owner.dustUntil??0)>this.game.gameTime&&!!owner.dustZone&&dist(target,owner.dustZone)<=owner.dustZone.radius;}
 // R-ABIL-010 (2026-10-08): same-color allies standing in a yellow cloud get the miss chance too (best cloud wins).
 dustChance(target){let best=0;for(const u of this.game.entities)if(u.alive&&u.color===target.color&&!isHostile(u,target)&&this.inDust(target,u))best=Math.max(best,u.dustChance??.15);return best;}
 miss(target){const dust=this.dustChance(target);if(dust>0)return random('ai')<dust;const fields=this.fields.filter(f=>f.owner===target&&dist(f,target)<=(f.radius??360));return fields.length>0&&random('ai')<Math.max(...fields.map(f=>f.missChance??.25));}
 rallyActive(e){return [...(e.rallyBuffs?.values()??[])].some(r=>r.expires>this.game.gameTime&&r.owner.alive&&r.owner.apex&&!isHostile(e,r.owner));}
 rallyPower(e,key,fallback){return Math.max(0,...[...(e.rallyBuffs?.values()??[])].filter(r=>r.expires>this.game.gameTime&&r.owner.alive&&r.owner.apex&&!isHostile(e,r.owner)).map(r=>r[key]??fallback));}
 speedMultiplier(e){return Math.max(1,(e.objectSpeedUntil??0)>this.game.gameTime?(e.objectSpeedMultiplier??1):1,this.rallyPower(e,'buffSpeed',1.25),(e.vigorUntil??0)>this.game.gameTime?(e.vigorEffect?.speed??1.12):1);}
 inviteRegen(e){return (e.inviteBuffs??[]).filter(b=>b.expires>this.game.gameTime).reduce((m,b)=>Math.max(m,b.regen??0),0);}
 invitePower(e,key){return (e.inviteBuffs??[]).filter(b=>b.expires>this.game.gameTime).reduce((sum,b)=>sum+(b[key]??0),0);}
 obsidianBonus(e){return (e.obsidianShieldHp??0)>0&&(e.obsidianShieldUntil??0)>this.game.gameTime?(e.obsidianPower??0):0;}
 defenseMultiplier(e){return 1+this.obsidianBonus(e)+this.invitePower(e,'defense')+(this.game.biomes?.defenseBonus(e)??0);}
 damageMultiplier(e){return 1+this.obsidianBonus(e)+this.invitePower(e,'damage')+((e.vigorUntil??0)>this.game.gameTime?(e.vigorEffect?.damage??.15):0)+this.rallyPower(e,'buffDamage',.3)+(this.game.relics?.damageBonus(e)??0)+(e.morale?.size?Math.max(...[...e.morale.keys()].map(id=>e.moralePower?.get(id)??.15)):0)+(this.game.allyLinks?.bonus(e)??0);}
 commandDecision(e){
  const c=e.command;if(!c)return false;
  if(e.recovering||e.hp/e.maxHp<=.3||e.beingAbsorbedByRef){this.endCommand(e,'survival');return false;}
  if(c.kind==='muster'){
    const r=c.rally;if(!this.musters.includes(r)||isHostile(e,c.owner)){this.endCommand(e,'muster-ended');return false;}
    const enemies=[...r.targets].filter(t=>t.alive&&isHostile(e,t)).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id);
    if(r.gatherRemaining<=0&&enemies.length){e.state='chase_fight';e.target=enemies[0];return true;}
    const angle=e.id*2.399963229728653,distance=c.owner.size/2+e.size/2+60;const goal=this.game.biomes.routePoint(e,{x:c.owner.x+Math.cos(angle)*distance,y:c.owner.y+Math.sin(angle)*distance,alive:true});
    e.state='command_move';e.target=dist(e,goal)<=40?{x:e.x,y:e.y,alive:true}:goal;return true;
  }
  if(c.selected && (!c.selected.alive||!(canAbsorb(e,c.selected)||c.selected.beingAbsorbedByRef===e)||dist(e,c.selected)>400)){this.endCommand(e,'devour-target-invalid');return false;}
  const range=this.game.biomes.sensingRange(e);
  const commandRange=c.kind==='devour'?this.game.biomes.sensingRange(e,400):range;
  const nearby=this.game.getNearbyEntities(e,commandRange).filter(t=>t.alive&&dist(e,t)<=commandRange);
  let target;
  if(c.kind==='devour'){
    const candidates=nearby.filter(t=>t!==c.owner&&!t.apex&&canAbsorb(e,t));
    for(const t of candidates)if(!c.choices.has(t.id))c.choices.set(t.id,random('ai')<(t.size<70?.8:.2));
    target=c.selected ?? candidates.filter(t=>c.choices.get(t.id)).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];c.selected=target;
  }else if(c.kind==='harvest')target=nearby.filter(t=>canEatOrb(e,t,this.game.balance)).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
  else {
    if(c.targets)c.target=[...c.targets].filter(t=>t.alive&&isHostile(e,t)).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
    if(!c.target?.alive||!isHostile(e,c.target)||e.hp/e.maxHp<=.4){this.endCommand(e,'rally-invalid');return false;}
    if(c.targets){c.point={x:c.target.x,y:c.target.y};e.state='chase_fight';e.target=c.target;return true;}
    if(dist(e,c.target)<=range)c.point={x:c.target.x,y:c.target.y};
    if(dist(e,c.target)<=range){e.state='chase_fight';e.target=c.target;return true;}
    if(dist(e,c.point)<=20){this.endCommand(e,'unseen-at-point');return false;}
    e.state='command_move';e.target={...c.point,alive:true};return true;
  }
  if(!target){this.endCommand(e,'no-target');return false;}e.state='chase_eat';e.target=target;return true;
 }
 absorptionAllowed(e,t){return e.command?.kind!=='devour'||(t!==e.command.owner&&!t.apex&&e.command.choices.get(t.id)===true);}
 canAffect(e,target,slot='R'){
  if(!this.canCast(e,slot))return false;const cfg=this.skill(e,slot),group=this.game.allyLinks.groups.get(e.companionGroup),room=6-(group?.members.size??1);
  if(cfg.effect==='shield')return (e.shieldHp??0)<e.maxHp*cfg.shieldHpFraction*.5||(e.shieldRemaining??0)<2;
  if(cfg.effect==='muster')return this.units().some(t=>t!==e&&!isHostile(e,t)&&(t.color===e.color||e.companionGroup&&t.companionGroup===e.companionGroup)&&dist(e,t)<=cfg.radius);
  if(cfg.effect==='embers')return target?.alive&&isHostile(e,target)&&dist(e,target)<=cfg.radius;
  if(cfg.effect==='invite')return this.invitePower(e,'damage')<.15||room>0&&this.units().some(t=>t!==e&&t.color===e.color&&!isHostile(e,t)&&!t.companionGroup&&!t.beingAbsorbedByRef&&t.hp/t.maxHp>.3&&dist(e,t)<=cfg.radius);
  if(!target?.alive||!isHostile(e,target))return false;const dir=angleTo(e,target);
  if(['chill','ripple'].includes(cfg.effect)||slot==='R'&&e.color==='cyan')return inCone(e,target,dir,cfg.radius);
  if(cfg.effect==='wave')return inWave(e,target,dir,cfg.length,cfg.width);
  if(cfg.effect==='vortex')return dist(e,target)<=cfg.radius;
  if(slot==='R'&&e.color==='blue')return inWave(e,target,dir,cfg.length,cfg.width);
  if(slot==='R'&&['red','yellow'].includes(e.color))return dist(e,target)<=(cfg.castRange??350)+cfg.radius;
  if(cfg.effect==='dust')return dist(e,target)<=Math.max(180,attackReach(target,this.game.balance))&&!this.inDust(e);// placed: recast once outside the old cloud
  return true;
 }
 considerAI(e){
  if(e.beingAbsorbedByRef||!e.apex&&(e.recovering||e.state==='flee'))return false;
  for(const slot of ['R','E']){
   if(!this.canCast(e,slot))continue;const cfg=this.skill(e,slot),range=Math.max(320,cfg.radius??0,cfg.length??0,cfg.castRange??0,cfg.buffRadius??0),nearby=this.game.getNearbyEntities(e,range).filter(t=>t.alive);
   const allies=nearby.filter(t=>!isHostile(e,t)&&t.color===e.color&&dist(e,t)<=range);
   if(cfg.effect==='summon'){if(this.units().filter(t=>t.summoned?.owner===e).length<(cfg.summonCount??2))return this.start(e,e.facing,null,null,slot);continue;}
   if(cfg.effect==='shield'||cfg.effect==='muster'||cfg.effect==='invite'||cfg.effect==='vigor'||cfg.effect==='dust')return this.start(e,e.facing,null,null,slot);
   const target=nearby.filter(t=>isHostile(e,t)&&dist(e,t)<=range).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id).find(t=>{
    const dir=angleTo(e,t);if(['chill','ripple'].includes(cfg.effect)||slot==='R'&&e.color==='cyan')return inCone(e,t,dir,cfg.radius);
    if(cfg.effect==='wave')return inWave(e,t,dir,cfg.length,cfg.width);
    if(cfg.effect==='vortex')return dist(e,t)<=cfg.radius;
    if(e.color==='blue'&&slot==='R')return inWave(e,t,dir,cfg.length,cfg.width);
    if(cfg.effect==='embers')return dist(e,t)<=cfg.radius;
    return true;
   });
   if(!target)continue;const dir=angleTo(e,target);
   if(!e.apex&&slot==='E'&&canStartAttack(e)&&e.color!=='green')continue;
   if(e.color==='red'&&slot==='R'&&!allies.some(t=>t!==e&&t.attackUnlocked))continue;
   return this.start(e,dir,{x:target.x,y:target.y},target,slot);
  }
  return false;
 }
 draw(ctx,zoom){
  const shape=(e,dir,point)=>{
    const cfg=e.skill??e.specialCast?.skill??ABILITIES[e.color];
    if(cfg.effect==='vortex'){ctx.arc(e.x,e.y,cfg.radius,0,Math.PI*2);return;}
    if(e.normal||e.specialCast?.slot==='E'){const cfg=e.skill??e.specialCast.skill;if(cfg.effect==='wave'){for(const lane of e.directions??e.specialCast?.directions??[dir]){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(lane);ctx.rect(0,-cfg.width/2,cfg.length,cfg.width);ctx.restore();}return;}if(cfg.effect==='dust'){ctx.arc(e.x,e.y,((e.size??40)/2+16/zoom)*(cfg.visualRadiusMultiplier??3),0,Math.PI*2);return;}if(['chill','ripple'].includes(cfg.effect)){ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,cfg.radius,dir-Math.PI/3,dir+Math.PI/3);ctx.closePath();}else ctx.arc(e.x,e.y,cfg.radius,0,Math.PI*2);return;}
    if(e.color==='cyan'&&cfg.effect!=='shield'){ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,cfg.radius,dir-Math.PI/3,dir+Math.PI/3);ctx.closePath();}
    else if(e.color==='blue'){for(const lane of e.directions ?? e.specialCast?.directions ?? [dir]){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(lane);ctx.rect(0,-cfg.width/2,cfg.length,cfg.width);ctx.restore();}}
    else if(e.color==='red')ctx.arc(cfg.effect==='muster'?e.x:point.x,cfg.effect==='muster'?e.y:point.y,cfg.radius,0,Math.PI*2);
    else if(e.color==='yellow')ctx.arc(point.x,point.y,cfg.radius,0,Math.PI*2);
    else ctx.arc(e.x,e.y,cfg.radius,0,Math.PI*2);
  };
  drawAbilityPresentation(ctx,this,zoom,shape);
  for(const e of this.units())if(e.specialCast){ctx.save();ctx.beginPath();shape(e,e.specialCast.dir,e.specialCast.point);ctx.fillStyle=this.game.withAlpha(e.colorHex,['shield','invite','vigor','muster','summon'].includes(e.specialCast.skill?.effect)?.02:.09);ctx.fill();ctx.strokeStyle=e.colorHex;ctx.lineWidth=2/zoom;ctx.setLineDash([8/zoom,5/zoom]);ctx.stroke();ctx.setLineDash([]);if(e.color==='red'&&e.specialCast.target){const t=e.specialCast.target;ctx.beginPath();ctx.arc(t.x,t.y,t.size/2+10,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  const labels={cyan:'냉기 휘두르기',blue:'삼중 파도',green:'사기 진작',red:'사냥 지휘',yellow:'모래바람'};
  for(const flash of this.flashes){
    ctx.save();ctx.globalAlpha=Math.min(1,flash.remaining/.25);
    ctx.beginPath();shape(flash,flash.dir,flash.point);
    ctx.fillStyle=this.game.withAlpha(flash.colorHex,['shield','invite','vigor','muster','summon'].includes(flash.skill?.effect)?.025:.22);ctx.fill();
    ctx.strokeStyle=flash.colorHex;ctx.lineWidth=4/zoom;ctx.stroke();
    // The stationary origin marker identifies the caster even for a remote sand field.
    ctx.beginPath();ctx.arc(flash.x,flash.y,(30+(1-flash.remaining/.75)*25)/zoom,0,Math.PI*2);ctx.stroke();
    ctx.font=`bold ${16/zoom}px sans-serif`;ctx.textAlign='center';
    ctx.lineWidth=4/zoom;ctx.strokeStyle='#111827';ctx.strokeText(flash.skill?.name??labels[flash.color],flash.x,flash.y-45/zoom);
    ctx.fillStyle='#fff';ctx.fillText(flash.skill?.name??labels[flash.color],flash.x,flash.y-45/zoom);ctx.restore();
  }
  for(const unit of this.units()){const dust=(unit.dustUntil??0)>this.game.gameTime&&unit.dustZone,vigor=(unit.vigorUntil??0)>this.game.gameTime;
   if(dust){ctx.save();ctx.beginPath();ctx.arc(unit.dustZone.x,unit.dustZone.y,unit.dustZone.radius,0,Math.PI*2);ctx.strokeStyle='#fde68a';ctx.lineWidth=2/zoom;ctx.setLineDash([4/zoom,4/zoom]);ctx.stroke();ctx.restore();}
   if(vigor){ctx.save();ctx.beginPath();ctx.arc(unit.x,unit.y,unit.size/2+12/zoom,0,Math.PI*2);ctx.strokeStyle='#fda4af';ctx.lineWidth=2/zoom;ctx.setLineDash([4/zoom,4/zoom]);ctx.stroke();ctx.restore();}
   // R-ABIL-009: muster buff (red dashed ring + numbers) and absorb guard (white ring) are readable on every recipient.
   const rallyDamage=unit.rallyBuffs?.size?this.rallyPower(unit,'buffDamage',0):0;
   if(rallyDamage>0){const speed=this.rallyPower(unit,'buffSpeed',1);ctx.save();ctx.beginPath();ctx.arc(unit.x,unit.y,unit.size/2+7/zoom,0,Math.PI*2);ctx.strokeStyle='#f87171';ctx.lineWidth=3/zoom;ctx.setLineDash([7/zoom,5/zoom]);ctx.stroke();
    ctx.font=`bold ${11/zoom}px system-ui`;ctx.textAlign='center';ctx.lineWidth=3/zoom;ctx.strokeStyle='#111827';const label=`공+${Math.round(rallyDamage*100)}% 속+${Math.round((speed-1)*100)}%`,ly=unit.y+unit.size/2+18/zoom;ctx.setLineDash([]);ctx.strokeText(label,unit.x,ly);ctx.fillStyle='#fecaca';ctx.fillText(label,unit.x,ly);ctx.restore();}
   if((unit.absorbGuardRemaining??0)>0){ctx.save();ctx.beginPath();ctx.arc(unit.x,unit.y,unit.size/2+12/zoom,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2/zoom;ctx.stroke();ctx.restore();}}
  for(const t of this.teleports){const k=t.remaining/.6;ctx.save();ctx.strokeStyle=`rgba(248,113,113,${k})`;ctx.lineWidth=3/zoom;for(const [p,grow] of [[t.from,1-k],[t.to,k]]){ctx.beginPath();ctx.arc(p.x,p.y,t.size/2*(.6+grow*.8)+6/zoom,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  for(const f of this.embers){ctx.save();ctx.beginPath();ctx.arc(f.x,f.y,f.radius,0,Math.PI*2);ctx.fillStyle='rgba(239,68,68,.14)';ctx.fill();ctx.strokeStyle='#fb7185';ctx.lineWidth=2/zoom;ctx.stroke();ctx.font=`bold ${12/zoom}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#fecdd3';ctx.fillText(`불씨 ${Math.ceil(f.duration-f.time)}s`,f.x,f.y-f.radius-8/zoom);ctx.restore();}
  for(const r of this.musters){ctx.save();ctx.font=`bold ${12/zoom}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#fda4af';ctx.fillText(r.gatherRemaining>0?`집결 ${Math.ceil(r.gatherRemaining)}s`:`공동 사냥 ${Math.ceil(r.remaining)}s`,r.owner.x,r.owner.y-r.owner.size/2-90/zoom);ctx.restore();}
  for(const rally of this.rallies){
   ctx.save();ctx.strokeStyle='#fb7185';ctx.lineWidth=2/zoom;
   for(const target of rally.targets){if(!target.alive||!isHostile(rally.owner,target))continue;ctx.beginPath();ctx.arc(target.x,target.y,target.size/2+10/zoom,0,Math.PI*2);ctx.stroke();ctx.font=`bold ${13/zoom}px system-ui`;ctx.fillStyle='#fecdd3';ctx.textAlign='center';ctx.fillText(`표적 ${Math.ceil(rally.expires-this.game.gameTime)}s`,target.x,target.y-target.size/2-18/zoom);}
   for(const ally of this.units())if(ally.rallyBuffs?.get(rally.owner.id)===rally){ctx.beginPath();ctx.arc(ally.x,ally.y,ally.size/2+5/zoom,0,Math.PI*2);ctx.strokeStyle='rgba(251,113,133,.65)';ctx.stroke();}ctx.restore();
  }
  for(const f of this.frostFields){ctx.beginPath();ctx.arc(f.x,f.y,f.radius,0,Math.PI*2);ctx.fillStyle='rgba(103,232,249,.16)';ctx.fill();ctx.strokeStyle='#a5f3fc';ctx.lineWidth=2/zoom;ctx.stroke();}
  for(const f of this.fields){ctx.beginPath();ctx.arc(f.x,f.y,f.radius??360,0,Math.PI*2);ctx.fillStyle='rgba(234,179,8,.12)';ctx.fill();ctx.strokeStyle='#eab308';ctx.lineWidth=2/zoom;ctx.stroke();}
  for(const f of this.vortices){ctx.save();ctx.beginPath();ctx.arc(f.owner.x,f.owner.y,f.skill.radius,0,Math.PI*2);ctx.fillStyle='rgba(59,130,246,.04)';ctx.fill();ctx.strokeStyle='#60a5fa';ctx.lineWidth=2/zoom;ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=f.skill.radius*(.25+.65*(f.remaining%1));ctx.beginPath();ctx.arc(f.owner.x+Math.cos(a)*rr,f.owner.y+Math.sin(a)*rr,4/zoom,0,Math.PI*2);ctx.fillStyle='#bfdbfe';ctx.fill();}ctx.restore();}
  for(const wave of this.waves){ctx.save();ctx.translate(wave.x,wave.y);ctx.rotate(wave.dir);ctx.fillStyle='rgba(59,130,246,.4)';ctx.fillRect(Math.max(0,wave.time/(wave.skill?.waveDuration??.5)*(wave.skill?.length??400)-20),-(wave.skill?.width??180)/2,20,wave.skill?.width??180);ctx.restore();}
 }
}
