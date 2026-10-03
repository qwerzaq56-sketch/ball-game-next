// Damped spring affects drawing only; collision and rewards use authoritative Size.
export function beginGrowthMotion(e){e.visualSize??=e.size;e.visualSizeVelocity??=0;}
export function updateGrowthMotion(e,dt){
 if(e.visualSize==null){e.visualSize=e.size;e.visualSizeVelocity=0;return;}
 let remaining=Math.max(0,dt);while(remaining>0){const step=Math.min(remaining,1/120);e.visualSizeVelocity+=(140*(e.size-e.visualSize)-18*(e.visualSizeVelocity??0))*step;e.visualSize+=e.visualSizeVelocity*step;remaining-=step;}
 e.visualSize=Math.max(1,Math.min(e.size*1.03,e.visualSize));
 if(Math.abs(e.visualSize-e.size)<.02&&Math.abs(e.visualSizeVelocity)<.02){e.visualSize=e.size;e.visualSizeVelocity=0;}
}
