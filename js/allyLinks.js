import {canStartAttack,startAttack,canStartDodge,startDodge,attackChargeDistanceForSize,dodgeDistanceForSize} from './combat.js';
import {attackReach} from './abilities.js';
import {delta,angleTo,near} from './topology.js';
import {worldView,segmentInView} from './renderVisibility.js';
import { boundCenter } from './worldBounds.js';
import {dist,isHostile,canAbsorb} from './collision.js';
import {random} from './random.js';
import {cancelAbsorption,maintainDistanceFor} from './absorption.js';

export const ALLY_RULES={enter:100,release:140,bonus:.05,bonusCap:3,decisionSeconds:3,joinChance:.18,leaveChance:.08,maxGroup:6,freeRadius:60,spring:2,catchup:1.6,leaderPace:.9,threatEnter:320,threatRelease:400};
const key=(a,b)=>a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
export const AFFINITY={social:{join:.30,leave:.03,accept:.85,label:'동행 선호'},neutral:{join:.18,leave:.08,accept:.60,label:'중립'},independent:{join:.07,leave:.18,accept:.25,label:'독립 선호'}};
const affinity=e=>AFFINITY[e.companionAffinity]??AFFINITY.neutral;
const unit=e=>e.alive&&(e.behavior==='ai'||e.behavior==='player');
export class AllyLinks {
 constructor(game){this.game=game;this.edges=new Map();this.groups=new Map();this.nextGroup=1;this.timer=0;this.events=[];this.stats={joins:0,leaves:0};this.truceUntil=0;this.truceCycle=-1;}
 tether(group){const lead=group.leader;return Math.max(ALLY_RULES.release,2*Math.max(attackChargeDistanceForSize(lead.size,this.game.balance,lead.apex),dodgeDistanceForSize(lead.size,this.game.balance)));}
 connected(a,b){return a!==b&&!a.warTargets?.has(b)&&!b.warTargets?.has(a)&&unit(a)&&unit(b)&&(a.color===b.color||a.companionGroup&&a.companionGroup===b.companionGroup)&&dist(a,b)-(a.size+b.size)/2<=(a.companionGroup&&a.companionGroup===b.companionGroup&&this.groups.has(a.companionGroup)?this.tether(this.groups.get(a.companionGroup)):(this.edges.has(key(a,b))?ALLY_RULES.release:ALLY_RULES.enter));}
 neighbors(e){return this.game.entities.filter(t=>this.connected(e,t));}
 bonus(e){return Math.min(ALLY_RULES.bonusCap,this.neighbors(e).filter(t=>t.color===e.color).length)*ALLY_RULES.bonus;}
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
  for(const group of this.groups.values())for(const a of group.members)for(const b of group.members)if(a.id<b.id&&this.connected(a,b))next.set(key(a,b),[a,b]);
  this.edges=next;
  for(const group of [...this.groups.values()]) {
   if(group.truceUntil&&group.truceUntil<=this.game.gameTime)group.truceUntil=0;
   for(const e of [...group.members])if(e.companionGroup===group.id&&(!unit(e)||e.color!==group.color&&!group.truceUntil||!units.includes(e)))this.leave(e,'invalid');
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
  if(this.game.biomes.danger(e,!!e.environmentThreat)||e.beingAbsorbedByRef||e.escapeAbsorber||this.game.abilities.fields.some(f=>isHostile(e,f.owner)&&dist(e,f)<(f.radius??360)+60))return false;
  const kind=this.personality(g);
  const allies=[...g.members].filter(m=>unit(m)&&dist(e,m)<320+(e.size+m.size)/2);
  const power=Math.sqrt(allies.reduce((n,m)=>n+m.size*m.size*(m.hp/m.maxHp),0));
  const range=Math.max(320,g.leader.size+this.tether(g)/2),targets=this.game.getNearbyEntities(e,range).filter(t=>unit(t)&&isHostile(e,t)&&dist(e,t)<range&&dist(g.leader,t)<this.tether(g)+(g.leader.size+t.size)/2).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id);
  const active=targets.find(t=>['TELEGRAPH','CHARGING'].includes(t.attackState)&&[...g.members].some(m=>unit(m)&&dist(t,m)<=attackReach(t,this.game.balance)+(t.size+m.size)/2+120&&Math.abs(Math.atan2(Math.sin(angleTo(t,m)-t.attackDir),Math.cos(angleTo(t,m)-t.attackDir)))<Math.PI/3));
  if(active){g.aggressor=active;g.aggressorUntil=this.game.gameTime+5;}
  const defense=targets.includes(g.aggressor)&&g.aggressorUntil>this.game.gameTime?g.aggressor:null;
  const ordered=defense?[defense,...targets.filter(t=>t!==defense)]:targets;
  const target=ordered.find(t=>t.size<=power*(t===defense?1.5:kind==='challenge'?1.35:kind==='opportunity'?1.15:.7)&&e.hp/e.maxHp>.3&&(!e.beingAbsorbedByRef));
  if(!target)return false;e.companionThreat=null;e.state='chase_fight';e.target=target;
  const angle=angleTo(e,target);e.facing=angle;
  this.game.abilities.considerAI(e);
  if(dist(e,target)<=attackReach(e,this.game.balance)+(e.size+target.size)/2&&canStartAttack(e))startAttack(e,angle,this.game.balance);
  return true;
 }
 inviteRange(owner){return Math.max(280,this.game.balance.ai.detectionRange*.65+Math.max(0,owner.size-40)*.65);}
 acceptChance(owner,target,base=affinity(target).accept){return Math.min(.95,base+(owner.apex?.2:0));}
 offer(owner){
  if(this.game.paused||this.game.gameOver||!unit(owner)||owner.frozen>0||owner.attackState!=='READY'||owner.dodgeState==='DODGING'||owner.specialCast||owner.beingAbsorbedByRef||(owner.inviteReadyAt??0)>this.game.gameTime)return false;
  owner.inviteReadyAt=this.game.gameTime+5;owner.inviteFlashUntil=this.game.gameTime+.8;let accepted=0;const range=this.inviteRange(owner);
  for(const target of this.game.getNearbyEntities(owner,range).filter(t=>unit(t)&&t!==owner&&!t.companionGroup&&!t.beingAbsorbedByRef&&dist(owner,t)<=range&&(t.color===owner.color||this.truceUntil>this.game.gameTime)).sort((a,b)=>dist(owner,a)-dist(owner,b)||a.id-b.id).slice(0,3)){
   if(random('ai')<this.acceptChance(owner,target)&&this.recruit(owner,target,target.color!==owner.color))accepted++;
  }
  this.game.spawnFloatingText(owner.x,owner.y-owner.size/2-30,accepted?`동행 제안 · ${accepted}명 수락`:'동행 제안 · 수락 없음','#c4b5fd');return true;
 }
 recruit(owner,target,mixed=false){
  if(owner.warTargets?.has(target)||target.warTargets?.has(owner)||target===owner||target.companionGroup||!unit(target)||target.color!==owner.color&&!mixed)return false;
  if(mixed&&this.truceUntil<=this.game.gameTime)return false;
  let group=this.groups.get(owner.companionGroup);
  if(group&&group.members.size>=ALLY_RULES.maxGroup)return false;
  if(!group){group={id:this.nextGroup++,color:owner.color,leader:owner,members:new Set([owner])};this.groups.set(group.id,group);this.enter(owner,group);}
  if(mixed)group.truceUntil=this.truceUntil;
  group.members.add(target);this.enter(target,group);target.recruitedUntil=this.game.gameTime+20;if(owner.behavior==='player'||!group.leader?.alive)group.leader=owner;this.personality(group);return true;
 }
 merge(owner,target){
  const source=this.groups.get(target.companionGroup),destination=this.groups.get(owner.companionGroup);
  if(!source)return this.recruit(owner,target);
  if(source===destination)return false;
  const members=new Set([...(destination?.members??[owner]),...source.members]);
  // All-or-nothing: a full formation stays intact rather than losing a few members.
  if(members.size>ALLY_RULES.maxGroup||[...members].some(e=>!unit(e)||e.beingAbsorbedByRef||e.color!==owner.color))return false;
  for(const a of members)for(const b of members)if(a.warTargets?.has(b)||b.warTargets?.has(a))return false;
  let group=destination;if(!group){group={id:this.nextGroup++,color:owner.color,leader:owner,members:new Set([owner])};this.groups.set(group.id,group);this.enter(owner,group);}
  const incoming=[...source.members];this.groups.delete(source.id);source.members.clear();
  for(const e of incoming){group.members.add(e);this.enter(e,group);e.recruitedUntil=this.game.gameTime+20;}
  group.leader=this.leader([...group.members]);this.personality(group);return true;
 }
 join(a,b){
  if(a.warTargets?.has(b)||b.warTargets?.has(a)||a.companionGroup||!this.connected(a,b)||a.beingAbsorbedByRef||b.beingAbsorbedByRef)return false;
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
 setAutoOffer(enabled){this.game.player.autoCompanionOffer=enabled;this.game.player.nextAutoCompanionOffer=this.game.gameTime+5;}
 update(dt){
  const p=this.game.player;if(p.autoCompanionOffer&&this.game.gameTime>=(p.nextAutoCompanionOffer??0)){p.nextAutoCompanionOffer=this.game.gameTime+5;this.offer(p);}

  const cycle=Math.floor(this.game.gameTime/120),local=this.game.gameTime%120;
  if(local>=60&&local<80&&cycle!==this.truceCycle){this.truceCycle=cycle;this.truceUntil=cycle*120+80;this.game.spawnFloatingText(this.game.player.x,this.game.player.y-100,'우정 축제 · 다른 색에도 동행 제안 가능','#c4b5fd');}
  this.refresh();
  for(const e of this.game.entities)e.companionCooldown=Math.max(0,(e.companionCooldown??0)-dt);
  this.timer-=dt;if(this.timer>0)return;this.timer+=ALLY_RULES.decisionSeconds;
  const candidates=this.game.entities.filter(unit).sort((a,b)=>a.id-b.id);
  for(const e of candidates){
   if(e.companionCooldown>0)continue;
   if(e.companionGroup){if(e.behavior==='ai'&&!e.summoned&&!(e.recruitedUntil>this.game.gameTime)&&e.attackState==='READY'&&e.dodgeState!=='DODGING'&&e.state!=='chase_fight'&&random('ai')<affinity(e).leave*.35)this.leave(e);continue;}
   if(e.behavior!=='ai'||e.frozen>0||e.beingAbsorbedByRef||e.recovering||e.attackState!=='READY'||e.dodgeState==='DODGING')continue;
   const neighbor=(this.truceUntil>this.game.gameTime?candidates.filter(n=>n!==e&&dist(e,n)<=280):this.neighbors(e)).filter(n=>!n.beingAbsorbedByRef&&!(n.companionCooldown>0)&&!(n.frozen>0)&&!n.recovering&&n.dodgeState!=='DODGING'&&n.attackState==='READY'&&!n.specialCast&&(!n.companionGroup||this.groups.get(n.companionGroup)?.members.size<ALLY_RULES.maxGroup))
    .sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
   if(neighbor&&random('ai')<affinity(e).join){if(neighbor.color===e.color)this.join(e,neighbor);else this.recruit(e,neighbor,true);}
  }
 }
 move(e,dt){
  const group=this.groups.get(e.companionGroup);if(!group)return false;const moveSpeed=e.moveSpeed*this.game.abilities.speedMultiplier(e)*this.game.biomes.moveMultiplier(e);
  e.companionVelocity={x:0,y:0};
  const environment=this.game.biomes.danger(e,!!e.environmentThreat);e.environmentThreat=environment;
  if(environment){const angle=angleTo(environment,e);e.state='flee';e.facing=angle;e.x+=Math.cos(angle)*moveSpeed*1.3*dt;e.y+=Math.sin(angle)*moveSpeed*1.3*dt;return true;}
  // Survival movement follows only when no collective engagement is selected.
  if(e.beingAbsorbedByRef)e.escapeAbsorber=e.beingAbsorbedByRef;
  if(!e.beingAbsorbedByRef&&e.escapeAbsorber&&(!unit(e.escapeAbsorber)||!canAbsorb(e.escapeAbsorber,e)||dist(e,e.escapeAbsorber)>maintainDistanceFor(e.escapeAbsorber,this.game.balance)+80))e.escapeAbsorber=null;
  const fields=this.game.abilities.fields.filter(f=>isHostile(e,f.owner));
  const remembered=e.companionThreat;
  const held=remembered && (fields.includes(remembered)
   ? remembered.owner.alive&&remembered.owner.apex&&remembered.owner.color!==e.color&&dist(e,remembered)<=(remembered.radius??360)+60
   : unit(remembered)&&isHostile(e,remembered)&&remembered.size>=e.size*1.2&&dist(e,remembered)<=ALLY_RULES.threatRelease);
  const danger=fields.find(f=>f.owner.alive&&f.owner.apex&&f.owner.color!==e.color&&dist(e,f)<=(f.radius??360));
  const threat=e.beingAbsorbedByRef??e.escapeAbsorber??(held?remembered:null)??danger??this.game.getNearbyEntities(e,ALLY_RULES.threatEnter)
   .filter(t=>unit(t)&&isHostile(e,t)&&t.size>=e.size*1.2&&dist(e,t)<=ALLY_RULES.threatEnter)
   .sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
  e.companionThreat=threat??null;
  if(threat){const angle=angleTo(threat,e);e.state='flee';e.facing=angle;e.x+=Math.cos(angle)*moveSpeed*1.3*dt;e.y+=Math.sin(angle)*moveSpeed*1.3*dt;return true;}
  e.state='companion';
  if(group.leader===e){e.wanderTimer-=dt;if(e.wanderTimer<=0){e.wanderAngle=random('ai')*Math.PI*2;e.wanderTimer=3;}const w=this.game.balance.world,pad=e.size/2+60;
   if(!w.wrap&&((e.x<pad&&Math.cos(e.wanderAngle)<0)||(e.x>w.worldWidth-pad&&Math.cos(e.wanderAngle)>0)))e.wanderAngle=Math.PI-e.wanderAngle;
   if(!w.wrap&&((e.y<pad&&Math.sin(e.wanderAngle)<0)||(e.y>w.worldHeight-pad&&Math.sin(e.wanderAngle)>0)))e.wanderAngle=-e.wanderAngle;
   const route=this.game.biomes.routePoint(e,{x:e.x+Math.cos(e.wanderAngle)*300,y:e.y+Math.sin(e.wanderAngle)*300});e.facing=angleTo(e,route);e.companionVelocity={x:Math.cos(e.facing)*moveSpeed*ALLY_RULES.leaderPace,y:Math.sin(e.facing)*moveSpeed*ALLY_RULES.leaderPace};e.x+=e.companionVelocity.x*dt;e.y+=e.companionVelocity.y*dt;return true;}
  const members=[...group.members].filter(m=>m!==group.leader).sort((a,b)=>a.id-b.id),i=members.indexOf(e);
  const lead=group.leader,back=lead.facing+Math.PI;
  const gap=(lead.size+e.size)/2+35,side=(i%2?1:-1)*(25+Math.floor(i/2)*30);
  const w=this.game.balance.world;
  const point={x:boundCenter(lead.x+Math.cos(back)*gap-Math.sin(back)*side,e.size,w.worldWidth,w.wrap),y:boundCenter(lead.y+Math.sin(back)*gap+Math.cos(back)*side,e.size,w.worldHeight,w.wrap)};
  const route={...this.game.biomes.routePoint(e,point)};
  const baseDistance=dist(e,route);
  const free=ALLY_RULES.freeRadius+Math.min(80,lead.size*.12),phase=this.game.gameTime*.8+e.id*1.618;
  const offset=Math.min(45,free*.4),sway={x:Math.cos(phase)*offset,y:Math.sin(phase*.73)*offset};route.x+=sway.x;route.y+=sway.y;
  const gapToLead=dist(e,lead)-(e.size+lead.size)/2;
  if(gapToLead>this.tether(group)*.72&&canStartDodge(e)&&!this.game.biomes.danger(e)){startDodge(e,angleTo(e,lead),this.game.balance);return true;}
  const d=dist(e,route);
  const spring=baseDistance>free&&d>free?(d-free)*(1-Math.exp(-ALLY_RULES.spring*dt))/Math.max(dt,1e-8):0;
  const velocity=lead.companionVelocity??{x:0,y:0};
  const toward=delta(e,route);let vx=velocity.x*.65+(d>0?toward.x/d*spring:0),vy=velocity.y*.65+(d>0?toward.y/d*spring:0);
  const speed=Math.hypot(vx,vy),cap=moveSpeed*ALLY_RULES.catchup;
  if(speed>cap){vx*=cap/speed;vy*=cap/speed;}
  e.companionVelocity={x:vx,y:vy};if(speed>1)e.facing=Math.atan2(vy,vx);
  e.x+=vx*dt;e.y+=vy*dt;return true;
 }
 draw(ctx,zoom){for(const e of this.game.entities)if(e.alive&&e.inviteFlashUntil>this.game.gameTime){ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,this.inviteRange(e),0,Math.PI*2);ctx.strokeStyle='rgba(196,181,253,.65)';ctx.lineWidth=2/zoom;ctx.stroke();ctx.restore();}const view=worldView(this.game.canvas,this.game.renderCamera??this.game.camera);ctx.save();ctx.lineWidth=2/zoom;for(const [a,b]of this.edges.values()){
  const image=near(a,b);
  if(!segmentInView(view,a,image,2/zoom)||!this.connected(a,b))continue;const d=dist(a,b);if(d<1||d<=(a.size+b.size)/2)continue;
  const toward=delta(a,b),dx=toward.x/d,dy=toward.y/d;ctx.beginPath();ctx.moveTo(a.x+dx*a.size/2,a.y+dy*a.size/2);ctx.lineTo(image.x-dx*b.size/2,image.y-dy*b.size/2);
  if(a.color!==b.color)ctx.setLineDash([8/zoom,5/zoom]);else ctx.setLineDash([]);
  const linked=a.companionGroup&&a.companionGroup===b.companionGroup,color=a.color!==b.color?'#c4b5fd':a.colorHex;
  if(linked){ctx.strokeStyle=this.game.withAlpha(color,.16);ctx.lineWidth=10/zoom;ctx.stroke();ctx.strokeStyle=this.game.withAlpha(color,.75);ctx.lineWidth=4/zoom;ctx.stroke();ctx.strokeStyle='#f0fff4';ctx.lineWidth=1.5/zoom;ctx.stroke();}
  else{ctx.strokeStyle=this.game.withAlpha(color,.3);ctx.lineWidth=2/zoom;ctx.stroke();}
 }ctx.restore();}
}
