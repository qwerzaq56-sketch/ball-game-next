import {canStartAttack,canStartDodge} from './combat.js?ai-pressure-01';
const clamp=value=>Math.max(0,Math.min(1,value));
// Read-only feedback shares combat's availability predicates.
export function touchActionFeedback(game,kind){
 const p=game.player,b=game.balance,special=kind==='special'||kind==='ultimate',slot=kind==='ultimate'?'R':'E',attack=kind==='attack';
 const action=special?slot:attack?'공격':'회피';
 const unlocked=special?game.abilities.unlocked(p,slot):attack?p.attackUnlocked:p.dodgeUnlocked;
 const count=special?null:attack?p.attackStack:p.dodgeStack;
 const max=special?null:attack?p.attackMaxStack:p.dodgeMaxStack;
 const progress=special?0:count>=max?1:clamp((attack?p.attackStackTimer:p.dodgeStackTimer)/(attack?b.attack.attackCooldown:b.dodge.dodgeCooldown));
 let state='ready',label=action;
 if(!unlocked){state='locked';const at=(attack?b.skills.attackStackThresholds:b.skills.dodgeStackThresholds).find(t=>t.maxStack>0)?.size;label=special?(slot==='R'?'최상위\nR 해금':`크기 ${b.abilitySkills?.unlockSize??100}\nE 해금`):`크기 ${at}\n${action} 해금`;}
 else if(p.frozen>0){state='frozen';label='빙결 중';}
 else if(special&&p.specialCast){state='busy';label=`${slot} 시전 중`;}
 else if(special&&game.abilities.cooldown(p,slot)>0){state='cooldown';label=`${slot} ${Math.ceil(game.abilities.cooldown(p,slot))}s`;}
 else if(!special&&count<=0){state='cooldown';label=attack?'충전 중\n공격':'회피 충전';}
 else if(!(special?game.abilities.canCast(p,slot):attack?canStartAttack(p):canStartDodge(p))){state='busy';label='행동 중';}
 if((game.paused||game.gameOver)&&state==='ready')state='paused';
 return {state,label,disabled:state!=='ready'||game.paused||game.gameOver,charges:unlocked&&!special?`${count}/${max}`:'',progress,action};
}
