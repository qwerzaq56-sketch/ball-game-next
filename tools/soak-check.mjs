// Active-player simulation with continuous invariants, separate from passive ecology metrics.
import assert from 'node:assert/strict';
import {createGame} from './headless.mjs';
import {canAbsorb,isHostile} from '../js/collision.js';

const seed=Number(process.argv[2]??17),seconds=Number(process.argv[3]??900),fps=Number(process.argv[4]??60);
assert(Number.isInteger(seed)&&seconds>0&&fps>=20);
const g=createGame(seed),dt=1/fps;
let groupSeconds=0,maxGroups=0,maxApex=0,checks=0,casts=0,defeats=0;
for(let frame=0;frame<seconds*fps;frame++){
 const t=frame/fps,p=g.player;
 g.input.keys=new Set([['d','s','a','w'][Math.floor(t/8)%4]]);
 g.input.mouseX=640+250*Math.cos(t*.7);g.input.mouseY=360+200*Math.sin(t*.7);
 g.input.mouseDown=true;g.input.consumeSpecial=()=>frame%(fps*2)===0;g.input.consumeDodge=()=>frame%(fps*3)===0;
 if(frame%(fps*19)===0&&p.companionGroup)g.allyLinks.leave(p,'soak-player-choice');
 // Keep the full requested duration running; preserve damage/defeat events for diagnostics.
 g.gameOver=false;g.paused=false;g.lives=g.balance.lives.maxLives;
 g.update(dt);
 if(p.companionGroup)groupSeconds+=dt;
 const apex=g.entities.filter(e=>e.alive&&e.apex).length;maxApex=Math.max(maxApex,apex);assert(apex<=g.balance.ecology.maxApex,`apex cap at ${t}`);
 maxGroups=Math.max(maxGroups,g.allyLinks.groups.size);
 for(const group of g.allyLinks.groups.values()){
  assert(group.members.size>=2&&group.members.size<=6,`group count at ${t}`);
  assert(group.members.has(group.leader),'leader must be a member');
  for(const e of group.members){assert(e.alive&&g.entities.includes(e)&&(e.color===group.color||!!group.truceUntil)&&e.companionGroup===group.id,'group membership must be current (mixed colors only under a truce, R-COMP-002)');for(const other of group.members)if(other!==e)assert(!isHostile(e,other),'group members are never hostile to each other (R-COMP-002)');assert(![...group.members].some(target=>target!==e&&target.beingAbsorbedByRef===e),'group members never absorb each other (R-COMP-002)');}
 }
 if(frame%fps===0){
  const sample=g.entities.filter(e=>e.alive&&e.behavior!=='orb');
  for(const e of sample){for(const key of ['x','y','size','hp','maxHp','moveSpeed','facing'])assert(Number.isFinite(e[key]),`${key} finite: #${e.id} at ${t}`);assert(e.hp>0&&e.hp<=e.maxHp+1e-6,'living health');if(e.companionGroup){assert(g.allyLinks.groups.has(e.companionGroup),'no orphan group');for(const target of sample)assert(!canAbsorb(e,target),'peaceful absorption eligibility');}checks++;}
 }
}
casts=g.abilities.events.filter(e=>e.type==='special-fire'&&e.id===g.player.id).length;defeats=g.player.defeatSerial??0;
assert(Math.abs(g.gameTime-seconds)<dt,'completed requested duration');
console.log(JSON.stringify({result:'PASS',seed,seconds,fps,actualSeconds:Number(g.gameTime.toFixed(3)),unitChecks:checks,maxApex,maxGroups,playerGroupSeconds:Number(groupSeconds.toFixed(2)),playerCasts:casts,playerDefeats:defeats,ally:g.allyLinks.stats,era:{phase:g.era.phase.id,cycle:g.era.cycle,duelStarts:g.era.duelStarts,duelEnds:g.era.duelEnds,apocalypses:g.era.completedApocalypses,events:g.era.events}},null,2));
