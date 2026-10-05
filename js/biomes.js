export function terrainDamageMultiplier(size,balance){return 1/(1+Math.max(0,size-40)/(balance.biomes.terrainDefenseScale??200));}
export function lavaResistance(e,balance){const c=balance.biomes;return e.color==='red'?Math.min(Math.max(0,c.maxRedLavaResistance??.85),.95,Math.max(0,e.size*(c.redLavaResistancePerSize??0))):0;}
import {delta,angleTo,wrap} from './topology.js';
import {TerrainArt} from './terrainArt.js?forest-composition-01';
import {dist} from './collision.js';
import { boundCenter } from './worldBounds.js';
import {random} from './random.js';
import {spawnOrb} from './spawning.js';
import {applyDamage} from './combat.js?forest-composition-01';
// The 124-world-unit dark bank remains the exact existing lava corridor.
// Uneven inner color planes and sparse molten seams replace the road-like
// yellow center dashes without changing river points, collision or randomness.
export function drawLavaSurface(ctx,rivers,time=0){
 const chains=[];let chain=[];
 for(const point of rivers){if(chain.length&&dist(chain.at(-1),point)>110){chains.push(chain);chain=[];}chain.push(point);}if(chain.length)chains.push(chain);
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);
 const closed=(points,color)=>{ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 for(const points of chains){
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.strokeStyle='#8b3a2c';ctx.lineWidth=124;ctx.stroke();
  if(points.length===1){for(const [radius,color]of [[62,'#8b3a2c'],[52,'#ca5833']]){ctx.beginPath();ctx.arc(points[0].x,points[0].y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}continue;}
  const left=[],right=[];
  for(let i=0;i<points.length;i++){
   const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],angle=Math.atan2(b.y-a.y,b.x-a.x),nx=-Math.sin(angle),ny=Math.cos(angle);
   const width=49+Math.sin(p.x*.017+p.y*.009)*6,drift=Math.sin(p.x*.011-p.y*.014)*4;
   left.push({x:p.x+nx*(width+drift),y:p.y+ny*(width+drift)});right.push({x:p.x-nx*(width-drift),y:p.y-ny*(width-drift)});
  }
  closed([...left,...right.reverse()],'#ce5934');
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)continue;
   const nx=-dy/len,ny=dx/len,phase=(Math.sin(a.x*.021+a.y*.013)*.5+.5),side=Math.sin(a.x*.01-a.y*.02)*21;
   const at=(t,offset)=>({x:a.x+dx*t+nx*offset,y:a.y+dy*t+ny*offset});
   // Off-center rust islands make broad, irregular molten planes, not stripes.
   if(i%2===0)closed([at(.12,side-12),at(.42,side-20),at(.83,side-5),at(.64,side+8),at(.2,side+5)],'#a84630');
   if(phase>.38){const t=.14+((time*.045+phase)%1)*.25;closed([at(t,side-3),at(t+.18,side-7),at(t+.55,side+1),at(t+.23,side+5)],'#e78a48');}
  }
 }
 ctx.restore();
}
export class Biomes {
 constructor(game){
  this.game=game;this.terrainArt=new TerrainArt();this.enabled=game.balance.biomes?.enabled!==false;this.encounterTimer=45;this.damageTimer=0;this.encounters=0;this.sandstorms=[];this.sandstormTimer=5;
  const w=game.balance.world,r=Math.min(w.worldWidth,w.worldHeight)*.22;
  this.regions=this.enabled?[
   {id:'forest',name:'숲',x:w.worldWidth*.22,y:w.worldHeight*.22,radius:r,color:'#205c3b',reward:1.25},
   {id:'lake',name:'호수',x:w.worldWidth*.78,y:w.worldHeight*.22,radius:r,color:'#164e72',reward:1.5},
   {id:'snow',name:'설원',x:w.worldWidth*.22,y:w.worldHeight*.78,radius:r,color:'#5c718a',reward:1.75},
   {id:'volcano',name:'화산',x:w.worldWidth*.78,y:w.worldHeight*.78,radius:r,color:'#79352b',reward:2,hotRadius:60},
   {id:'grassland',name:'초원',x:w.worldWidth*.5,y:w.worldHeight*.5,radius:r,color:'#4a6834',reward:1.25},
   {id:'desert',name:'사막',x:w.worldWidth*.62,y:w.worldHeight*.5,radius:r,color:'#9a7541',reward:1.5}
  ]:[];
  for(const region of this.regions)Object.defineProperty(region,'_world',{value:w});
  this.phase=((game.seed>>>0)%997)/997*Math.PI*2;this.tile=200;this.tiles=[];this.cells=new Map();this.rivers=[];this.snowEvent=-1;
  for(let y=0;y<w.worldHeight;y+=this.tile)for(let x=0;x<w.worldWidth;x+=this.tile){
   const region=this.classify({x:x+this.tile/2,y:y+this.tile/2});
   if(region){this.tiles.push({x,y,region});this.cells.set(`${x}:${y}`,region);}
  }
  this.labels=this.regions.map(region=>{const own=this.tiles.filter(t=>t.region===region),inner=own.filter(t=>[-200,0,200].every(dx=>[-200,0,200].every(dy=>this.regionAt({x:t.x+100+dx,y:t.y+100+dy})===region)));const tile=(inner.length?inner:own).sort((a,b)=>dist({x:a.x+100,y:a.y+100,_world:w},region)-dist({x:b.x+100,y:b.y+100,_world:w},region))[0];return {...region,x:tile?tile.x+100:region.x,y:tile?tile.y+100:region.y};});
  const volcano=this.regions.find(r=>r.id==='volcano');
  if(volcano)for(let offset=-volcano.radius*.9;offset<=volcano.radius*.9;offset+=70){
    const x=volcano.x+offset,y=volcano.y+Math.sin(offset/420)*320+Math.sin(offset/170)*65;
    if(this.regionAt({x,y})?.id==='volcano'){const point={id:'lava-river',x,y,hotRadius:62};Object.defineProperty(point,'_world',{value:w});this.rivers.push(point);}
  }
 }
 classify(e){
  if(!this.enabled)return null;const w=this.game.balance.world;
  const x=wrap(e.x,w.worldWidth),y=wrap(e.y,w.worldHeight);
  const warpX=280*Math.sin(y/w.worldHeight*Math.PI*6+this.phase)+170*Math.sin(x/w.worldWidth*Math.PI*10+this.phase);
  const warpY=260*Math.sin(x/w.worldWidth*Math.PI*6+this.phase)+140*Math.sin(y/w.worldHeight*Math.PI*8+this.phase);
  const point={x:x+warpX,y:y+warpY};let best=null,score=Infinity;
  for(const r of this.regions){if(r.id==='grassland')continue;const d=delta(point,r,w);const value=Math.max(Math.abs(d.x),Math.abs(d.y))+.24*Math.min(Math.abs(d.x),Math.abs(d.y));if(value<r.radius&&value<score){best=r;score=value;}}
  return best??this.regions.find(r=>r.id==='grassland');
 }
 regionAt(e){const w=this.game.balance.world,x=Math.floor(wrap(e.x,w.worldWidth)/this.tile)*this.tile,y=Math.floor(wrap(e.y,w.worldHeight)/this.tile)*this.tile;return this.cells.get(`${x}:${y}`)??this.classify({x:x+this.tile/2,y:y+this.tile/2});}
 sample(region){
  const cells=this.tiles.filter(t=>t.region.id===region.id);if(!cells.length)return {x:region.x,y:region.y};
  const cell=cells[Math.floor(random('world')*cells.length)];
  return {x:cell.x+20+random('world')*(this.tile-40),y:cell.y+20+random('world')*(this.tile-40)};
 }
 lavaAt(e,padding=0){
  for(let i=0;i<this.rivers.length;i++){const a=this.rivers[i];if(dist(e,a)<=a.hotRadius+padding)return a;const b=this.rivers[i+1];if(!b||dist(a,b)>110)continue;const d=delta(a,b),p=delta(a,e,this.game.balance.world),l=d.x*d.x+d.y*d.y,t=l?Math.max(0,Math.min(1,(p.x*d.x+p.y*d.y)/l)):0;
   if(Math.hypot(p.x-t*d.x,p.y-t*d.y)<=a.hotRadius+padding)return a;
  }return null;
 }
 sandstormAt(e){return this.enabled?this.sandstorms.find(f=>dist(f,e)<=f.radius)??null:null;}
 defenseBonus(e){return e.color==='yellow'&&this.sandstormAt(e)?(this.game.balance.biomes.yellowSandstormDefenseBonus??.25):0;}
 updateSandstorms(dt){
  const c=this.game.balance.biomes,w=this.game.balance.world;
  for(const f of this.sandstorms){f.remaining-=dt;f.x=wrap(f.x+f.vx*dt,w.worldWidth);f.y=wrap(f.y+f.vy*dt,w.worldHeight);}
  this.sandstorms=this.sandstorms.filter(f=>f.remaining>0);this.sandstormTimer-=dt;
  if(this.sandstormTimer<=0){this.sandstormTimer=(c.sandstormSpawnMin??5)+random('world')*((c.sandstormSpawnMax??10)-(c.sandstormSpawnMin??5));
   const desert=this.regions.find(r=>r.id==='desert');if(desert&&this.sandstorms.length<(c.sandstormMaxCount??3)){const point=this.sample(desert),angle=random('world')*Math.PI*2,radius=(c.sandstormRadiusMin??160)+random('world')*((c.sandstormRadiusMax??260)-(c.sandstormRadiusMin??160)),speed=c.sandstormSpeed??45;
    this.sandstorms.push({...point,id:`sandstorm-${this.game.gameTime}`,kind:'sandstorm',name:'모래바람',_world:w,radius,hotRadius:radius,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,remaining:(c.sandstormDurationMin??12)+random('world')*((c.sandstormDurationMax??20)-(c.sandstormDurationMin??12))});}
  }
 }
 moveMultiplier(e){return this.enabled&&this.regionAt(e)?.id==='lake'?(e.color==='blue'?(this.game.balance.biomes.blueWaterMoveMultiplier??.9):(this.game.balance.biomes.waterMoveMultiplier??.65)):1;}
 frostResistance(e){const c=this.game.balance.biomes;return Math.min(.85,(this.game.biomeObjects?.inFrostShelter(e)?Math.max(0,...this.game.biomeObjects.objects.filter(o=>o.config.effect==='frost'&&dist(o,e)<=o.config.radius+e.size/2).map(o=>o.config.power)):0)+(e.color==='cyan'?(c.cyanFrostResistance??.65):0)+Math.min(c.frostSizeResistanceCap??.15,Math.max(0,e.size-40)*(c.frostSizeResistancePerSize??.00025)));}
 blizzard(){return this.enabled&&this.game.gameTime%24>=16;}
 playerSightRadius(){return this.regionAt(this.game.player)?.id==='snow'&&this.blizzard()?this.game.balance.ai.detectionRange*.65+Math.max(0,this.game.player.size-40)*.65:Infinity;}
 playerCanSee(e){return e===this.game.player||dist(this.game.player,e)-(e.size??0)/2<=this.playerSightRadius()*2;}
 drawBlizzardOverlay(ctx){
  const radius=this.playerSightRadius();if(!Number.isFinite(radius))return;const g=this.game,p=g.worldToScreen(g.player.x,g.player.y),r=radius*g.camera.zoom;
  // Quarter-resolution resampling softens the surroundings without a full-screen blur filter.
  this.fogCanvas??=document.createElement('canvas');const layer=this.fogCanvas,scale=.25;
  const width=Math.ceil(g.canvas.width*scale),height=Math.ceil(g.canvas.height*scale);
  if(layer.width!==width||layer.height!==height){layer.width=width;layer.height=height;}
  const c=layer.getContext('2d');c.clearRect(0,0,width,height);c.drawImage(g.canvas,0,0,width,height);
  c.globalCompositeOperation='destination-in';const mask=c.createRadialGradient(p.x*scale,p.y*scale,r*.4*scale,p.x*scale,p.y*scale,r*2*scale);mask.addColorStop(0,'transparent');mask.addColorStop(.35,'white');mask.addColorStop(1,'white');c.fillStyle=mask;c.fillRect(0,0,width,height);c.globalCompositeOperation='source-over';
  const fog=ctx.createRadialGradient(p.x,p.y,r*.4,p.x,p.y,r*2);fog.addColorStop(0,'rgba(224,235,247,0)');fog.addColorStop(.35,'rgba(224,235,247,.18)');fog.addColorStop(.75,'rgba(148,169,190,.48)');fog.addColorStop(1,'rgba(39,55,71,.88)');
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(layer,0,0,g.canvas.width,g.canvas.height);ctx.fillStyle=fog;ctx.fillRect(0,0,g.canvas.width,g.canvas.height);ctx.restore();
 }
 sensingRange(e,base=this.game.balance.ai.detectionRange){return this.regionAt(e)?.id==='snow'&&this.blizzard()?base*.65:base;}
 hazards(){return [...this.rivers,...this.sandstorms,...(this.game.era?.apocalypse?[this.game.era.apocalypse]:[])];}
 danger(e,held=false){return this.hazards().find(r=>(r.kind!=='sandstorm'||e.color!=='yellow')&&r.hotRadius&&dist(e,r)<=r.hotRadius+e.size/2+(held?120:80))??null;}
 update(dt){
  this.game.audio?.updateBlizzard?.(this.enabled&&this.blizzard()&&this.regionAt(this.game.player)?.id==='snow'&&this.game.player.alive&&!this.game.gameOver);
  if(!this.enabled)return;
  const c=this.game.balance.biomes;this.updateSandstorms(dt);this.game.biomeObjects?.sync();
  for(const e of this.game.entities){if(!e.alive||e.behavior==='orb')continue;
   const cold=this.blizzard()&&this.regionAt(e)?.id==='snow',resistance=this.frostResistance(e);
   // R-WORLD-004: capped buildup gauge, hysteresis until fully recovered.
   const sheltered=this.game.biomeObjects?.inFrostShelter(e)??false,limit=c.frostExposureSeconds??6;e.frostbiteRemaining??=0;
   e.frostExposure=Math.max(0,Math.min(limit,(e.frostExposure??0)+(cold&&!sheltered?dt*(1-resistance*.5):-dt*(sheltered?(c.shelterRecoveryPerSecond??4):(c.frostRecoveryPerSecond??2)))));
   if(sheltered||e.frostExposure<=0)e.frostbiteRemaining=0;
   else if(e.frostExposure>=limit)e.frostbiteRemaining=1;

  }
  this.damageTimer+=dt;this.encounterTimer-=dt;
  const cycle=Math.floor(this.game.gameTime/24);
  if(this.blizzard()&&cycle!==this.snowEvent){this.snowEvent=cycle;
    const snow=this.regions.find(r=>r.id==='snow');let slots=Math.max(0,this.game.balance.spawning.maxOrbCount-this.game.entities.filter(e=>e.alive&&e.behavior==='orb').length);
    for(let i=0;i<12&&slots>0;i++,slots--){const orb=spawnOrb(this.game.balance,this.sample(snow));orb.growthValue=Math.round(orb.growthValue*2);orb.regionReward='snow';this.game.entities.push(orb);}
    if(this.regionAt(this.game.player)?.id==='snow')this.game.spawnFloatingText(this.game.player.x,this.game.player.y-100,'눈보라 · 얼음꽃 개화','#e0f2fe');
  }
  while(this.damageTimer>=.5-1e-8){this.damageTimer-=.5;
   for(const e of this.game.entities){if(!e.alive||e.behavior==='orb')continue;
    if(e.frostbiteRemaining>0)applyDamage(e,e.maxHp*(c.frostTickHpFraction??.0125),this.game,null,this.game.balance,{kind:'field',knockback:false,ignoreDefense:true,postDefenseMultiplier:1-this.frostResistance(e)});
    if(this.sandstormAt(e)){const resistance=e.color==='yellow'?(c.yellowSandstormResistance??.8):0;applyDamage(e,e.maxHp*(c.sandstormTickHpFraction??.025),this.game,null,this.game.balance,{kind:'field',knockback:false,ignoreDefense:true,postDefenseMultiplier:(1-resistance)*terrainDamageMultiplier(e.size,this.game.balance)});}
    const hot=this.lavaAt(e,e.size/2);
    if(hot){const resistance=lavaResistance(e,this.game.balance),beforeRatio=e.damageHpRatio??0;applyDamage(e,e.maxHp*.16,this.game,null,this.game.balance,{kind:'field',knockback:false,postDefenseMultiplier:(1-resistance)*terrainDamageMultiplier(e.size,this.game.balance)});const log=this.game.lavaLog??=([]);const entry={time:this.game.gameTime,size:e.size,color:e.color,region:'volcano',resistance,hpRatio:(e.damageHpRatio??0)-beforeRatio};log.push(entry);this.game.balanceLog?.lava.push(entry);if(log.length>1000)log.shift();}
   }
  }
  if(this.encounterTimer<=0){this.encounterTimer+=this.game.era?.encounterInterval??45;this.spawnEncounter();}
 }
 spawnEncounter(){
  const g=this.game,w=g.balance.world;let remaining=Math.max(0,g.balance.spawning.maxOrbCount-g.entities.filter(e=>e.alive&&e.behavior==='orb').length);
  const ordered=this.regions.map((_,i)=>this.regions[(i+this.encounters)%this.regions.length]);
  for(const r of ordered)for(let i=0;i<8&&remaining>0;i++,remaining--){
   const point=this.sample(r);if(this.lavaAt(point,30)){remaining++;continue;}
   const orb=spawnOrb(g.balance,point);
   orb.growthValue=Math.round(orb.growthValue*r.reward);orb.regionReward=r.id;g.entities.push(orb);
  }
  this.encounters++;
 }
 routePoint(e,target){
  if(!target)return target;
  const {x:dx,y:dy}=delta(e,target),length=dx*dx+dy*dy;if(!length)return target;
  for(const r of this.hazards()){if(r.kind==='sandstorm'&&e.color==='yellow')continue;const safety=r.hotRadius+e.size/2+80;
   const relative=delta(e,r),t=Math.max(0,Math.min(1,(relative.x*dx+relative.y*dy)/length));
   if(Math.hypot(dx*t-relative.x,dy*t-relative.y)>=safety||dist(e,r)>safety+220)continue;
   const angle=angleTo(r,e),side=e.environmentRoute?.region===r.id?e.environmentRoute.side:Math.sign(Math.sin(Math.atan2(dy,dx)-angle))||((e.id%2)?1:-1);
   e.environmentRoute={region:r.id,side};const turn=angle+side*Math.PI/3,distance=safety+140;
   const w=this.game.balance.world;
   return {x:boundCenter(r.x+Math.cos(turn)*distance,e.size,w.worldWidth,w.wrap),y:boundCenter(r.y+Math.sin(turn)*distance,e.size,w.worldHeight,w.wrap),alive:true};
  }
  e.environmentRoute=null;return target;
 }
 status(e){const r=this.regionAt(e);if(!r)return '평원';return r.name+(this.sandstormAt(e)?e.color==='yellow'?' · 모래바람 · 방어 +25%':' · 모래바람':'')+(e.frostbiteRemaining>0?' · 동상':'')+(r.id==='lake'?' · 물속':'')+(r.id==='snow'&&this.blizzard()?' · 눈보라 · 얼음꽃':this.lavaAt(e,e.size/2)?' · 용암 강 위험':'');}
 draw(ctx,zoom){
  if(!this.enabled)return;const camera=this.game.renderCamera??this.game.camera;
  const halfW=this.game.canvas.width/zoom/2,halfH=this.game.canvas.height/zoom/2,time=this.game.gameTime;
  ctx.save();
  for(const tile of this.tiles){
   if(tile.x+this.tile<camera.x-halfW||tile.x>camera.x+halfW||tile.y+this.tile<camera.y-halfH||tile.y>camera.y+halfH)continue;
   const r=tile.region,painted=this.terrainArt.drawTile(ctx,tile,this);
   if(!painted){ctx.fillStyle=r.color+'88';ctx.fillRect(tile.x,tile.y,this.tile,this.tile);}
   if(r.id==='snow'&&this.blizzard()){ctx.fillStyle='rgba(224,242,254,.22)';ctx.fillRect(tile.x,tile.y,this.tile,this.tile);ctx.strokeStyle='rgba(240,249,255,.65)';ctx.lineWidth=1.5/zoom;
    for(let i=0;i<5;i++){const x=tile.x+24+(i*37)%150,y=tile.y+25+(i*61)%150;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();}}

   if(!painted){ctx.strokeStyle=r.id==='snow'?'rgba(235,248,255,.45)':r.color;ctx.lineWidth=1.5/zoom;
   for(let i=0;i<3;i++){const x=tile.x+32+i*57,y=tile.y+40+(i*53)%130;ctx.beginPath();
    if(r.id==='forest'){ctx.moveTo(x-12,y+15);ctx.lineTo(x,y-17);ctx.lineTo(x+12,y+15);}
    else if(r.id==='lake'){ctx.arc(x,y,18,0,Math.PI);}
    else {ctx.moveTo(x-9,y+5);ctx.lineTo(x,y-6);ctx.lineTo(x+9,y+5);}ctx.stroke();
   }}
  }
  if(this.rivers.length)drawLavaSurface(ctx,this.rivers,time);
  for(const f of this.sandstorms){ctx.save();ctx.beginPath();ctx.arc(f.x,f.y,f.radius,0,Math.PI*2);ctx.fillStyle='rgba(234,179,8,.14)';ctx.fill();ctx.strokeStyle='rgba(253,224,71,.65)';ctx.lineWidth=2/zoom;ctx.setLineDash([16/zoom,10/zoom]);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(f.x,f.y,f.radius*(.35+i*.2),time*.8+i,time*.8+i+Math.PI*1.25);ctx.stroke();}ctx.font=`bold ${12/zoom}px system-ui`;ctx.fillStyle='#fde68a';ctx.textAlign='center';ctx.fillText(`모래바람 ${Math.ceil(f.remaining)}s`,f.x,f.y-f.radius-10/zoom);ctx.restore();}
  for(const r of this.labels){ctx.fillStyle='#e2e8f0';ctx.font=`bold ${Math.min(20/zoom,60)}px system-ui`;ctx.textAlign='center';ctx.fillText(r.name+(r.id==='snow'&&this.blizzard()?' · 눈보라':''),r.x,r.y);}
  ctx.restore();
 }
}
