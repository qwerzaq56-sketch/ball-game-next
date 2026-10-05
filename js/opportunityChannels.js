import {dist,isHostile,canAbsorb} from './collision.js';
import {sizeFromGrowth,growthRewardFor} from './entity.js';
import {absorptionGrowthFor} from './absorption.js';
import {attackDamageForEntity,applyDefense,attackChargeDurationForSize,attackTelegraphTimeForSize} from './combat.js?art-release-01';
import {minimumDeathDropGrowth} from './spawning.js';
// Potential rewards assume successful interaction and full collection, never probability.
export function assessOpportunityChannels(game,p,nearby,needed,foodGrowth,threats,fields,environment){
 const b=game.balance,gain=g=>Math.max(0,sizeFromGrowth(p.growth+growthRewardFor(g,p,b),p.baseSize,b.growth.growthToSizeRatio,b.growth)-p.size),foodGain=gain(foodGrowth*(game.relics?.growthMultiplier(p)??1));
 const safe=(target,ignored)=>!game.biomes.danger(target)&&!fields.some(f=>dist(target,f)<=(f.radius??360))&&threats.every(t=>t===ignored||dist(target,t)>160);
 let absorptionGain=0,huntGain=0,huntEstimatedSeconds=null,absorptionTargets=0,huntTargets=0;
 if(!environment&&!fields.length&&!p.beingAbsorbedByRef&&p.hp/p.maxHp>.3)for(const t of nearby){
  if(t.behavior==='orb'||t.summoned&&!t.summoned.absorbable)continue;
  if(canAbsorb(p,t)&&safe(t,null)){const amount=gain(absorptionGrowthFor(p,t,b));absorptionTargets++;absorptionGain=Math.max(absorptionGain,amount);}
  if(!t.summoned&&isHostile(p,t)&&p.attackUnlocked&&p.hp/p.maxHp>=.6&&t.size<=p.size*.9&&safe(t,t)){
   const kr=b.killReward,direct=kr.baseReward*Math.pow(t.size/kr.referenceSize,kr.growthExponent)*kr.growthRewardMultiplier,reward=direct+minimumDeathDropGrowth(t,b)*(game.relics?.growthMultiplier(p)??1),amount=gain(reward),damage=applyDefense(attackDamageForEntity(p,b)*(game.abilities?.damageMultiplier(p)??1),t.size,b,game.abilities?.defenseMultiplier(t)??1),hits=Math.ceil(t.hp/Math.max(1,damage)),cycle=Math.max(p.behavior==='player'?b.attack.attackCooldown:b.ai.attackCooldown,attackChargeDurationForSize(p.size,b)+attackTelegraphTimeForSize(p.size,b)+b.attack.attackRecoveryTime);
   huntTargets++;if(amount>huntGain){huntGain=amount;huntEstimatedSeconds=hits*cycle;}
  }
 }
 const rewards={food:foodGain,absorption:absorptionGain,hunt:huntGain},best=Object.entries(rewards).sort((a,b)=>b[1]-a[1])[0];
 return {food:foodGain>=needed,absorption:absorptionGain>=needed,hunt:huntGain>=needed,any:best[1]>=needed,foodGain,absorptionGain,huntGain,huntEstimatedSeconds,absorptionTargets,huntTargets,bestKind:best[1]>=needed?best[0]:'none',potentialGain:best[1]};
}
export function realizedGrowthWindow(samples,current,seconds=5){
 const duration=Number.isFinite(seconds)&&seconds>0?seconds:5,cutoff=current.time-duration;
 let base=null;for(let i=samples.length-1;i>=0;i--){const s=samples[i];if(s.defeats!==current.defeats)break;if(s.time<=cutoff+1e-8){base=s;break;}}
 if(!base)return {measured:false,seconds:null,gain:null,sufficient:null};const elapsed=current.time-base.time,gain=current.size-base.size;
 return {measured:true,seconds:elapsed,gain,sufficient:gain>=current.growthNeeded};
}
