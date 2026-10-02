import {random} from './random.js';
import {spawnOrb} from './spawning.js';
import {applyDamage} from './combat.js';
export class Biomes {
 constructor(game){
  this.game=game;this.enabled=game.balance.biomes?.enabled!==false;this.encounterTimer=45;this.damageTimer=0;this.encounters=0;
  const w=game.balance.world,r=Math.min(650,Math.min(w.worldWidth,w.worldHeight)*.13);
  this.regions=this.enabled?[
   {id:'forest',name:'숲',x:w.worldWidth*.22,y:w.worldHeight*.22,radius:r,color:'#205c3b',reward:1.25},
   {id:'lake',name:'호수',x:w.worldWidth*.78,y:w.worldHeight*.22,radius:r,color:'#164e72',reward:1.5},
   {id:'snow',name:'설원',x:w.worldWidth*.22,y:w.worldHeight*.78,radius:r,color:'#5c718a',reward:1.75},
   {id:'volcano',name:'화산',x:w.worldWidth*.78,y:w.worldHeight*.78,radius:r,color:'#79352b',reward:2,hotRadius:r*.37}
  ]:[];
 }
 regionAt(e){return this.regions.find(r=>Math.hypot(e.x-r.x,e.y-r.y)<=r.radius)??null;}
 blizzard(){return this.enabled&&this.game.gameTime%24>=16;}
 sensingRange(e,base=this.game.balance.ai.detectionRange){return this.regionAt(e)?.id==='snow'&&this.blizzard()?base*.65:base;}
 hazards(){return [...this.regions.filter(r=>r.hotRadius),...(this.game.era?.apocalypse?[this.game.era.apocalypse]:[])];}
 danger(e,held=false){return this.hazards().find(r=>r.hotRadius&&Math.hypot(e.x-r.x,e.y-r.y)<=r.hotRadius+e.size/2+(held?120:80))??null;}
 update(dt){
  if(!this.enabled)return;this.damageTimer+=dt;this.encounterTimer-=dt;
  while(this.damageTimer>=.5-1e-8){this.damageTimer-=.5;
   for(const e of this.game.entities){if(!e.alive||e.behavior==='orb')continue;
    const hot=this.regions.find(r=>r.hotRadius&&Math.hypot(e.x-r.x,e.y-r.y)<r.hotRadius);
    if(hot)applyDamage(e,e.maxHp*.16,this.game,null,this.game.balance,{kind:'field',knockback:false});
   }
  }
  if(this.encounterTimer<=0){this.encounterTimer+=this.game.era?.encounterInterval??45;this.spawnEncounter();}
 }
 spawnEncounter(){
  const g=this.game,w=g.balance.world;let remaining=Math.max(0,g.balance.spawning.maxOrbCount-g.entities.filter(e=>e.alive&&e.behavior==='orb').length);
  const ordered=this.regions.map((_,i)=>this.regions[(i+this.encounters)%this.regions.length]);
  for(const r of ordered)for(let i=0;i<8&&remaining>0;i++,remaining--){
   const angle=random('world')*Math.PI*2,d=r.radius*(.55+random('world')*.3);
   const orb=spawnOrb(g.balance,{x:Math.max(0,Math.min(w.worldWidth,r.x+Math.cos(angle)*d)),y:Math.max(0,Math.min(w.worldHeight,r.y+Math.sin(angle)*d))});
   orb.growthValue=Math.round(orb.growthValue*r.reward);orb.regionReward=r.id;g.entities.push(orb);
  }
  this.encounters++;
 }
 routePoint(e,target){
  if(!target)return target;
  const dx=target.x-e.x,dy=target.y-e.y,length=dx*dx+dy*dy;if(!length)return target;
  for(const r of this.hazards()){const safety=r.hotRadius+e.size/2+80;
   const t=Math.max(0,Math.min(1,((r.x-e.x)*dx+(r.y-e.y)*dy)/length));
   if(Math.hypot(e.x+dx*t-r.x,e.y+dy*t-r.y)>=safety||Math.hypot(e.x-r.x,e.y-r.y)>safety+220)continue;
   const angle=Math.atan2(e.y-r.y,e.x-r.x),side=e.environmentRoute?.region===r.id?e.environmentRoute.side:Math.sign(Math.sin(Math.atan2(dy,dx)-angle))||((e.id%2)?1:-1);
   e.environmentRoute={region:r.id,side};const turn=angle+side*Math.PI/3,distance=safety+140;
   const w=this.game.balance.world,margin=Math.min(e.size/2,Math.min(w.worldWidth,w.worldHeight)/2);
   return {x:Math.max(margin,Math.min(w.worldWidth-margin,r.x+Math.cos(turn)*distance)),y:Math.max(margin,Math.min(w.worldHeight-margin,r.y+Math.sin(turn)*distance)),alive:true};
  }
  e.environmentRoute=null;return target;
 }
 status(e){const r=this.regionAt(e);if(!r)return '평원';return r.name+(r.id==='snow'&&this.blizzard()?' · 눈보라':r.hotRadius&&Math.hypot(e.x-r.x,e.y-r.y)<r.hotRadius?' · 마그마 위험':'');}
 draw(ctx,zoom){
  if(!this.enabled)return;ctx.save();ctx.beginPath();ctx.rect(0,0,this.game.balance.world.worldWidth,this.game.balance.world.worldHeight);ctx.clip();
  for(const r of this.regions){ctx.beginPath();ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);ctx.fillStyle=r.color+'55';ctx.fill();ctx.strokeStyle=r.color;ctx.lineWidth=2/zoom;ctx.stroke();
   if(r.hotRadius){ctx.beginPath();ctx.arc(r.x,r.y,r.hotRadius,0,Math.PI*2);ctx.fillStyle='rgba(239,68,36,.45)';ctx.fill();ctx.strokeStyle='#fb923c';ctx.lineWidth=3/zoom;ctx.stroke();}
   ctx.fillStyle=r.id==='snow'&&this.blizzard()?'#fff':'#b9d5cd';ctx.font=`bold ${20/zoom}px system-ui`;ctx.textAlign='center';ctx.fillText(r.name+(r.id==='snow'&&this.blizzard()?' · 눈보라':''),r.x,r.y-r.radius*.65);
   ctx.strokeStyle=r.id==='snow'&&this.blizzard()?'rgba(255,255,255,.45)':r.color;ctx.lineWidth=2/zoom;
   for(let i=0;i<5;i++){const x=r.x+(i-2)*r.radius*.22,y=r.y-r.radius*.18;ctx.beginPath();if(r.id==='forest'){ctx.moveTo(x-30,y+30);ctx.lineTo(x,y-35);ctx.lineTo(x+30,y+30);}else if(r.id==='lake'){ctx.arc(x,y,30,0,Math.PI);}else if(r.id==='snow'){ctx.moveTo(x-25,y+30);ctx.lineTo(x+25,y-30);}else{ctx.moveTo(x-30,y+35);ctx.lineTo(x,y-30);ctx.lineTo(x+30,y+35);}ctx.stroke();}
  }ctx.restore();
 }
}
