// R-ECO-010: a Life respawn lands at a random point that is not too dangerous, then stays invulnerable for a few seconds.
import {random} from './random.js';
import {delta} from './topology.js';
import {isHostile} from './collision.js';

const gap=(a,b,world)=>{const d=delta(a,b,world);return Math.hypot(d.x,d.y);};

// Hazards hurt on their own (lava, sandstorm, an erupting vent, the doom field); threats are units that can kill or absorb the player.
export function respawnDanger(game,point,size){
  const c=game.balance.respawn??{},world=game.balance.world,margin=(c.hazardMargin??160)+size/2,p=game.player;
  const field=game.era?.apocalypse;
  const hazard=!!(game.biomes?.lavaAt({...point,_world:world},margin)
    ||game.biomes?.sandstorms?.some(f=>gap(point,f,world)<=f.radius+margin)
    ||game.biomeObjects?.objects?.some(o=>o.config?.effect==='vent'&&gap(point,o,world)<=(o.config.radius??0)+margin)
    ||field&&gap(point,field,world)<=field.radius+margin);
  const reach=c.threatRadius??700;
  let threats=0;
  for(const e of game.entities){
    if(e===p||!e.alive||e.behavior!=='ai'||e.summoned)continue;
    const dangerous=isHostile(e,p)?e.size>=size*(c.threatSizeRatio??.8):e.color===p.color&&e.size>size;
    if(dangerous&&gap(point,e,world)<=reach+e.size/2)threats++;
  }
  return {hazard,threats};
}

export function pickRespawnPoint(game){
  const c=game.balance.respawn??{},w=game.balance.world,size=game.player.size,edge=w.wrap?0:size/2+40;
  let best=null;
  for(let i=0;i<(c.candidates??48);i++){
    const point={x:edge+random('respawn')*(w.worldWidth-2*edge),y:edge+random('respawn')*(w.worldHeight-2*edge)};
    const danger=respawnDanger(game,point,size);
    if(!danger.hazard&&!danger.threats)return {...point,...danger};
    const score=(danger.hazard?1000:0)+danger.threats;
    if(!best||score<best.score)best={...point,...danger,score};
  }
  return best;
}
