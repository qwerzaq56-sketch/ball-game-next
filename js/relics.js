import {dist} from './collision.js';
import {random} from './random.js';
export const RELIC_KINDS={combat:{name:'전투 유물',color:'#fb7185',description:'공격 +10%'},growth:{name:'성장 유물',color:'#4ade80',description:'먹이 성장 +20%'},regen:{name:'회복 유물',color:'#7dd3fc',description:'재생 +25%'}};
export class Relics {
 constructor(game){
  this.game=game;this.enabled=game.balance.relics?.enabled!==false;this.items=[];this.timer=60;this.nextId=1;this.pickups=0;
  const w=game.balance.world,r=Math.min(w.worldWidth,w.worldHeight)*.09;
  if(this.enabled&&game.biomes.enabled)game.biomes.regions.push({id:'grassland',name:'초원',x:w.worldWidth*.38,y:w.worldHeight*.5,radius:r,color:'#4a6834',reward:1.25},{id:'desert',name:'사막',x:w.worldWidth*.62,y:w.worldHeight*.5,radius:r,color:'#9a7541',reward:1.5});
  for(const region of game.biomes.regions)Object.defineProperty(region,'_world',{value:w});
 }
 effect(e){return e.relic&&e.relic.expires>this.game.gameTime?e.relic:null;}
 damageBonus(e){return this.effect(e)?.kind==='combat'?.1:0;}
 growthMultiplier(e){return this.effect(e)?.kind==='growth'?1.2:1;}
 regenMultiplier(e){return this.effect(e)?.kind==='regen'?1.25:1;}
 release(e){e.relic=null;}
 spawn(){
  if(!this.enabled||this.items.filter(e=>e.alive).length>=3)return null;
  const w=this.game.balance.world,region=this.game.biomes.regions.find(r=>r.id==='desert')??{x:w.worldWidth*.62,y:w.worldHeight*.5,radius:Math.min(w.worldWidth,w.worldHeight)*.09};
  const angle=random('world')*Math.PI*2,d=region.radius*(.2+random('world')*.45),kind=Object.keys(RELIC_KINDS)[Math.floor(random('world')*3)];
  const item={id:`relic-${this.nextId++}`,x:region.x+Math.cos(angle)*d,y:region.y+Math.sin(angle)*d,size:24,behavior:'relic',kind,expires:this.game.gameTime+90,alive:true};Object.defineProperty(item,'_world',{value:w});this.items.push(item);return item;
 }
 update(dt){
  if(!this.enabled)return;const now=this.game.gameTime;
  for(const e of this.game.entities)if(e.relic&&(e.relic.expires<=now||!e.alive))this.release(e);
  for(const item of this.items)if(item.expires<=now)item.alive=false;
  this.items=this.items.filter(item=>item.alive);
  this.timer-=dt;if(this.timer<=0){this.timer+=60;this.spawn();}
  for(const item of this.items){const units=this.game.entities.filter(e=>e.alive&&(e.behavior==='player'||e.behavior==='ai')&&dist(e,item)<=(e.size+item.size)/2).sort((a,b)=>dist(a,item)-dist(b,item)||a.id-b.id);
   const owner=units[0];if(!owner)continue;item.alive=false;owner.relic={kind:item.kind,expires:now+60};this.pickups++;this.game.spawnFloatingText(owner.x,owner.y-owner.size/2-30,RELIC_KINDS[item.kind].name,RELIC_KINDS[item.kind].color);
  }
  this.items=this.items.filter(e=>e.alive);
 }
 desired(e,safe){
  if(!this.enabled||this.effect(e)&&e.relic.expires-this.game.gameTime>10)return null;
  return this.items.filter(item=>item.alive&&dist(item,e)<=this.game.biomes.sensingRange(e)&&safe(item)).sort((a,b)=>dist(a,e)-dist(b,e)||a.id.localeCompare(b.id))[0]??null;
 }
 label(e){const effect=this.effect(e);return effect?`${RELIC_KINDS[effect.kind].name} · ${RELIC_KINDS[effect.kind].description} · ${Math.ceil(effect.expires-this.game.gameTime)}s`:'';}
 draw(ctx,zoom){
  ctx.save();for(const item of this.items){const kind=RELIC_KINDS[item.kind];ctx.beginPath();for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,r=(i%2?7:16)/Math.max(.6,zoom);const x=item.x+Math.cos(angle)*r,y=item.y+Math.sin(angle)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle=kind.color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1/zoom;ctx.stroke();ctx.font=`bold ${12/zoom}px system-ui`;ctx.fillStyle='#e2e8f0';ctx.textAlign='center';ctx.fillText(kind.name,item.x,item.y-22/zoom);}
  for(const e of this.game.entities){const effect=this.effect(e);if(!e.alive||!effect)continue;ctx.beginPath();ctx.arc(e.x,e.y,e.size/2+8/zoom,0,Math.PI*2);ctx.strokeStyle=RELIC_KINDS[effect.kind].color;ctx.lineWidth=2/zoom;ctx.setLineDash([4/zoom,4/zoom]);ctx.stroke();ctx.setLineDash([]);}ctx.restore();
 }
}
