import {assessOpportunityChannels} from './opportunityChannels.js';
import {dist,isHostile,canAbsorb,canEatOrb} from './collision.js';
import {sizeFromGrowth,growthRewardFor} from './entity.js';
import {attackDamageForEntity,applyDefense} from './combat.js';
// Read-only local opportunity assessment. No spawn/AI decisions or random calls.
export function assessGameplay(game,actor=game.player){
 const p=actor,b=game.balance,c=b.evaluation??{},range=actor===game.player?Math.min(b.ai.detectionRange,game.biomes.playerSightRadius()):game.biomes.sensingRange(actor);
 const nearby=game.getNearbyEntities(p,range).filter(e=>e.alive&&dist(p,e)<=range);
 const threats=nearby.filter(e=>e.behavior!=='orb'&&(isHostile(p,e)&&e.attackUnlocked||canAbsorb(e,p)));
 const fields=game.abilities.fields.filter(f=>isHostile(p,f.owner)&&dist(p,f)<=(f.radius??360)),environment=game.biomes.danger(p);
 const safe=orb=>!game.biomes.danger(orb)&&!fields.some(f=>dist(orb,f)<=(f.radius??360))&&threats.every(t=>dist(orb,t)>160);
 const food=nearby.filter(e=>canEatOrb(p,e,b)&&safe(e));
 const cluster=Math.max(40,Number(c.clusterRadius)||120);
 let potentialSizeGain=0,growthValue=0;
 for(const center of food){const value=food.reduce((sum,e)=>sum+(dist(center,e)<=cluster?e.growthValue:0),0);const gain=sizeFromGrowth(p.growth+growthRewardFor(value,p,b),p.baseSize,b.growth.growthToSizeRatio,b.growth)-p.size;if(gain>potentialSizeGain){potentialSizeGain=gain;growthValue=value;}}
 const needed=Math.max(0,Number.isFinite(Number(c.minimumSizeGain))?Number(c.minimumSizeGain):.5,p.size*(Number.isFinite(Number(c.minimumGrowthRatio))?Math.max(0,Number(c.minimumGrowthRatio)):.01));
 const damageRatio=Math.max(0,...threats.filter(t=>isHostile(p,t)).map(t=>applyDefense(attackDamageForEntity(t,b)*(game.abilities?.damageMultiplier(t)??1),p.size,b,game.abilities?.defenseMultiplier(p)??1)/p.maxHp));
 const sizeRatio=Math.max(0,...threats.map(t=>t.size/p.size));
 const severity=Math.min(1,Math.max(damageRatio*3,Math.max(0,sizeRatio-1)*.5,environment||fields.length?1:0));
 return {opportunityChannels:assessOpportunityChannels(game,p,nearby,needed,growthValue,threats,fields,environment),growthOpportunity:potentialSizeGain>=needed,potentialSizeGain,growthValue,growthNeeded:needed,crisis:threats.length>0||fields.length>0||!!environment,crisisSeverity:severity,riskDamageRatio:damageRatio,threatSizeRatio:sizeRatio,
  purposeful:game.autoplay.enabled&&!game.gameOver,assessmentRange:range};
}
export function evaluationSummary(samples,settings={}){
 const target=Math.max(.1,Number(settings.encounterSeconds)||5),qualified=samples.filter(s=>s.purposeful),buckets={};
 for(const s of qualified){const key=s.size<40?'20–39':s.size<80?'40–79':s.size<160?'80–159':'160+';const b=buckets[key]??={seconds:0,opportunitySeconds:0,crisisSeconds:0,potentialGain:0,severity:0};b.seconds++;b.opportunitySeconds+=s.growthOpportunity?1:0;b.crisisSeconds+=s.crisis?1:0;b.potentialGain+=s.potentialSizeGain;b.severity+=s.crisisSeverity;}
 for(const b of Object.values(buckets)){b.meanPotentialSizeGain=b.potentialGain/b.seconds;b.meanCrisisSeverity=b.severity/b.seconds;b.meanEncounterCrisisSeverity=b.crisisSeconds?b.severity/b.crisisSeconds:null;b.realizedSizeGain=0;b.realizedSeconds=0;}
 for(let i=1;i<samples.length;i++){const a=samples[i-1],s=samples[i],dt=s.time-a.time;if(!a.purposeful||!s.purposeful||a.defeats!==s.defeats||dt<=0||dt>1.5)continue;const key=a.size<40?'20–39':a.size<80?'40–79':a.size<160?'80–159':'160+';buckets[key].realizedSizeGain+=s.size-a.size;buckets[key].realizedSeconds+=dt;}
 for(const b of Object.values(buckets))b.realizedSizeGainPerSecond=b.realizedSeconds?b.realizedSizeGain/b.realizedSeconds:null;
 const intervals=field=>{
  let previous=null,active=false,wait=0,longest=0;const gaps=[];let missed=0,covered=0,windows=0;let window=[];
  for(const s of samples){
   if(!s.purposeful||previous&&(s.time-previous.time>1.5||s.defeats!==previous.defeats)){active=false;wait=0;previous=null;window=[];}
   if(!s.purposeful)continue;
   const elapsed=previous?s.time-previous.time:1;
   if(s[field]){if(!active){gaps.push(wait+(previous?elapsed:1));if(wait>target)missed++;}wait=0;}else wait+=elapsed;
   longest=Math.max(longest,wait);active=s[field];previous=s;
   window.push(s);window=window.filter(t=>s.time-t.time<target);
   if(window.length>=Math.ceil(target)){windows++;if(window.some(t=>t[field]))covered++;}
  }
  return {encounters:gaps.length,meanSeconds:gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:null,overTarget:missed,unfinishedOverTarget:wait>target,longestDrySeconds:longest,unfinishedWaitSeconds:wait,coveredWindows:covered,qualifiedWindows:windows,coverage:windows?covered/windows:null};
 };
 return {scope:'retained samples; purposeful autoplay only',targetSeconds:target,qualifiedSeconds:qualified.length,growth:intervals('growthOpportunity'),crisis:intervals('crisis'),buckets};
}
