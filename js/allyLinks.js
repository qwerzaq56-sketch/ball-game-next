import {dist,isHostile} from './collision.js';
import {random} from './random.js';
import {cancelAbsorption} from './absorption.js';

export const ALLY_RULES={enter:100,release:140,bonus:.05,bonusCap:3,decisionSeconds:3,joinChance:.18,leaveChance:.08,maxGroup:6};
const key=(a,b)=>a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
const unit=e=>e.alive&&(e.behavior==='ai'||e.behavior==='player');
export class AllyLinks {
 constructor(game){this.game=game;this.edges=new Map();this.groups=new Map();this.nextGroup=1;this.timer=0;this.events=[];this.stats={joins:0,leaves:0};}
 connected(a,b){return a!==b&&unit(a)&&unit(b)&&a.color===b.color&&dist(a,b)-(a.size+b.size)/2<=(this.edges.has(key(a,b))?ALLY_RULES.release:ALLY_RULES.enter);}
 neighbors(e){return this.game.entities.filter(t=>this.connected(e,t));}
 bonus(e){return Math.min(ALLY_RULES.bonusCap,this.neighbors(e).length)*ALLY_RULES.bonus;}
 refresh(){
  const units=this.game.entities.filter(unit),grid=new Map(),cell=220;
  const maxRadius=Math.max(0,...units.map(e=>e.size/2));
  for(const e of units){const k=`${Math.floor(e.x/cell)}:${Math.floor(e.y/cell)}`;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(e);}
  const next=new Map();
  for(const a of units){const r=a.size/2+maxRadius+ALLY_RULES.release;
   for(let x=Math.floor((a.x-r)/cell);x<=Math.floor((a.x+r)/cell);x++)for(let y=Math.floor((a.y-r)/cell);y<=Math.floor((a.y+r)/cell);y++){
    for(const b of grid.get(`${x}:${y}`)??[])if(a.id<b.id&&this.connected(a,b))next.set(key(a,b),[a,b]);
   }
  }
  this.edges=next;
  for(const group of [...this.groups.values()]) {
   for(const e of [...group.members])if(e.companionGroup===group.id&&(!unit(e)||e.color!==group.color||!units.includes(e)))this.leave(e,'invalid');
   if(!this.groups.has(group.id))continue;
   if(!group.members.has(group.leader))group.leader=this.leader([...group.members]);
   for(const e of [...group.members])if(this.groups.has(group.id)&&e!==group.leader&&!this.path(e,group.leader,group.members))this.leave(e,'disconnected');
  }
 }
 path(a,b,members){const seen=new Set([a]),queue=[a];while(queue.length){const e=queue.shift();if(e===b)return true;for(const n of this.neighbors(e))if(members.has(n)&&!seen.has(n)){seen.add(n);queue.push(n);}}return false;}
 leader(members){return members.find(e=>e.behavior==='player')??[...members].sort((a,b)=>b.size-a.size||a.id-b.id)[0];}
 log(type,e,reason){if(type==='join')this.stats.joins++;if(type==='leave')this.stats.leaves++;this.events.push({time:this.game.gameTime,type,id:e.id,reason});if(this.events.length>100)this.events.shift();}
 peaceful(e){return !!e.companionGroup;}
 join(a,b){
  if(a.companionGroup||!this.connected(a,b)||a.beingAbsorbedByRef||b.beingAbsorbedByRef)return false;
  let group=this.groups.get(b.companionGroup);
  if(group&&group.members.size>=ALLY_RULES.maxGroup)return false;
  if(!group){group={id:this.nextGroup++,color:a.color,leader:this.leader([a,b]),members:new Set([b])};this.groups.set(group.id,group);this.enter(b,group);}
  group.members.add(a);this.enter(a,group);return true;
 }
 enter(e,group){
  e.companionGroup=group.id;e.companionCooldown=ALLY_RULES.decisionSeconds;e.attackState='READY';e.trail=[];e.specialCast=null;e.retaliateTarget=null;e.challengeTarget=null;e.escapeAbsorber=null;
  cancelAbsorption(e);this.game.abilities.endCommand(e,'companionship');
  this.game.abilities.release(e); // Maintained fields cannot continue aggression while accompanying.
  if(e.behavior==='ai'){e.state='companion';e.target=null;}this.log('join',e);
 }
 leave(e,reason='choice'){
  if(!e.companionGroup)return;
  const group=this.groups.get(e.companionGroup);e.companionGroup=null;e.companionCooldown=ALLY_RULES.decisionSeconds;
  if(e.behavior==='ai'){e.state='search';e.target=null;e.decisionTimer=0;}group?.members.delete(e);this.log('leave',e,reason);
  if(group&&group.members.size<2){this.groups.delete(group.id);for(const last of group.members){last.companionGroup=null;last.companionCooldown=ALLY_RULES.decisionSeconds;if(last.behavior==='ai'){last.state='search';last.target=null;last.decisionTimer=0;}this.log('leave',last,'group-dissolved');}}
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
   const neighbor=this.neighbors(e).filter(n=>!n.beingAbsorbedByRef&&!(n.companionCooldown>0)&&n.attackState==='READY'&&!n.specialCast)
    .sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0];
   if(neighbor&&random('ai')<ALLY_RULES.joinChance)this.join(e,neighbor);
  }
 }
 move(e,dt){
  const group=this.groups.get(e.companionGroup);if(!group)return false;
  // Survival escape takes priority, but never starts an attack or a cast.
  const danger=this.game.abilities.fields.find(f=>f.owner.color!==e.color&&dist(e,f)<=420);
  const threat=e.beingAbsorbedByRef??danger??this.game.getNearbyEntities(e,320).find(t=>t.alive&&isHostile(e,t)&&t.size>=e.size*1.2&&dist(e,t)<=320);
  if(threat){const angle=Math.atan2(e.y-threat.y,e.x-threat.x);e.state='flee';e.facing=angle;e.x+=Math.cos(angle)*e.moveSpeed*1.3*dt;e.y+=Math.sin(angle)*e.moveSpeed*1.3*dt;return true;}
  e.state='companion';
  if(group.leader===e){e.wanderTimer-=dt;if(e.wanderTimer<=0){e.wanderAngle=random('ai')*Math.PI*2;e.wanderTimer=3;}e.facing=e.wanderAngle;e.x+=Math.cos(e.facing)*e.moveSpeed*.55*dt;e.y+=Math.sin(e.facing)*e.moveSpeed*.55*dt;return true;}
  const members=[...group.members].filter(m=>m!==group.leader).sort((a,b)=>a.id-b.id),i=members.indexOf(e);
  const lead=group.leader,back=lead.facing+Math.PI;
  const gap=(lead.size+e.size)/2+35,side=(i%2?1:-1)*(25+Math.floor(i/2)*30);
  const w=this.game.balance.world;
  const point={x:Math.max(e.size/2,Math.min(w.worldWidth-e.size/2,lead.x+Math.cos(back)*gap-Math.sin(back)*side)),y:Math.max(e.size/2,Math.min(w.worldHeight-e.size/2,lead.y+Math.sin(back)*gap+Math.cos(back)*side))};
  const d=dist(e,point),angle=Math.atan2(point.y-e.y,point.x-e.x),speed=Math.min(e.moveSpeed*1.25,d/Math.max(dt,1e-8));
  e.facing=lead.facing;e.x+=Math.cos(angle)*speed*dt;e.y+=Math.sin(angle)*speed*dt;return true;
 }
 draw(ctx,zoom){ctx.save();ctx.lineWidth=2/zoom;for(const [a,b]of this.edges.values()){
  if(!this.connected(a,b))continue;const d=dist(a,b);if(d<1||d<=(a.size+b.size)/2)continue;
  const dx=(b.x-a.x)/d,dy=(b.y-a.y)/d;ctx.beginPath();ctx.moveTo(a.x+dx*a.size/2,a.y+dy*a.size/2);ctx.lineTo(b.x-dx*b.size/2,b.y-dy*b.size/2);
  ctx.strokeStyle=this.game.withAlpha(a.colorHex,a.companionGroup && a.companionGroup===b.companionGroup ? .7 : .3);ctx.stroke();
 }ctx.restore();}
}
