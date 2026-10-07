// Display targets are derived from the current threshold configuration, never from score.
import {computeMaxStack} from './entity.js';
export function nextSkillGoal(player,balance) {
  const all=[],goals=[];
  for(const [key,name]of [['attack','공격'],['dodge','회피']]) {
    const thresholds=balance.skills[`${key}StackThresholds`],current=computeMaxStack(player.size,thresholds);
    all.push(...thresholds.filter(t=>t.maxStack>0).map(t=>t.size));
    const next=thresholds.filter(t=>t.size>player.size&&t.maxStack>current).sort((a,b)=>a.size-b.size)[0];
    if(next)goals.push({...next,label:current===0?`${name} 해금`:`${name} ${next.maxStack}스택`});
  }
  const unlock=balance.abilitySkills?.unlockSize??100;all.push(unlock);if(!player.apex&&player.size<unlock)goals.push({size:unlock,label:'E 스킬 해금'});
  goals.sort((a,b)=>a.size-b.size);
  if(!goals.length)return {label:player.apex?'최상위 · 스킬 해금 완료':(balance.ecology?.maxApex===0?'E 해금 완료 · 최상위 직위 OFF':`E 해금 완료 · R은 크기 100/상위 ${balance.ecology?.maxApex??5}위`),fraction:1,size:null};
  const size=goals[0].size,from=Math.min(player.size,Math.max(player.baseSize,...all.filter(n=>n<=player.size)));
  return {label:`다음 ${goals.filter(g=>g.size===size).map(g=>g.label).join(' · ')} · 크기 ${Number(size.toFixed(1))}`,size,fraction:Math.max(0,Math.min(1,(player.size-from)/Math.max(1e-8,size-from)))};
}
