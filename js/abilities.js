import { attackDamageForSize, applyDamage, canStartAttack } from './combat.js';
import { cancelAbsorption } from './absorption.js';
import { dist, isHostile, canAbsorb, canEatOrb } from './collision.js';
import { random } from './random.js';
export const ABILITIES = {
  cyan:{windup:.6,cooldown:10,radius:260}, blue:{windup:.6,cooldown:10,length:400,width:180},
  green:{windup:.5,cooldown:12,radius:350},red:{windup:.8,cooldown:12,radius:450},yellow:{windup:.8,cooldown:14,radius:220},
};
// Side lanes are sampled once at cast start, then shared by windup and projectiles.
export function blueWaveDirections(dir) {
  const radians = Math.PI / 180;
  return [dir, dir + (-120 + random('ai') * 80) * radians, dir + (40 + random('ai') * 80) * radians];
}
export function attackReach(e,b){return Math.max(20,b.combatScaling.baseAttackRange*Math.pow(e.size/b.combatScaling.referenceSize,b.combatScaling.attackRangeGrowthExponent))*(e.apex?.7:1);}
export function inCone(origin,target,dir,radius,angle=Math.PI*2/3){
  const d=dist(origin,target);return d<=radius && Math.abs(Math.atan2(Math.sin(Math.atan2(target.y-origin.y,target.x-origin.x)-dir),Math.cos(Math.atan2(target.y-origin.y,target.x-origin.x)-dir)))<=angle/2;
}
export function inWave(origin,target,dir,length=400,width=180){
 const x=target.x-origin.x,y=target.y-origin.y;const along=x*Math.cos(dir)+y*Math.sin(dir),across=-x*Math.sin(dir)+y*Math.cos(dir);
 return along>=0&&along<=length&&Math.abs(across)<=width/2;
}
function angleDelta(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
export class Abilities {
 constructor(game){this.enabled=game.options.abilitiesEnabled!==false;this.game=game;this.waves=[];this.fields=[];this.events=[];this.castId=0;this.flashes=[];}
 units(){return this.game.entities.filter(e=>e.alive&&e.behavior!=='orb');}
 log(type,e,extra={}){this.events.push({time:this.game.gameTime,type,id:e.id,...extra});}
 release(owner){
   owner.specialCast=null;
   this.fields=this.fields.filter(f=>f.owner!==owner);
   // A launched wave is an instantaneous cast's continuing projectile, not a maintained field.
   for(const e of this.game.entities){if(e.command?.owner===owner)this.endCommand(e,'owner-loss');e.morale?.delete(owner.id);}
 }
 endCommand(e,reason){if(!e.command)return;this.log('command-end',e,{kind:e.command.kind,reason});e.command=null;e.commandLock=3;e.target=null;e.state='search';e.decisionTimer=0;}
 redTarget(owner,dir){return this.units().filter(e=>isHostile(owner,e)&&dist(owner,e)<=500).sort((a,b)=>angleDelta(Math.atan2(a.y-owner.y,a.x-owner.x),dir)-angleDelta(Math.atan2(b.y-owner.y,b.x-owner.x),dir)||dist(owner,a)-dist(owner,b)||a.id-b.id)[0];}
 canCast(e){return this.enabled&&e.alive&&e.apex&&(e.specialCooldown??0)<=0&&!e.specialCast&&!(e.frozen>0)&&e.attackState==='READY'&&e.dodgeState!=='DODGING';}
 start(e,dir,point,seenTarget){
  if(!this.canCast(e)||!ABILITIES[e.color])return false;
  const target=e.color==='red'?(seenTarget??this.redTarget(e,dir)):null;if(e.color==='red'&&!target)return false;
  const cfg=ABILITIES[e.color],w=this.game.balance.world;
  let p=point??{x:e.x+Math.cos(dir)*350,y:e.y+Math.sin(dir)*350};const d=dist(e,p);
  if(d>350)p={x:e.x+(p.x-e.x)*350/d,y:e.y+(p.y-e.y)*350/d};
  p={x:Math.max(0,Math.min(w.worldWidth,p.x)),y:Math.max(0,Math.min(w.worldHeight,p.y))};
  const directions=e.color==='blue'?blueWaveDirections(dir):null;
  e.specialCooldown=cfg.cooldown;e.specialCast={directions,id:++this.castId,time:0,dir,point:p,target,targetPoint:target?{x:target.x,y:target.y}:null};
  this.log('special-start',e,{color:e.color,cast:e.specialCast.id});return true;
 }
 damage(owner,target,multiplier,kind='direct'){
  const life=target.defeatSerial??0;
  const hit=applyDamage(target,attackDamageForSize(owner.size,this.game.balance)*this.damageMultiplier(owner)*multiplier,this.game,owner,this.game.balance,{knockback:false,kind});
  return hit&&(target.defeatSerial??0)===life;
 }
 command(owner,kind,seconds,range,cast){
  const eligible=this.units().filter(e=>e.behavior==='ai'&&e.color===owner.color&&e.size<owner.size&&!e.apex&&dist(owner,e)<=range&&!e.command&&!e.beingAbsorbedByRef&&!(e.commandLock>0)&&!e.recovering&&e.hp/e.maxHp>.3);
  const recipients=eligible.filter(e=>kind!=='rally'||(e.attackUnlocked&&e.attackStack>0&&cast.target?.alive&&cast.target.size<=e.size*1.5&&e.hp/e.maxHp>.4)).sort((a,b)=>dist(owner,a)-dist(owner,b)||a.id-b.id).slice(0,4);
  for(const e of recipients){e.command={owner,kind,remaining:seconds,choices:new Map(),cast:cast.id,target:cast.target,point:cast.targetPoint};this.log('command-start',e,{kind,owner:owner.id});}
 }
 fire(e,cast){
  this.flashes.push({x:e.x,y:e.y,color:e.color,colorHex:e.colorHex,dir:cast.dir,directions:cast.directions ? [...cast.directions] : null,point:{...cast.point},remaining:.75});
  this.log('special-fire',e,{color:e.color,cast:cast.id});const units=this.units();
  if(e.color==='cyan')for(const t of units){if(!isHostile(e,t)||!inCone(e,t,cast.dir,260))continue;
    if(this.damage(e,t,.5)&&t.alive&&!(t.freezeImmune>0)){t.frozen=1;t.attackState='READY';t.dodgeState='READY';t.invincible=false;t.trail=[];cancelAbsorption(t);for(const o of units)if(o.beingAbsorbedByRef===t)cancelAbsorption(o);if(t.specialCast)t.specialCast=null;}
  }
  if(e.color==='blue'){
    // One cast, one shared registry: even overlapping lanes hit each target only once.
    const hit=new Set();
    for(const dir of cast.directions ?? [cast.dir])this.waves.push({owner:e,cast:cast.id,x:e.x,y:e.y,dir,time:0,hit});
    this.command(e,'devour',4,350,cast);
  }
  if(e.color==='green'){
    for(const t of units)if(t.color===e.color&&dist(e,t)<=350){t.morale??=new Map();t.morale.set(e.id,Math.max(t.morale.get(e.id)??0,5));}
    this.command(e,'harvest',5,350,cast);
  }
  if(e.color==='red'){cast.targetPoint=cast.target?.alive?{x:cast.target.x,y:cast.target.y}:cast.targetPoint;this.command(e,'rally',4,450,cast);}
  if(e.color==='yellow'){this.fields=this.fields.filter(f=>f.owner!==e);this.fields.push({owner:e,...cast.point,time:0,tick:0});}
 }
 update(dt){
  for(const flash of this.flashes)flash.remaining-=dt;
  this.flashes=this.flashes.filter(f=>f.remaining>0);
  const units=this.units(),w=this.game.balance.world;
  for(const e of this.game.entities){
    if(!e.alive||!e.apex){if(e.specialCast||e._specialApex)this.release(e);e._specialApex=false;}
    e.specialCooldown=Math.max(0,(e.specialCooldown??0)-dt);
    if(e.alive&&e.apex&&!e._specialApex){e.specialCooldown=Math.max(e.specialCooldown??0,5);e._specialApex=true;}e.commandLock=Math.max(0,(e.commandLock??0)-dt);
    e.freezeImmune=Math.max(0,(e.freezeImmune??0)-dt);e.waveImmune=Math.max(0,(e.waveImmune??0)-dt);
    if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);if(!e.frozen)e.freezeImmune=2;}
    if(e.wavePush){const p=e.wavePush,used=Math.min(dt,p.remaining);e.x+=p.vx*used;e.y+=p.vy*used;p.remaining-=used;
      e.x=Math.max(e.size/2,Math.min(w.worldWidth-e.size/2,e.x));e.y=Math.max(e.size/2,Math.min(w.worldHeight-e.size/2,e.y));
      if(p.remaining<=1e-8){e.wavePush=null;e.waveImmune=1;}}
    if(e.morale)for(const [id,time]of e.morale){if(time<=dt)e.morale.delete(id);else e.morale.set(id,time-dt);}
    if(e.command){e.command.remaining-=dt;if(e.command.remaining<=0||!e.command.owner.alive||!e.command.owner.apex)this.endCommand(e,'expiry-or-owner');}
    if(e.specialCast){if(!e.alive||!e.apex||e.frozen>0)e.specialCast=null;else {e.specialCast.time+=dt;if(e.specialCast.time+1e-8>=ABILITIES[e.color].windup){const cast=e.specialCast;e.specialCast=null;this.fire(e,cast);}}}
  }
  for(const wave of this.waves){const previous=wave.time;wave.time=Math.min(.5,wave.time+dt);
    // Swept advancing strip avoids tunneling across frame boundaries.
    for(const t of units){if(!t.alive||!isHostile(wave.owner,t)||wave.hit.has(t.id))continue;
      if(!inWave(wave,t,wave.dir,wave.time/.5*400,180))continue;
      const along=(t.x-wave.x)*Math.cos(wave.dir)+(t.y-wave.y)*Math.sin(wave.dir);
      if(along<previous/.5*400-1e-8)continue;
      wave.hit.add(t.id);if(this.damage(wave.owner,t,.5)&&t.alive&&!t.wavePush&&!(t.waveImmune>0))t.wavePush={remaining:.2,vx:Math.cos(wave.dir)*600,vy:Math.sin(wave.dir)*600};
    }
  }
  this.waves=this.waves.filter(f=>f.time<.5-1e-8);
  const hits=new Map();
  for(const f of this.fields){f.time+=dt;f.tick+=dt;if(!f.owner.alive||!f.owner.apex)continue;
    if(f.tick+1e-8>=.5&&f.time<=5+1e-8){f.tick-=.5;for(const t of units)if(isHostile(f.owner,t)&&dist(f,t)<=220){const raw=attackDamageForSize(f.owner.size,this.game.balance)*this.damageMultiplier(f.owner)*.15;if(!hits.has(t.id)||hits.get(t.id).raw<raw)hits.set(t.id,{t,owner:f.owner,raw});}}}
  for(const {t,owner,raw}of hits.values())if(owner.alive&&owner.apex)applyDamage(t,raw,this.game,owner,this.game.balance,{knockback:false,kind:'field'});
  this.fields=this.fields.filter(f=>f.time<5-1e-8&&f.owner.alive&&f.owner.apex);
 }
 miss(target){return this.fields.some(f=>f.owner===target&&dist(f,target)<=220)&&random('ai')<.25;}
 damageMultiplier(e){return e.morale?.size?1.15:1;}
 commandDecision(e){
  const c=e.command;if(!c)return false;
  if(e.recovering||e.hp/e.maxHp<=.3||e.beingAbsorbedByRef){this.endCommand(e,'survival');return false;}
  if(c.selected && (!c.selected.alive||!(canAbsorb(e,c.selected)||c.selected.beingAbsorbedByRef===e)||dist(e,c.selected)>400)){this.endCommand(e,'devour-target-invalid');return false;}
  const range=this.game.balance.ai.detectionRange;
  const nearby=this.game.getNearbyEntities(e,c.kind==='devour'?400:range).filter(t=>t.alive&&dist(e,t)<=(c.kind==='devour'?400:range));
  let target;
  if(c.kind==='devour'){
    const candidates=nearby.filter(t=>t!==c.owner&&!t.apex&&canAbsorb(e,t));
    for(const t of candidates)if(!c.choices.has(t.id))c.choices.set(t.id,random('ai')<(t.size<70?.8:.2));
    target=c.selected ?? candidates.filter(t=>c.choices.get(t.id)).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];c.selected=target;
  }else if(c.kind==='harvest')target=nearby.filter(t=>canEatOrb(e,t,this.game.balance)).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
  else {
    if(!c.target?.alive||e.hp/e.maxHp<=.4){this.endCommand(e,'rally-invalid');return false;}
    if(dist(e,c.target)<=range)c.point={x:c.target.x,y:c.target.y};
    if(dist(e,c.target)<=range){e.state='chase_fight';e.target=c.target;return true;}
    if(dist(e,c.point)<=20){this.endCommand(e,'unseen-at-point');return false;}
    e.state='command_move';e.target={...c.point,alive:true};return true;
  }
  if(!target){this.endCommand(e,'no-target');return false;}e.state='chase_eat';e.target=target;return true;
 }
 absorptionAllowed(e,t){return e.command?.kind!=='devour'||(t!==e.command.owner&&!t.apex&&e.command.choices.get(t.id)===true);}
 considerAI(e){
  if(!this.canCast(e)||e.recovering||e.state==='flee'||e.beingAbsorbedByRef)return false;
  const nearby=this.game.getNearbyEntities(e,Math.max(320,e.color==='red'?450:350)).filter(t=>t.alive);
  const enemies=nearby.filter(t=>isHostile(e,t)&&dist(e,t)<=320);
  const target=enemies.sort((a,b)=>dist(e,a)-dist(e,b))[0];if(!target)return false;
  const dir=Math.atan2(target.y-e.y,target.x-e.x);
  if(e.color==='cyan'&&!inCone(e,target,dir,260))return false;
  if(e.color==='blue'&&!inWave(e,target,dir))return false;
  if(e.color==='green'&&!canStartAttack(e)&&!nearby.some(t=>t.color===e.color&&dist(e,t)<=350&&canStartAttack(t)))return false;
  if(e.color==='red'&&!nearby.some(t=>t.behavior==='ai'&&t.color===e.color&&t.size<e.size&&!t.apex&&dist(e,t)<=450&&t.attackUnlocked&&t.attackStack>0&&target.size<=t.size*1.5&&!t.command&&!(t.commandLock>0)&&!t.recovering&&t.hp/t.maxHp>.4))return false;
  return this.start(e,dir,{x:target.x,y:target.y},target);
 }
 draw(ctx,zoom){
  const shape=(e,dir,point)=>{
    if(e.color==='cyan'){ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,260,dir-Math.PI/3,dir+Math.PI/3);ctx.closePath();}
    else if(e.color==='blue'){for(const lane of e.directions ?? e.specialCast?.directions ?? [dir]){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(lane);ctx.rect(0,-90,400,180);ctx.restore();}}
    else if(e.color==='yellow')ctx.arc(point.x,point.y,220,0,Math.PI*2);
    else ctx.arc(e.x,e.y,ABILITIES[e.color].radius,0,Math.PI*2);
  };
  for(const e of this.units())if(e.specialCast){ctx.save();ctx.beginPath();shape(e,e.specialCast.dir,e.specialCast.point);ctx.fillStyle=this.game.withAlpha(e.colorHex,.09);ctx.fill();ctx.strokeStyle=e.colorHex;ctx.lineWidth=2/zoom;ctx.setLineDash([8/zoom,5/zoom]);ctx.stroke();ctx.setLineDash([]);if(e.color==='red'&&e.specialCast.target){const t=e.specialCast.target;ctx.beginPath();ctx.arc(t.x,t.y,t.size/2+10,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  const labels={cyan:'냉기 휘두르기',blue:'삼중 파도',green:'사기 진작',red:'전투 집결',yellow:'모래바람'};
  for(const flash of this.flashes){
    ctx.save();ctx.globalAlpha=Math.min(1,flash.remaining/.25);
    ctx.beginPath();shape(flash,flash.dir,flash.point);
    ctx.fillStyle=this.game.withAlpha(flash.colorHex,.22);ctx.fill();
    ctx.strokeStyle=flash.colorHex;ctx.lineWidth=4/zoom;ctx.stroke();
    // The stationary origin marker identifies the caster even for a remote sand field.
    ctx.beginPath();ctx.arc(flash.x,flash.y,(30+(1-flash.remaining/.75)*25)/zoom,0,Math.PI*2);ctx.stroke();
    ctx.font=`bold ${16/zoom}px sans-serif`;ctx.textAlign='center';
    ctx.lineWidth=4/zoom;ctx.strokeStyle='#111827';ctx.strokeText(labels[flash.color],flash.x,flash.y-45/zoom);
    ctx.fillStyle='#fff';ctx.fillText(labels[flash.color],flash.x,flash.y-45/zoom);ctx.restore();
  }
  for(const f of this.fields){ctx.beginPath();ctx.arc(f.x,f.y,220,0,Math.PI*2);ctx.fillStyle='rgba(234,179,8,.12)';ctx.fill();ctx.strokeStyle='#eab308';ctx.lineWidth=2/zoom;ctx.stroke();}
  for(const wave of this.waves){ctx.save();ctx.translate(wave.x,wave.y);ctx.rotate(wave.dir);ctx.fillStyle='rgba(59,130,246,.4)';ctx.fillRect(Math.max(0,wave.time/.5*400-20),-90,20,180);ctx.restore();}
 }
}
