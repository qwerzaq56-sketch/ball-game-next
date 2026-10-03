import {canStartAttack,startAttack} from './combat.js';
import {attackReach} from './abilities.js';
import {delta,angleTo,near} from './topology.js';
import {worldView,segmentInView} from './renderVisibility.js';
import { boundCenter } from './worldBounds.js';
import {dist,isHostile,canAbsorb} from './collision.js';
import {random} from './random.js';
import {cancelAbsorption,maintainDistanceFor} from './absorption.js';

export const ALLY_RULES={enter:100,release:140,bonus:.05,bonusCap:3,decisionSeconds:3,joinChance:.18,leaveChance:.08,maxGroup:6,freeRadius:60,spring:2,catchup:1.6,leaderPace:.9,threatEnter:320,threatRelease:400};
const key=(a,b)=>a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
const unit=e=>e.alive&&(e.behavior==='ai'||e.behavior==='player');
export class AllyLinks {
 constructor(game){this.game=game;this.edges=new Map();this.groups=new Map();this.nextGroup=1;this.timer=0;this.events=[];this.stats={joins:0,leaves:0};}
 connected(a,b){return a!==b&&unit(a)&&unit(b)&&a.color===b.color&&dist(a,b)-(a.size+b.size)/2<=(this.edges.has(key(a,b))?ALLY_RULES.release:ALLY_RULES.enter);}
 neighbors(e){return this.game.entities.filter(t=>this.connected(e,t));}
 bonus(e){return Math.min(ALLY_RULES.bonusCap,this.neighbors(e).length)*ALLY_RULES.bonus;}
 refresh(){
  const units=this.game.entities.filter(unit),grid=new Map(),byColor=new Map(),radii=new Map(),cell=220;
  for(const e of units){const k=`${Math.floor(e.x/cell)}:${Math.floor(e.y/cell)}`;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(e);if(!byColor.has(e.color))byColor.set(e.color,[]);byColor.get(e.color).push(e);radii.set(e.color,Math.max(radii.get(e.color)??0,e.size/2));}
  const next=new Map();
  for(const a of units){const r=a.size/2+radii.get(a.color)+ALLY_RULES.release;
   const minX=Math.floor((a.x-r)/cell),maxX=Math.floor((a.x+r)/cell),minY=Math.floor((a.y-r)/cell),maxY=Math.floor((a.y+r)/cell);
   if((maxX-minX+1)*(maxY-minY+1)>64||this.game.balance.world.wrap&&(a.x-r<0||a.y-r<0||a.x+r>this.game.balance.world.worldWidth||a.y+r>this.game.balance.world.worldHeight)){for(const b of byColor.get(a.color))if(a.id<b.id&&this.connected(a,b))next.set(key(a,b),[a,b]);continue;}
   for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
    for(const b of grid.get(`${x}:${y}`)??[])if(a.id<b.id&&this.connected(a,b))next.set(key(a,b),[a,b]);
   }
  }
  this.edges=next;
  for(const group of [...this.groups.values()]) {
   for(const e of [...group.members])if(e.companionGroup===group.id&&(!unit(e)||e.color!==group.color||!units.includes(e)))this.leave(e,'invalid');
   if(!this.groups.has(group.id))continue;
   if(!group.members.has(group.leader))group.leader=this.leader([...group.members]);
   for(const e of [...group.members])if(this.groups.has(group.id)&&e!==group.leader&&!(e.recruitedUntil>this.game.gameTime)&&!this.path(e,group.leader,group.members))this.leave(e,'disconnected');
  }
 }
 path(a,b,members){const seen=new Set([a]),queue=[a];while(queue.length){const e=queue.shift();if(e===b)return true;for(const n of this.neighbors(e))if(members.has(n)&&!seen.has(n)){seen.add(n);queue.push(n);}}return false;}
 leader(members){return members.find(e=>e.behavior==='player')??[...members].sort((a,b)=>b.size-a.size||a.id-b.id)[0];}
 log(type,e,reason){if(type==='join')this.stats.joins++;if(type==='leave')this.stats.leaves++;this.events.push({time:this.game.gameTime,type,id:e.id,reason});if(this.events.length>100)this.events.shift();}
 profile(group){
  const weights={challenge:0,opportunity:0,avoidance:0},map={growth:'challenge',opportunist:'opportunity',cautious:'avoidance'};
  for(const m of [...group.members].filter(unit))weights[map[m.personality]??'opportunity']+=1+(m===group.leader?2:0);
  return {personality:Object.keys(weights).sort((a,b)=>weights[b]-weights[a]||a.localeCompare(b))[0],weights};
 }
 personality(group){return this.profile(group).personality;}
 combat(e){
  const g=this.groups.get(e.companionGroup);if(!g)return false;e.state='companion';e.target=null;
  if(this.game.biomes.danger(e,!!e.environmentThreat)||e.beingAbsorbedByRef||e.escapeAbsorber||this.game.abilities.fields.some(f=>f.owner.color!==e.color&&dist(e,f)<420))return false;
  const kind=this.personality(g);
  const allies=[...g.members].filter(m=>unit(m)&&dist(e,m)<320);
  const power=Math.sqrt(allies.reduce((n,m)=>n+m.size*m.size*(m.hp/m.maxHp),0));
  const targets=this.game.getNearbyEntities(e,320).filter(t=>unit(t)&&isHostile(e,t)&&dist(e,t)<320).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id);
  const target=targets.find(t=>t.size<=power*(kind==='challenge'?1.25:kind==='opportunity'?1:.7)&&e.hp/e.maxHp>.3&&(!e.beingAbsorbedByRef));
  if(!target)return false;e.companionThreat=null;e.state='chase_fight';e.target=target;
  const angle=angleTo(e,target);e.facing=angle;
  this.game.abilities.considerAI(e);
  if(dist(e,target)<=attackReach(e,this.game.balance)+(e.size+target.size)/2&&canStartAttack(e))startAttack(e,angle,this.game.balance);
  return true;
 }
 recruit(owner,target){
  if(target===owner||target.companionGroup||!unit(target)||target.color!==owner.color)return false;
  let group=this.groups.get(owner.companionGroup);
  if(group&&group.members.size>=ALLY_RULES.maxGroup)return false;
  if(!group){group={id:this.nextGroup++,color:owner.color,leader:owner,members:new Set([owner])};this.groups.set(group.id,group);this.enter(owner,group);}
  group.members.add(target);this.enter(target,group);target.recruitedUntil=this.game.gameTime+5;group.leader=owner;this.personality(group);return true;
 }
 join(a,b){
  if(a.companionGroup||!this.connected(a,b)||a.beingAbsorbedByRef||b.beingAbsorbedByRef)return false;
  let group=this.groups.get(b.companionGroup);
  if(group&&group.members.size>=ALLY_RULES.maxGroup)return false;
  if(!group){group={id:this.nextGroup++,color:a.color,leader:this.leader([a,b]),members:new Set([b])};this.groups.set(group.id,group);this.enter(b,group);}
  group.members.add(a);this.enter(a,group);
  if(a.behavior==='player')group.leader=a;return true;
 }
 enter(e,group){
  e.companionGroup=group.id;e.companionCooldown=ALLY_RULES.decisionSeconds;e.attackState='READY';e.trail=[];e.specialCast=null;e.retaliateTarget=null;e.challengeTarget=null;e.companionThreat=null;
  cancelAbsorption(e);
  for(const target of this.game.entities)if(target.beingAbsorbedByRef===e)cancelAbsorption(target);
  this.game.abilities.endCommand(e,'companionship');
  if(e.behavior==='ai'){e.state='companion';e.target=null;}this.log('join',e);
 }
 leave(e,reason='choice'){
  if(!e.companionGroup)return;
  const group=this.groups.get(e.companionGroup);e.companionGroup=null;e.companionThreat=null;e.companionCooldown=ALLY_RULES.decisionSeconds;
  if(e.behavior==='ai'){e.state='search';e.target=null;e.decisionTimer=0;}group?.members.delete(e);this.log('leave',e,reason);
  if(group&&group.members.size<2){this.groups.delete(group.id);for(const last of group.members){last.companionGroup=null;last.companionThreat=null;last.companionCooldown=ALLY_RULES.decisionSeconds;if(last.behavior==='ai'){last.state='search';last.target=null;last.decisionTimer=0;}this.log('leave',last,'group-dissolved');}}
  else if(group&&!group.members.has(group.leader))group.leader=this.leader([...group.members]);
 }
 update(dt){
  this.refresh();
  for(const e of this.game.entities)e.companionCooldown=Math.max(0,(e.companionCooldown??0)-dt);
  this.timer-=dt;if(this.timer>0)return;this.timer+=ALLY_RULES.decisionSeconds;
  const candidates=this.game.entities.filter(unit).sort((a,b)=>a.id-b.id);
  for(const e of candidates){
   if(e.companionCooldown>0)continue;
   if(e.companionGroup){if(random('ai')<ALLY_RULES.leaveChance)this.leave(e);continue;}
   if(e.behavior!=='ai'||e.frozen>0||e.beingAbsorbedByRef||e.recovering||e.attackState!=='READY'||e.dodgeState==='DODGING')continue;
   const neighbor=this.neighbors(e).filter(n=>!n.beingAbsorbedByRef&&!(n.companionCooldown>0)&&!(n.frozen>0)&&!n.recovering&&n.dodgeState!=='DODGING'&&n.attackState==='READY'&&!n.specialCast&&(!n.companionGroup||this.groups.get(n.companionGroup)?.members.size<ALLY_RULES.maxGroup))
    .sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
   if(neighbor&&random('ai')<ALLY_RULES.joinChance)this.join(e,neighbor);
  }
 }
 move(e,dt){
  const group=this.groups.get(e.companionGroup);if(!group)return false;
  e.companionVelocity={x:0,y:0};
  const environment=this.game.biomes.danger(e,!!e.environmentThreat);e.environmentThreat=environment;
  if(environment){const angle=angleTo(environment,e);e.state='flee';e.facing=angle;e.x+=Math.cos(angle)*e.moveSpeed*1.3*dt;e.y+=Math.sin(angle)*e.moveSpeed*1.3*dt;return true;}
  // Survival movement follows only when no collective engagement is selected.
  if(e.beingAbsorbedByRef)e.escapeAbsorber=e.beingAbsorbedByRef;
  if(!e.beingAbsorbedByRef&&e.escapeAbsorber&&(!unit(e.escapeAbsorber)||!canAbsorb(e.escapeAbsorber,e)||dist(e,e.escapeAbsorber)>maintainDistanceFor(e.escapeAbsorber,this.game.balance)+80))e.escapeAbsorber=null;
  const fields=this.game.abilities.fields;
  const remembered=e.companionThreat;
  const held=remembered && (fields.includes(remembered)
   ? remembered.owner.alive&&remembered.owner.apex&&remembered.owner.color!==e.color&&dist(e,remembered)<=420
   : unit(remembered)&&isHostile(e,remembered)&&remembered.size>=e.size*1.2&&dist(e,remembered)<=ALLY_RULES.threatRelease);
  const danger=fields.find(f=>f.owner.alive&&f.owner.apex&&f.owner.color!==e.color&&dist(e,f)<=360);
  const threat=e.beingAbsorbedByRef??e.escapeAbsorber??(held?remembered:null)??danger??this.game.getNearbyEntities(e,ALLY_RULES.threatEnter)
   .filter(t=>unit(t)&&isHostile(e,t)&&t.size>=e.size*1.2&&dist(e,t)<=ALLY_RULES.threatEnter)
   .sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
  e.companionThreat=threat??null;
  if(threat){const angle=angleTo(threat,e);e.state='flee';e.facing=angle;e.x+=Math.cos(angle)*e.moveSpeed*1.3*dt;e.y+=Math.sin(angle)*e.moveSpeed*1.3*dt;return true;}
  e.state='companion';
  if(group.leader===e){e.wanderTimer-=dt;if(e.wanderTimer<=0){e.wanderAngle=random('ai')*Math.PI*2;e.wanderTimer=3;}const w=this.game.balance.world,pad=e.size/2+60;
   if(!w.wrap&&((e.x<pad&&Math.cos(e.wanderAngle)<0)||(e.x>w.worldWidth-pad&&Math.cos(e.wanderAngle)>0)))e.wanderAngle=Math.PI-e.wanderAngle;
   if(!w.wrap&&((e.y<pad&&Math.sin(e.wanderAngle)<0)||(e.y>w.worldHeight-pad&&Math.sin(e.wanderAngle)>0)))e.wanderAngle=-e.wanderAngle;
   const route=this.game.biomes.routePoint(e,{x:e.x+Math.cos(e.wanderAngle)*300,y:e.y+Math.sin(e.wanderAngle)*300});e.facing=angleTo(e,route);e.companionVelocity={x:Math.cos(e.facing)*e.moveSpeed*ALLY_RULES.leaderPace,y:Math.sin(e.facing)*e.moveSpeed*ALLY_RULES.leaderPace};e.x+=e.companionVelocity.x*dt;e.y+=e.companionVelocity.y*dt;return true;}
  const members=[...group.members].filter(m=>m!==group.leader).sort((a,b)=>a.id-b.id),i=members.indexOf(e);
  const lead=group.leader,back=lead.facing+Math.PI;
  const gap=(lead.size+e.size)/2+35,side=(i%2?1:-1)*(25+Math.floor(i/2)*30);
  const w=this.game.balance.world;
  const point={x:boundCenter(lead.x+Math.cos(back)*gap-Math.sin(back)*side,e.size,w.worldWidth,w.wrap),y:boundCenter(lead.y+Math.sin(back)*gap+Math.cos(back)*side,e.size,w.worldHeight,w.wrap)};
  const route=this.game.biomes.routePoint(e,point),d=dist(e,route);
  const free=ALLY_RULES.freeRadius+Math.min(40,e.size*.1);
  const spring=d>free?(d-free)*(1-Math.exp(-ALLY_RULES.spring*dt))/Math.max(dt,1e-8):0;
  const velocity=lead.companionVelocity??{x:0,y:0};
  const toward=delta(e,route);let vx=velocity.x+(d>0?toward.x/d*spring:0),vy=velocity.y+(d>0?toward.y/d*spring:0);
  const speed=Math.hypot(vx,vy),cap=e.moveSpeed*ALLY_RULES.catchup;
  if(speed>cap){vx*=cap/speed;vy*=cap/speed;}
  e.companionVelocity={x:vx,y:vy};if(speed>1)e.facing=Math.atan2(vy,vx);
  e.x+=vx*dt;e.y+=vy*dt;return true;
 }
 draw(ctx,zoom){const view=worldView(this.game.canvas,this.game.renderCamera??this.game.camera);ctx.save();ctx.lineWidth=2/zoom;for(const [a,b]of this.edges.values()){
  const image=near(a,b);
  if(!segmentInView(view,a,image,2/zoom)||!this.connected(a,b))continue;const d=dist(a,b);if(d<1||d<=(a.size+b.size)/2)continue;
  const toward=delta(a,b),dx=toward.x/d,dy=toward.y/d;ctx.beginPath();ctx.moveTo(a.x+dx*a.size/2,a.y+dy*a.size/2);ctx.lineTo(image.x-dx*b.size/2,image.y-dy*b.size/2);
  ctx.strokeStyle=this.game.withAlpha(a.colorHex,a.companionGroup && a.companionGroup===b.companionGroup ? .7 : .3);ctx.stroke();
 }ctx.restore();}
}
