// R-COMBAT-003: Space (and the touch dodge button) dodges on a short press and sprints once held this long.
export const SPRINT_HOLD_SECONDS=.18;
// The touch dodge button is Space: holding it still past the threshold sprints instead of dodging.
// A drag aims a dodge and never sprints; before sprint unlocks a long press still dodges.
export function dodgeButtonSprints({heldSeconds=0,dragged=false,sprintUnlocked=false}={}){return sprintUnlocked&&!dragged&&heldSeconds>=SPRINT_HOLD_SECONDS;}
// Separate stamina avoids consuming a newly regenerated dodge charge.
export function updateSprint(e,dt,balance,{held=false,moving=false}={}){
 const c=balance.sprint??{},capacity=c.capacitySeconds??3;
 e.sprintGauge=Math.max(0,Math.min(capacity,e.sprintGauge??capacity));
 const unlocked=e.size>=(c.unlockSize??150);e.sprintUnlocked=unlocked;
 if(!held)e.sprintExhausted=false;
 e.sprinting=unlocked&&held&&moving&&e.attackState==='READY'&&e.dodgeState!=='DODGING'&&!e.frozen&&!e.sprintExhausted&&e.sprintGauge>0;
 if(e.sprinting){e.sprintGauge=Math.max(0,e.sprintGauge-dt);if(e.sprintGauge===0)e.sprintExhausted=true;}
 else if(!held)e.sprintGauge=Math.min(capacity,e.sprintGauge+dt*(c.recoveryPerSecond??.6));
 return e.sprinting?(c.speedMultiplier??2.1):1;
}
