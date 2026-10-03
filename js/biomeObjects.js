import {BIOME_OBJECTS,objectPreset} from './biomeObjectCatalog.js';
import {dist} from './collision.js';import {spawnOrb} from './spawning.js';import {applyDamage} from './combat.js';
export class BiomeObjects{
 constructor(game){this.game=game;this.objects=[];this.cooldowns=new Map();this.signature='';this.events=[];}
 sync(){const preset=objectPreset(this.game.balance),signature=JSON.stringify(preset);if(signature===this.signature)return;this.signature=signature;this.objects=[];
  for(const id of preset.enabled){const cfg={...BIOME_OBJECTS[id],...preset.overrides[id]},tiles=this.game.biomes.tiles.filter(t=>t.region.id===cfg.region);if(!tiles.length)continue;let hash=(this.game.seed>>>0);for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
   for(let i=0;i<preset.countPerType;i++){const t=tiles[(hash+i*137)%tiles.length];this.objects.push({id:`${id}:${i}`,candidate:id,config:cfg,x:t.x+100,y:t.y+100,_world:this.game.balance.world});}
  }
 }
 update(){if(!this.game.biomes.enabled)return;this.sync();const g=this.game,now=g.gameTime,maxRadius=g.entities.reduce((m,e)=>e.alive&&e.behavior!=='orb'?Math.max(m,e.size/2):m,0);
  for(const o of this.objects){if((this.cooldowns.get(o.id)??0)>now)continue;const c=o.config,actors=g.getNearbyEntities(o,c.radius+maxRadius).filter(e=>e.alive&&['player','ai'].includes(e.behavior)&&dist(o,e)<=c.radius+e.size/2).sort((a,b)=>dist(o,a)-dist(o,b)||a.id-b.id),e=actors.find(e=>c.effect!=='heal'||e.hp<e.maxHp);if(!e)continue;
   this.cooldowns.set(o.id,now+c.cooldown);
   if(c.effect==='food'){let capacity=Math.max(0,g.balance.spawning.maxOrbCount-g.entities.filter(e=>e.alive&&e.behavior==='orb').length);for(let i=0;i<c.count&&capacity>0;i++,capacity--){const orb=spawnOrb(g.balance,{x:o.x+Math.cos(i*2*Math.PI/c.count)*35,y:o.y+Math.sin(i*2*Math.PI/c.count)*35});orb.growthValue=c.growth*(g.biomes.blizzard()?(c.blizzardMultiplier??1):1);orb.regionReward=c.region;g.entities.push(orb);}}
   if(c.effect==='heal')e.hp=Math.min(e.maxHp,e.hp+e.maxHp*c.power);
   if(c.effect==='shield'){e.shieldHp=Math.max(e.shieldHp??0,e.maxHp*c.power);e.shieldRemaining=Math.max(e.shieldRemaining??0,c.duration);}
   if(c.effect==='speed'){e.objectSpeedUntil=now+c.duration;e.objectSpeedMultiplier=1+c.power;if(c.hpCost)applyDamage(e,e.maxHp*c.hpCost,g,null,g.balance,{kind:'field',ignoreDefense:true,knockback:false});}
   if(c.effect==='frost'){e.objectFrostUntil=now+c.duration;e.objectFrostResistance=c.power;}
   g.spawnFloatingText(o.x,o.y,c.name,'#bae6fd');this.events.push({time:now,id:o.id,actor:e.id,effect:c.effect});if(this.events.length>200)this.events.shift();
  }
 }
 draw(ctx,zoom){if(!this.game.biomes.enabled)return;this.sync();const camera=this.game.renderCamera??this.game.camera;for(const o of this.objects){if(Math.abs(o.x-camera.x)>this.game.canvas.width/2/zoom+120||Math.abs(o.y-camera.y)>this.game.canvas.height/2/zoom+120)continue;const c=o.config,ready=(this.cooldowns.get(o.id)??0)<=this.game.gameTime;ctx.save();ctx.globalAlpha=ready?.85:.35;ctx.beginPath();ctx.arc(o.x,o.y,c.radius,0,Math.PI*2);ctx.fillStyle='#10233488';ctx.fill();ctx.strokeStyle={food:'#86efac',heal:'#67e8f9',shield:'#facc15',speed:'#fb923c',frost:'#e0f2fe'}[c.effect];ctx.lineWidth=2/zoom;ctx.stroke();ctx.beginPath();ctx.moveTo(o.x,o.y-18);ctx.lineTo(o.x+16,o.y);ctx.lineTo(o.x,o.y+18);ctx.lineTo(o.x-16,o.y);ctx.closePath();ctx.stroke();ctx.font=`${11/zoom}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#e2e8f0';ctx.fillText(c.name,o.x,o.y-c.radius-7/zoom);ctx.restore();}}
}
