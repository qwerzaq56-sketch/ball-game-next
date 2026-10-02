export class RunMetrics {
 constructor(){this.samples=[];this.seconds=0;this.timer=0;this.attackStarts=0;this.attacksByColor={};this.attackStates=new Map();this.autoSeconds=0;}
 observe(game,dt){
  this.seconds+=dt;if(game.autoplay.enabled)this.autoSeconds+=dt;
  const units=game.entities.filter(e=>e.alive&&e.behavior!=='orb'),ids=new Set(units.map(e=>e.id));
  for(const e of units){if(e.attackState==='TELEGRAPH'&&this.attackStates.get(e.id)!=='TELEGRAPH'){this.attackStarts++;this.attacksByColor[e.color]=(this.attacksByColor[e.color]??0)+1;}this.attackStates.set(e.id,e.attackState);}
  for(const id of this.attackStates.keys())if(!ids.has(id))this.attackStates.delete(id);
  this.timer+=dt;if(this.timer<1-1e-8)return;this.timer=Math.max(0,this.timer-1);
  const p=game.player;this.samples.push({time:+game.gameTime.toFixed(3),score:p.score,size:p.size,hp:p.hp,maxHp:p.maxHp,defeats:p.defeatSerial??0,maxAISize:Math.max(0,...units.filter(e=>e.behavior==='ai').map(e=>e.size)),liveAI:units.filter(e=>e.behavior==='ai').length,apex:units.filter(e=>e.apex).length,roles:{prey:units.filter(e=>e.role==='prey').length,forager:units.filter(e=>e.role==='forager').length,predator:units.filter(e=>e.role==='predator').length},companionGroups:game.allyLinks.groups.size,region:game.biomes.status(p),era:game.era.phase.id,relicPickups:game.relics.pickups,attackStarts:this.attackStarts,autoplay:game.autoplay.enabled});if(this.samples.length>600)this.samples.shift();
 }
 export(game){return {format:'ball-next-observation-v1',seed:game.seed,config:JSON.parse(JSON.stringify(game.balance)),policy:{autoplay:game.autoplay.policy,autoSeconds:this.autoSeconds,lifePolicy:'normal gameplay; no replenishment'},observedSeconds:this.seconds,attackStarts:this.attackStarts,attacksByColor:{...this.attacksByColor},samples:this.samples.map(s=>({...s,roles:{...s.roles}})),apex:JSON.parse(JSON.stringify(game.apexHistory.summary(game.gameTime))),eraEvents:game.era.events.map(e=>({...e})),current:game.snapshot()};}
}
