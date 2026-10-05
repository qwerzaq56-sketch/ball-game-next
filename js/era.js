import {near} from './topology.js';
import {dist} from './collision.js';
import {applyDamage} from './combat.js?ai-pressure-01';
import {spawnOrb} from './spawning.js';
import {random} from './random.js';
export const ERA_PHASES=[{id:'abundance',name:'영양기',end:180,encounter:30},{id:'competition',name:'경쟁기',end:360,encounter:45},{id:'war',name:'전쟁기',end:480,encounter:45},{id:'decline',name:'쇠퇴기',end:540,encounter:60}];
export class Era {
 constructor(game){this.game=game;this.enabled=game.balance.era?.enabled!==false;this.phase=ERA_PHASES[0];this.cycle=0;this.remaining=180;this.apocalypse=null;this.apocalypseCycle=-1;this.apocalypseTick=0;this.duels=new Map();this.recentDuels=[];this.duelStarts=0;this.duelEnds=0;this.completedApocalypses=0;this.events=[];this.warRolls=new Set();this.warDamage=new Map();this.warCycle=-1;if(this.enabled)game.biomes.encounterTimer=30;}
 log(event){this.events.push({time:this.game.gameTime,...event});if(!this.game.options.collect&&this.events.length>100)this.events.shift();}
 get encounterInterval(){return this.enabled?this.phase.encounter:45;}
 update(dt){
  if(!this.enabled){this.clearWars();return;}
  const time=this.game.gameTime,local=time%540;this.cycle=Math.floor(time/540);const phase=ERA_PHASES.find(p=>local<p.end)??ERA_PHASES[0];
  if(phase!==this.phase){this.phase=phase;this.game.biomes.encounterTimer=Math.min(this.game.biomes.encounterTimer,phase.encounter);this.log({type:'era',phase:phase.id,cycle:this.cycle});}
  this.remaining=phase.end-local;
  this.updateWars();
  if(phase.id==='decline'&&this.apocalypseCycle!==this.cycle){
   this.apocalypseCycle=this.cycle;const w=this.game.balance.world,angle=(this.cycle%4)*Math.PI/2+Math.PI/4,d=Math.min(w.worldWidth,w.worldHeight)*.2;
   const radius=Math.min(300,Math.min(w.worldWidth,w.worldHeight)*.06);
   this.apocalypse={id:`apocalypse-${this.cycle}`,name:'파멸 조우',x:w.worldWidth/2+Math.cos(angle)*d,y:w.worldHeight/2+Math.sin(angle)*d,radius,hotRadius:radius,starts:time,activeAt:time+6,ends:time+14,active:false};this.apocalypseTick=0;this.log({type:'apocalypse-warning',cycle:this.cycle});
  }
  const field=this.apocalypse;if(!field)return;
  field.active=time>=field.activeAt;
  const used=Math.max(0,Math.min(time,field.ends)-Math.max(time-dt,field.activeAt));
  this.apocalypseTick+=used;while(this.apocalypseTick>=.5-1e-8){this.apocalypseTick-=.5;for(const e of this.game.entities)if(e.alive&&e.behavior!=='orb'&&dist(e,field)<field.radius)applyDamage(e,e.maxHp*.16,this.game,null,this.game.balance,{kind:'field',knockback:false});}
  if(time>=field.ends){this.reward(field);this.completedApocalypses++;this.log({type:'apocalypse-end',cycle:this.cycle});this.apocalypse=null;}
 }
 clearWars(){
  for(const e of this.game.entities){e.warTargets?.clear();e.warMode=false;if(e.warCombat){e.warCombat=false;e.target=null;e.state='search';e.decisionTimer=0;}}
  this.warRolls.clear();this.warDamage.clear();this.warCycle=-1;
 }
 activeWar(e){return this.enabled&&this.phase.id==='war'&&!!e.warTargets?.size;}
 startWar(owner,target,reason='declaration'){
  if(!this.enabled||this.phase.id!=='war'||owner===target||!owner.alive||!target.alive)return false;
  owner.warTargets??=new Set();if(owner.warTargets.has(target))return false;
  owner.warTargets.add(target);owner.warMode=true;owner.decisionTimer=0;
  // A peace link cannot block a declared war, including same-color apex conflicts.
  if(owner.companionGroup&&owner.companionGroup===target.companionGroup)this.game.allyLinks.leave(owner,'war');
  this.game.abilities.endCommand(owner,'war');
  this.log({type:'war-start',owner:owner.id,target:target.id,reason});return true;
 }
 updateWars(){
  if(this.phase.id!=='war'){if(this.warCycle!==-1)this.clearWars();return;}
  if(this.warCycle!==this.cycle){this.clearWars();this.warCycle=this.cycle;}
  const apex=this.game.entities.filter(e=>e.alive&&e.apex);
  for(const e of apex){if(this.warRolls.has(e.id))continue;const rivals=apex.filter(t=>t!==e);if(!rivals.length)continue;
   this.warRolls.add(e.id);if(random('ai')<(this.game.balance.era.warEntryChance??.8))this.startWar(e,rivals[Math.floor(random('ai')*rivals.length)]);
  }
 }
 warTarget(e){return this.activeWar(e)?[...e.warTargets].filter(t=>t.alive).sort((a,b)=>dist(e,a)-dist(e,b)||a.id-b.id)[0]??null:null;}
 warDecision(e){
  const target=this.warTarget(e);if(!target)return false;
  e.guardMode=false;e.warCombat=true;e.warMode=true;e.target=target;e.recovering=false;
  e.state=e.hp/e.maxHp<=(this.game.balance.era.warFleeHpRatio??.1)?'flee':'chase_fight';return true;
 }
 observeWarDamage(attacker,target,lost,options={}){
  if(!attacker||!this.activeWar(attacker)||!attacker.warTargets.has(target)||options.kind==='field'&&!options.skillToken)return;
  const key=`${attacker.id}:${target.id}`,ratio=(this.warDamage.get(key)??0)+lost/Math.max(1,target.maxHp);this.warDamage.set(key,ratio);
  if(ratio+1e-9>=(this.game.balance.era.warRetaliationDamageRatio??.2))this.startWar(target,attacker,'damage-threshold');
 }
 reward(field){
  const g=this.game,w=g.balance.world,room=Math.max(0,g.balance.spawning.maxOrbCount-g.entities.filter(e=>e.alive&&e.behavior==='orb').length);
  for(let i=0;i<Math.min(12,room);i++){const angle=random('world')*Math.PI*2,d=field.radius*(1.1+random('world')*.2);const orb=spawnOrb(g.balance,{x:Math.max(0,Math.min(w.worldWidth,field.x+Math.cos(angle)*d)),y:Math.max(0,Math.min(w.worldHeight,field.y+Math.sin(angle)*d))});orb.growthValue*=2;orb.regionReward='apocalypse';g.entities.push(orb);}
 }
 fronts(){
  if(!this.enabled||this.phase.id!=='war')return [];
  const w=this.game.balance.world,radius=Math.min(w.worldWidth,w.worldHeight)*.04;
  return this.game.balance.colors.map((color,index)=>{const angle=index*Math.PI*2/5;return {x:w.worldWidth/2+Math.cos(angle)*radius,y:w.worldHeight/2+Math.sin(angle)*radius,color:color.color,id:color.id,alive:true};});
 }
 warDestination(e){
  if(!this.enabled||this.phase.id!=='war'||!(e.role==='predator'||e.role==='forager'&&e.personality==='growth')||!e.attackUnlocked||e.recovering)return null;
  const point=this.fronts().find(p=>p.id===e.color)??this.fronts()[0];return {x:point.x,y:point.y,alive:true};
 }
 observeDuels(){
  const now=this.game.gameTime,live=new Map();
  for(const e of this.game.entities){const target=e.challengeTarget;if(e.alive&&e.role==='predator'&&!e.apex&&e.state==='chase_fight'&&target?.alive&&target.apex)live.set(`${e.id}:${target.id}`,{challenger:e,target});}
  for(const [key,d]of this.duels)if(!live.has(key)){const record={...d,time:now,endedAt:now,seconds:now-d.since,type:'end'};this.recordDuel(record);this.duelEnds++;this.duels.delete(key);}
  for(const [key,pair]of live)if(!this.duels.has(key)){const d={challengerId:pair.challenger.id,targetId:pair.target.id,challengerName:pair.challenger.displayName,targetName:pair.target.displayName,since:now};this.duels.set(key,d);this.recordDuel({...d,time:now,type:'start'});this.duelStarts++;}
 }
 recordDuel(event){this.recentDuels.unshift(event);if(this.recentDuels.length>16)this.recentDuels.pop();}
 status(){return this.enabled?`${this.phase.name} · ${Math.ceil(this.remaining)}s${this.activeWar(this.game.player)?` · 전쟁 상대 ${this.game.player.warTargets.size}명`:''}`:'시기 OFF';}
 draw(ctx,zoom){
  ctx.save();
  for(const p of this.fronts()){
   const s=14/zoom;ctx.strokeStyle=p.color;ctx.fillStyle=p.color;ctx.lineWidth=2/zoom;
   ctx.beginPath();ctx.arc(p.x,p.y,25/zoom,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.moveTo(p.x-s/2,p.y+s);ctx.lineTo(p.x-s/2,p.y-s);ctx.lineTo(p.x+s,p.y-s/2);ctx.lineTo(p.x-s/2,p.y);ctx.stroke();
   ctx.font=`bold ${12/zoom}px system-ui`;ctx.textAlign='center';ctx.fillText('전선',p.x,p.y+40/zoom);
  }ctx.restore();
  const field=this.apocalypse;if(field){ctx.save();ctx.beginPath();ctx.arc(field.x,field.y,field.radius,0,Math.PI*2);ctx.fillStyle=field.active?'rgba(220,38,38,.3)':'rgba(245,158,11,.13)';ctx.fill();ctx.strokeStyle=field.active?'#ef4444':'#fbbf24';ctx.lineWidth=3/zoom;ctx.setLineDash(field.active?[]:[10/zoom,6/zoom]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#fde68a';ctx.font=`bold ${16/zoom}px system-ui`;ctx.textAlign='center';ctx.fillText(field.active?'파멸 · 위험':`파멸 전조 · ${Math.max(0,Math.ceil(field.activeAt-this.game.gameTime))}s`,field.x,field.y-field.radius-15/zoom);ctx.restore();}
  if(!this.game.showAILabels)return;ctx.save();ctx.strokeStyle='rgba(251,191,36,.75)';ctx.lineWidth=1.5/zoom;ctx.setLineDash([6/zoom,5/zoom]);
  for(const d of this.duels.values()){const a=this.game.entities.find(e=>e.id===d.challengerId),b=this.game.entities.find(e=>e.id===d.targetId);if(!a||!b)continue;ctx.beginPath();ctx.moveTo(a.x,a.y);const image=near(a,b);ctx.lineTo(image.x,image.y);ctx.stroke();}ctx.restore();
 }
}
