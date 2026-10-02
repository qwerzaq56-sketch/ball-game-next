import { random } from './random.js';
import { canAbsorb, dist } from './collision.js';
import { maintainDistanceFor } from './absorption.js';
// Encounter acceptance is shared by target selection and central consumption.
export function acceptsAbsorption(ai, other, balance) {
  if(ai.behavior!=='ai'||ai.color!=='green')return true;
  // Outside start distance, pursuit can approach without rolling acceptance yet.
  if(dist(ai,other)>maintainDistanceFor(ai,balance))return true;
  ai.absorbEncounters ??= new Map();
  if(!canAbsorb(ai,other)){ai.absorbEncounters.delete(other.id);return false;}
  if(!ai.absorbEncounters.has(other.id))ai.absorbEncounters.set(other.id,random('ai')<.5);
  return ai.absorbEncounters.get(other.id);
}
export function pruneEncounters(ai,game,balance){
  if(!ai.absorbEncounters)return;
  for(const id of ai.absorbEncounters.keys()){
    const other=game.entities.find(e=>e.id===id);
    if(!other||!other.alive||other.size>=ai.size||dist(ai,other)>maintainDistanceFor(ai,balance))ai.absorbEncounters.delete(id);
  }
}
export function chooseGeneral(ai,choices,huntMultiplier=1){
  if(!choices.length)return null;
  // Keep a valid choice until it ends instead of consuming RNG each judgment tick.
  const retained=choices.find(c=>c.target===ai.target&&c.state===ai.state);
  if(retained)return retained;
  const weight=c=>c.state==='chase_fight'?(ai.color==='red'?1.5:1)*huntMultiplier:1;
  const total=choices.reduce((n,c)=>n+weight(c),0);
  let roll=random('ai')*total;
  for(const c of choices){roll-=weight(c);if(roll<0)return c;}
  return choices.at(-1);
}
