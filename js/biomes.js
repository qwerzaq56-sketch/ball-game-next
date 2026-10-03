import {delta,angleTo,wrap} from './topology.js';
import {dist} from './collision.js';
import { boundCenter } from './worldBounds.js';
import {random} from './random.js';
import {spawnOrb} from './spawning.js';
import {applyDamage} from './combat.js';
export class Biomes {
 constructor(game){
  this.game=game;this.enabled=game.balance.biomes?.enabled!==false;this.encounterTimer=45;this.damageTimer=0;this.encounters=0;
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
 blizzard(){return this.enabled&&this.game.gameTime%24>=16;}
 playerSightRadius(){return this.regionAt(this.game.player)?.id==='snow'&&this.blizzard()?Math.max(this.game.player.size/2+40,this.game.balance.ai.detectionRange*.65):Infinity;}
 playerCanSee(e){return e===this.game.player||dist(this.game.player,e)-(e.size??0)/2<=this.playerSightRadius();}
 drawBlizzardOverlay(ctx){
  const radius=this.playerSightRadius();if(!Number.isFinite(radius))return;const g=this.game,p=g.worldToScreen(g.player.x,g.player.y),r=radius*g.camera.zoom;
  const fog=ctx.createRadialGradient(p.x,p.y,r*.65,p.x,p.y,r);fog.addColorStop(0,'rgba(224,235,247,.03)');fog.addColorStop(.75,'rgba(148,169,190,.16)');fog.addColorStop(1,'#273747');
  ctx.save();ctx.fillStyle=fog;ctx.fillRect(0,0,g.canvas.width,g.canvas.height);ctx.restore();
 }
 sensingRange(e,base=this.game.balance.ai.detectionRange){return this.regionAt(e)?.id==='snow'&&this.blizzard()?base*.65:base;}
 hazards(){return [...this.rivers,...(this.game.era?.apocalypse?[this.game.era.apocalypse]:[])];}
 danger(e,held=false){return this.hazards().find(r=>r.hotRadius&&dist(e,r)<=r.hotRadius+e.size/2+(held?120:80))??null;}
 update(dt){
  if(!this.enabled)return;this.damageTimer+=dt;this.encounterTimer-=dt;
  const cycle=Math.floor(this.game.gameTime/24);
  if(this.blizzard()&&cycle!==this.snowEvent){this.snowEvent=cycle;
    const snow=this.regions.find(r=>r.id==='snow');let slots=Math.max(0,this.game.balance.spawning.maxOrbCount-this.game.entities.filter(e=>e.alive&&e.behavior==='orb').length);
    for(let i=0;i<12&&slots>0;i++,slots--){const orb=spawnOrb(this.game.balance,this.sample(snow));orb.growthValue=Math.round(orb.growthValue*2);orb.regionReward='snow';this.game.entities.push(orb);}
    if(this.regionAt(this.game.player)?.id==='snow')this.game.spawnFloatingText(this.game.player.x,this.game.player.y-100,'눈보라 · 얼음꽃 개화','#e0f2fe');
  }
  while(this.damageTimer>=.5-1e-8){this.damageTimer-=.5;
   for(const e of this.game.entities){if(!e.alive||e.behavior==='orb')continue;
    const hot=this.lavaAt(e);
    if(hot)applyDamage(e,e.maxHp*.16,this.game,null,this.game.balance,{kind:'field',knockback:false});
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
  for(const r of this.hazards()){const safety=r.hotRadius+e.size/2+80;
   const relative=delta(e,r),t=Math.max(0,Math.min(1,(relative.x*dx+relative.y*dy)/length));
   if(Math.hypot(dx*t-relative.x,dy*t-relative.y)>=safety||dist(e,r)>safety+220)continue;
   const angle=angleTo(r,e),side=e.environmentRoute?.region===r.id?e.environmentRoute.side:Math.sign(Math.sin(Math.atan2(dy,dx)-angle))||((e.id%2)?1:-1);
   e.environmentRoute={region:r.id,side};const turn=angle+side*Math.PI/3,distance=safety+140;
   const w=this.game.balance.world;
   return {x:boundCenter(r.x+Math.cos(turn)*distance,e.size,w.worldWidth,w.wrap),y:boundCenter(r.y+Math.sin(turn)*distance,e.size,w.worldHeight,w.wrap),alive:true};
  }
  e.environmentRoute=null;return target;
 }
 status(e){const r=this.regionAt(e);if(!r)return '평원';return r.name+(r.id==='snow'&&this.blizzard()?' · 눈보라 · 얼음꽃':this.lavaAt(e)?' · 용암 강 위험':'');}
 draw(ctx,zoom){
  if(!this.enabled)return;const camera=this.game.renderCamera??this.game.camera;
  const halfW=this.game.canvas.width/zoom/2,halfH=this.game.canvas.height/zoom/2,time=this.game.gameTime;
  ctx.save();
  for(const tile of this.tiles){
   if(tile.x+this.tile<camera.x-halfW||tile.x>camera.x+halfW||tile.y+this.tile<camera.y-halfH||tile.y>camera.y+halfH)continue;
   const r=tile.region;ctx.fillStyle=r.color+'88';ctx.fillRect(tile.x,tile.y,this.tile,this.tile);
   ctx.strokeStyle=r.id==='snow'?'rgba(235,248,255,.45)':r.color;ctx.lineWidth=1.5/zoom;
   for(let i=0;i<3;i++){const x=tile.x+32+i*57,y=tile.y+40+(i*53)%130;ctx.beginPath();
    if(r.id==='forest'){ctx.moveTo(x-12,y+15);ctx.lineTo(x,y-17);ctx.lineTo(x+12,y+15);}
    else if(r.id==='lake'){ctx.arc(x,y,18,0,Math.PI);}
    else {ctx.moveTo(x-9,y+5);ctx.lineTo(x,y-6);ctx.lineTo(x+9,y+5);}ctx.stroke();
   }
  }
  if(this.rivers.length){
   const path=()=>{ctx.beginPath();let previous=null;for(const h of this.rivers){if(!previous||dist(previous,h)>110)ctx.moveTo(h.x,h.y);else ctx.lineTo(h.x,h.y);previous=h;}};
   ctx.lineCap='round';ctx.lineJoin='round';path();ctx.strokeStyle='#b63420';ctx.lineWidth=124;ctx.stroke();
   path();ctx.strokeStyle='#f97316';ctx.lineWidth=86;ctx.stroke();
   path();ctx.strokeStyle='#ffcc68';ctx.lineWidth=20;ctx.setLineDash([32,60]);ctx.lineDashOffset=-time*90;ctx.stroke();ctx.setLineDash([]);
  }
  for(const r of this.labels){ctx.fillStyle='#e2e8f0';ctx.font=`bold ${Math.min(20/zoom,60)}px system-ui`;ctx.textAlign='center';ctx.fillText(r.name,r.x,r.y);}
  ctx.restore();
 }
}
