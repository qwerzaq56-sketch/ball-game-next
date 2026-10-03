export class RunMetrics {
 constructor(){this.samples=[];this.seconds=0;this.timer=0;this.attackStarts=0;this.attacksByColor={};this.attackStates=new Map();this.autoSeconds=0;this.byPhase={};this.titleIds=new Set();this.lastDefeats=0;this.lastPhase=null;this.countStreak=0;this.lastHolder=null;}
 observe(game,dt){
  this.seconds+=dt;if(game.autoplay.enabled)this.autoSeconds+=dt;
  const units=game.entities.filter(e=>e.alive&&e.behavior!=='orb'),ids=new Set(units.map(e=>e.id));
  const phase=game.era.enabled?game.era.phase.id:'off',titles=new Set(units.filter(e=>e.apex).map(e=>e.id)),beforeAttacks=this.attackStarts;
  for(const e of units){if(e.attackState==='TELEGRAPH'&&this.attackStates.get(e.id)!=='TELEGRAPH'){this.attackStarts++;this.attacksByColor[e.color]=(this.attacksByColor[e.color]??0)+1;}this.attackStates.set(e.id,e.attackState);}
  for(const id of this.attackStates.keys())if(!ids.has(id))this.attackStates.delete(id);
  const stats=this.byPhase[phase]??= {seconds:0,secondsByCount:{absent:0,solo:0,coexist:0},titleGains:0,titleLosses:0,attackStarts:0,playerDefeats:0,longestAbsent:0,longestSolo:0};
  stats.seconds+=dt;const count=titles.size===0?'absent':titles.size===1?'solo':'coexist';stats.secondsByCount[count]+=dt;
  for(const id of titles)if(!this.titleIds.has(id))stats.titleGains++;
  for(const id of this.titleIds)if(!titles.has(id))stats.titleLosses++;
  this.titleIds=titles;stats.attackStarts+=this.attackStarts-beforeAttacks;
  const defeats=game.player.defeatSerial??0;stats.playerDefeats+=Math.max(0,defeats-this.lastDefeats);this.lastDefeats=defeats;
  const holder=titles.size===0?'absent':titles.size===1?[...titles][0]:null;
  this.countStreak=holder!==null&&holder===this.lastHolder&&phase===this.lastPhase?this.countStreak+dt:dt;
  if(count==='absent')stats.longestAbsent=Math.max(stats.longestAbsent,this.countStreak);
  if(count==='solo')stats.longestSolo=Math.max(stats.longestSolo,this.countStreak);
  this.lastHolder=holder;this.lastPhase=phase;
  this.timer+=dt;if(this.timer<1-1e-8)return;this.timer=Math.max(0,this.timer-1);
  const p=game.player;this.samples.push({time:+game.gameTime.toFixed(3),score:p.score,size:p.size,hp:p.hp,maxHp:p.maxHp,defeats:p.defeatSerial??0,maxAISize:Math.max(0,...units.filter(e=>e.behavior==='ai').map(e=>e.size)),liveAI:units.filter(e=>e.behavior==='ai').length,apex:units.filter(e=>e.apex).length,roles:{prey:units.filter(e=>e.role==='prey').length,forager:units.filter(e=>e.role==='forager').length,predator:units.filter(e=>e.role==='predator').length},companionGroups:game.allyLinks.groups.size,region:game.biomes.status(p),era:game.era.phase.id,relicPickups:game.relics.pickups,attackStarts:this.attackStarts,autoplay:game.autoplay.enabled});if(this.samples.length>600)this.samples.shift();
 }
 export(game){return {format:'ball-next-observation-v1',seed:game.seed,playerProfile:{name:game.player.displayName,color:game.player.color},runtimeSettings:{allyAbsorptionEnabled:game.player.allyAbsorptionEnabled},config:JSON.parse(JSON.stringify(game.balance)),policy:{autoplay:game.autoplay.policy,autoSeconds:this.autoSeconds,lifePolicy:'normal gameplay; no replenishment'},observedSeconds:this.seconds,attackStarts:this.attackStarts,attacksByColor:{...this.attacksByColor},byPhase:JSON.parse(JSON.stringify(this.byPhase)),samples:this.samples.map(s=>({...s,roles:{...s.roles}})),apex:JSON.parse(JSON.stringify(game.apexHistory.summary(game.gameTime))),eraEvents:game.era.events.map(e=>({...e})),current:game.snapshot()};}
}
