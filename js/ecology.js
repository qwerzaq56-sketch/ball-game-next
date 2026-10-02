import { random } from './random.js';
// Stable size order drives roles and apex titles; score order remains for the leaderboard.
function ordered(units, field, previous) {
  const rank = new Map(previous.map((id,i)=>[id,i]));
  return [...units].sort((a,b)=>b[field]-a[field] || (rank.get(a.id) ?? Infinity)-(rank.get(b.id) ?? Infinity) || a.id-b.id);
}
function commitCandidate(e, field, value, immediate) {
  const key = '_' + field + 'Candidate', count = '_' + field + 'Count';
  if (immediate) {e[field]=value;e[key]=value;e[count]=0;return;}
  if (e[field] === value) {e[key]=value;e[count]=0;return;}
  if (e[key] === value) e[count]=(e[count] ?? 0)+1;
  else {e[key]=value;e[count]=1;}
  if (e[count]>=2) {e[field]=value;e[count]=0;}
}
export function assignPersonality(e) {
  if(e.behavior!=='ai' || e.personality) return;
  const r=random('ai');e.personality=r<.34?'growth':r<.67?'cautious':'opportunist';
}
export class Ecology {
  constructor(){this.timer=0;this.sizeOrder=[];this.scoreOrder=[];this.initial=true;this.events=[];}
  release(e,time,reason){
    if(e.apex)this.events.push({time,type:'apex-loss',id:e.id,reason});
    e.apex=false;e._apexCandidate=null;e._apexCount=0;e._titleNeedsConfirmation=true;
  }
  initializeUnit(game,e){
    const units=game.entities.filter(x=>x.alive&&x.behavior!=='orb');
    const sizes=ordered(units,'size',this.sizeOrder), i=sizes.indexOf(e), n=sizes.length;
    e.role=n<5?'forager':i<Math.floor(n*.2)?'predator':i>=n-Math.floor(n*.4)?'prey':'forager';
    assignPersonality(e);
    if(e.role==='predator'&&!e.relationship){const r=random('ai');e.relationship=r<.4?'subordinate':r<.7?'challenger':'independent';}
    e.apex=false;
  }
  update(game,dt){
    for(const e of game.entities)if(!e.alive&&e.apex)this.release(e,game.gameTime,'death');
    this.timer-=dt;if(this.timer>0)return;this.timer+=2;
    const units=game.entities.filter(e=>e.alive&&e.behavior!=='orb');
    const sizes=ordered(units,'size',this.sizeOrder), scores=ordered(units,'score',this.scoreOrder);
    this.sizeOrder=sizes.map(e=>e.id);this.scoreOrder=scores.map(e=>e.id);
    const titles=new Set(sizes.slice(0,3).filter(e=>e.size>=100).map(e=>e.id));
    sizes.forEach((e,i)=>{
      assignPersonality(e);
      const role=units.length<5?'forager':i<Math.floor(units.length*.2)?'predator':i>=units.length-Math.floor(units.length*.4)?'prey':'forager';
      commitCandidate(e,'role',role,this.initial||e.role===undefined);
      if(e.role==='predator' && e.behavior==='ai'&&!e.relationship){const r=random('ai');e.relationship=r<.4?'subordinate':r<.7?'challenger':'independent';}
      e._apexBefore=e.apex;
      commitCandidate(e,'apex',titles.has(e.id),(this.initial||e.apex===undefined)&&!e._titleNeedsConfirmation);
    });
    // Retained titles and newly confirmed replacements may overlap; enforce the hard cap.
    const excess=sizes.filter(e=>e.apex).slice(3);
    for(const e of excess){e.apex=false;e._apexCandidate=false;e._apexCount=0;}
    for(const e of sizes){
      if(e.apex!==e._apexBefore){this.events.push({time:game.gameTime,type:e.apex?'apex-gain':'apex-loss',id:e.id});if(e.apex)e._titleNeedsConfirmation=false;}
      delete e._apexBefore;
    }
    this.initial=false;
  }
}
