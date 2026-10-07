import {near} from './topology.js';
import {dist} from './collision.js';
import {applyDamage} from './combat.js?forest-composition-01';
import {spawnOrb} from './spawning.js';
import {random} from './random.js';
export const ERA_PHASES=[{id:'abundance',name:'영양기',end:180,encounter:30,line:'땅이 숨을 쉽니다'},{id:'competition',name:'경쟁기',end:360,encounter:45,line:'영역이 겹치기 시작합니다'},{id:'war',name:'전쟁기',end:480,encounter:45,line:'최상위가 서로를 노립니다'},{id:'decline',name:'쇠퇴기',end:540,encounter:60,line:'세계가 식어 갑니다, 하늘을 보세요'}];
// R-WORLD-013 (2026-10-08): the decline-phase doom is a falling meteor. A growing shadow warns, the impact hits once
// (strongest at the centre), the crater burns, then shards (growth food) lie on its rim and a cooled mark stays a while.
export const METEOR={warnSeconds:6,burnSeconds:8,impactRadius:300,craterRadius:240,impactCenter:.3,impactEdge:.1,burnTick:.08,markSeconds:60,shakeSeconds:.3};
export class Era {
 constructor(game){this.game=game;this.enabled=game.balance.era?.enabled!==false;this.phase=ERA_PHASES[0];this.cycle=0;this.remaining=180;this.apocalypse=null;this.apocalypseCycle=-1;this.apocalypseTick=0;this.craters=[];this.duels=new Map();this.recentDuels=[];this.duelStarts=0;this.duelEnds=0;this.completedApocalypses=0;this.events=[];this.warRolls=new Set();this.warDamage=new Map();this.warCycle=-1;if(this.enabled)game.biomes.encounterTimer=30;}
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
   const M=this.meteor(),radius=Math.min(M.impactRadius,Math.min(w.worldWidth,w.worldHeight)*.06),crater=radius*M.craterRadius/M.impactRadius;
   // radius is the current danger area (AI flee, respawn, minimap): the impact area until the hit, then the crater.
   this.apocalypse={id:`apocalypse-${this.cycle}`,name:'운석 낙하',kind:'meteor',x:w.worldWidth/2+Math.cos(angle)*d,y:w.worldHeight/2+Math.sin(angle)*d,radius,impactRadius:radius,craterRadius:crater,hotRadius:radius,starts:time,activeAt:time+M.warnSeconds,ends:time+M.warnSeconds+M.burnSeconds,active:false,impacted:false};this.apocalypseTick=0;this.log({type:'apocalypse-warning',cycle:this.cycle});
  }
  this.craters=this.craters.filter(c=>c.until>time);
  const field=this.apocalypse;if(!field)return;
  const M=this.meteor();
  field.active=time>=field.activeAt;
  if(field.active&&!field.impacted)this.impact(field,M);
  const used=Math.max(0,Math.min(time,field.ends)-Math.max(time-dt,field.activeAt));
  this.apocalypseTick+=used;while(this.apocalypseTick>=.5-1e-8){this.apocalypseTick-=.5;for(const e of this.game.entities)if(e.alive&&e.behavior!=='orb'&&dist(e,field)<field.craterRadius)applyDamage(e,e.maxHp*M.burnTick,this.game,null,this.game.balance,{kind:'field',knockback:false,ignoreDefense:true});}
  if(time>=field.ends){this.reward(field);this.craters.push({x:field.x,y:field.y,radius:field.craterRadius,until:time+M.markSeconds});this.completedApocalypses++;this.log({type:'apocalypse-end',cycle:this.cycle});this.apocalypse=null;}
 }
 meteor(){return {...METEOR,...(this.game.balance.era?.meteor??{})};}
 // Like other environmental damage it ignores size defense, so the shares below are shares of max HP.
 // One hit on landing: impactCenter of max HP at the centre down to impactEdge at the rim. Shakes the screen if the player is near.
 impact(field,M){
  field.impacted=true;field.radius=field.hotRadius=field.craterRadius;
  const g=this.game;let hit=0;
  for(const e of g.entities){if(!e.alive||e.behavior==='orb')continue;const d=dist(e,field);if(d>=field.impactRadius)continue;
   applyDamage(e,e.maxHp*(M.impactCenter+(M.impactEdge-M.impactCenter)*d/field.impactRadius),g,null,g.balance,{kind:'field',knockback:false,ignoreDefense:true});hit++;}
  const p=g.player,reach=field.impactRadius*4,d=p?.alive?dist(p,field):Infinity;
  if(d<reach)g.screenShake={until:g.gameTime+M.shakeSeconds,seconds:M.shakeSeconds,power:Math.max(.35,1-d/reach)};
  this.log({type:'meteor-impact',cycle:this.cycle,hit});
 }
 clearWars(){
  for(const e of this.game.entities){e.warTargets?.clear();e.warMode=false;if(e.warCombat){e.warCombat=false;e.target=null;e.state='search';e.decisionTimer=0;}}
  this.warRolls.clear();this.warDamage.clear();this.warCycle=-1;
 }
 activeWar(e){return this.enabled&&this.phase.id==='war'&&!!e.warTargets?.size;}
 startWar(owner,target,reason='declaration'){
  // R-WORLD-012 (2026-10-08): same-color apexes never declare or retaliate war on each other.
  if(!this.enabled||this.phase.id!=='war'||owner===target||!owner.alive||!target.alive||owner.color===target.color)return false;
  owner.warTargets??=new Set();if(owner.warTargets.has(target))return false;
  owner.warTargets.add(target);owner.warMode=true;owner.decisionTimer=0;
  // A mixed-color peace link cannot block a declared war.
  if(owner.companionGroup&&owner.companionGroup===target.companionGroup)this.game.allyLinks.leave(owner,'war');
  this.game.abilities.endCommand(owner,'war');
  this.log({type:'war-start',owner:owner.id,target:target.id,reason});return true;
 }
 updateWars(){
  if(this.phase.id!=='war'){if(this.warCycle!==-1)this.clearWars();return;}
  if(this.warCycle!==this.cycle){this.clearWars();this.warCycle=this.cycle;}
  const apex=this.game.entities.filter(e=>e.alive&&e.apex);
  for(const e of apex){if(this.warRolls.has(e.id))continue;const rivals=apex.filter(t=>t!==e&&t.color!==e.color);if(!rivals.length)continue;
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
 drawMeteor(ctx,zoom){
  const now=this.game.gameTime,disc=(x,y,r,fill)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();};
  ctx.save();
  // Cooled craters stay as a dark mark for a while.
  for(const c of this.craters){const a=Math.min(1,(c.until-now)/10);ctx.globalAlpha=.55*a;disc(c.x,c.y,c.radius,'#2a1d17');ctx.globalAlpha=.8*a;ctx.strokeStyle='#57534e';ctx.lineWidth=6/zoom;ctx.stroke();}
  ctx.globalAlpha=1;
  const f=this.apocalypse;
  if(f&&!f.active){
   const p=Math.max(0,Math.min(1,(now-f.starts)/Math.max(.001,f.activeAt-f.starts)));
   ctx.beginPath();ctx.arc(f.x,f.y,f.impactRadius,0,Math.PI*2);ctx.fillStyle='rgba(245,158,11,.08)';ctx.fill();ctx.strokeStyle='rgba(251,191,36,.75)';ctx.lineWidth=3/zoom;ctx.setLineDash([12/zoom,8/zoom]);ctx.stroke();ctx.setLineDash([]);
   disc(f.x,f.y,f.impactRadius*(.15+.85*p),`rgba(0,0,0,${.22+.28*p})`); // the shadow grows as the meteor comes down
   const k=Math.pow(1-p,1.6),dx=-.6,dy=-.8,off=f.impactRadius*6*k,mx=f.x+dx*off,my=f.y+dy*off,body=f.impactRadius*(.08+.06*p),tail=body*(5+6*(1-p));
   ctx.lineCap='round';for(const [w,c] of [[body*1.8,'rgba(249,115,22,.35)'],[body*1.1,'rgba(253,224,71,.7)']]){ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(mx+dx*tail,my+dy*tail);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
   disc(mx,my,body,'#78350f');disc(mx-body*.25,my-body*.25,body*.55,'#b45309');
   ctx.fillStyle='#fde68a';ctx.font=`bold ${16/zoom}px system-ui`;ctx.textAlign='center';ctx.fillText(`운석 낙하 · ${Math.max(0,Math.ceil(f.activeAt-now))}s`,f.x,f.y-f.impactRadius-15/zoom);
  }else if(f){
   const t=(now-f.activeAt)/.6;
   if(t<1){ctx.beginPath();ctx.arc(f.x,f.y,f.impactRadius*(.4+.9*t),0,Math.PI*2);ctx.strokeStyle=`rgba(255,255,255,${1-t})`;ctx.lineWidth=10*(1-t)/zoom+2/zoom;ctx.stroke();disc(f.x,f.y,f.impactRadius*(1-t*.6),`rgba(255,247,237,${.5*(1-t)})`);}
   const flicker=.8+.2*Math.sin(now*12);
   ctx.globalAlpha=flicker;disc(f.x,f.y,f.craterRadius,'rgba(127,29,29,.55)');disc(f.x,f.y,f.craterRadius*.72,'rgba(234,88,12,.5)');disc(f.x,f.y,f.craterRadius*.38,'rgba(253,224,71,.45)');ctx.globalAlpha=1;
   ctx.beginPath();ctx.arc(f.x,f.y,f.craterRadius,0,Math.PI*2);ctx.strokeStyle='#ef4444';ctx.lineWidth=4/zoom;ctx.stroke();
   ctx.fillStyle='#fecaca';ctx.font=`bold ${16/zoom}px system-ui`;ctx.textAlign='center';ctx.fillText(`운석구 · 위험 ${Math.max(0,Math.ceil(f.ends-now))}s`,f.x,f.y-f.craterRadius-15/zoom);
  }
  ctx.restore();
 }
 // Screen-space arrow at the edge pointing to an off-screen meteor, with its countdown.
 drawOffscreen(ctx){
  const f=this.apocalypse,g=this.game;if(!f||!g.canvas)return;
  const {width,height}=g.canvas,s=g.worldToScreen(f.x,f.y),r=(f.active?f.craterRadius:f.impactRadius)*g.camera.zoom;
  if(s.x+r>0&&s.x-r<width&&s.y+r>0&&s.y-r<height)return;
  const cx=width/2,cy=height/2,dx=s.x-cx,dy=s.y-cy,m=44,edge=Math.min((cx-m)/Math.max(1e-6,Math.abs(dx)),(cy-m)/Math.max(1e-6,Math.abs(dy))),a=Math.atan2(dy,dx);
  // Slide inward along the same direction until clear of HUD panels (the same rects name labels avoid).
  const rects=g.ui?.overlayRects??[],clear=(x,y)=>!rects.some(r=>x-44<r.right&&x+44>r.left&&y-38<r.bottom&&y+38>r.top);
  let x=cx+dx*edge,y=cy+dy*edge;for(let i=1;i<=20&&!clear(x,y);i++){x=cx+dx*edge*(1-i*.04);y=cy+dy*edge*(1-i*.04);}
  const text=f.active?`운석구 ${Math.max(0,Math.ceil(f.ends-g.gameTime))}s`:`운석 ${Math.max(0,Math.ceil(f.activeAt-g.gameTime))}s`;
  ctx.save();ctx.translate(x,y);ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-8,-11);ctx.lineTo(-8,11);ctx.closePath();ctx.fillStyle=f.active?'#ef4444':'#f59e0b';ctx.fill();ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';const ty=y<cy?24:-24,w=ctx.measureText(text).width+10;ctx.fillStyle='rgba(10,15,24,.85)';ctx.fillRect(-w/2,ty-9,w,18);ctx.fillStyle='#fde68a';ctx.fillText(text,0,ty);ctx.restore();
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
  this.drawMeteor(ctx,zoom);
  if(!this.game.showAILabels)return;ctx.save();ctx.strokeStyle='rgba(251,191,36,.75)';ctx.lineWidth=1.5/zoom;ctx.setLineDash([6/zoom,5/zoom]);
  for(const d of this.duels.values()){const a=this.game.entities.find(e=>e.id===d.challengerId),b=this.game.entities.find(e=>e.id===d.targetId);if(!a||!b)continue;ctx.beginPath();ctx.moveTo(a.x,a.y);const image=near(a,b);ctx.lineTo(image.x,image.y);ctx.stroke();}ctx.restore();
 }
}
