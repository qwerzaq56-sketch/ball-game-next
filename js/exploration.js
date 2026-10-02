import { boundCenter } from './worldBounds.js';
import {random} from './random.js';

// A remembered destination changes travel, never perception. No unseen food is inspected.
export function explorationDestination(ai,game){
 const cfg=game.balance.ai,w=game.balance.world;
 if(cfg.explorationEnabled===false)return null;
 const now=game.gameTime,held=ai.explorationPoint;
 if(held&&now<held.expires&&Math.hypot(held.x-ai.x,held.y-ai.y)>40)return held;
 const angle=random('ai')*Math.PI*2,distance=Math.max(80,cfg.explorationDistance??600);
 const clamp=(v,max)=>boundCenter(v,ai.size,max);
 const candidates=Array.from({length:4},(_,i)=>{
  const direction=angle+i*Math.PI/2;
  return {x:clamp(ai.x+Math.cos(direction)*distance,w.worldWidth),y:clamp(ai.y+Math.sin(direction)*distance,w.worldHeight)};
 });
 const recent=ai.explorationRecent??[];
 const score=p=>Math.hypot(p.x-ai.x,p.y-ai.y)-recent.reduce((n,r)=>n+Math.max(0,250-Math.hypot(p.x-r.x,p.y-r.y)),0);
 candidates.sort((a,b)=>score(b)-score(a));
 const point=candidates[0];
 const seconds=ai.color==='yellow'?4+random('ai')*2:6+random('ai')*4;
 ai.wanderAngle=Math.atan2(point.y-ai.y,point.x-ai.x);ai.wanderTimer=seconds;
 ai.explorationPoint={...point,expires:now+seconds};
 ai.explorationRecent=[...recent,{x:ai.x,y:ai.y}].slice(-4);
 return ai.explorationPoint;
}
