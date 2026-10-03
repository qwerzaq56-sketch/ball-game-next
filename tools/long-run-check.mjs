// Combined-runtime invariants with normal gameplay lives, not a survival guarantee.
import assert from 'node:assert/strict';
import {createGame} from './headless.mjs';
import {canStartAttack} from '../js/combat.js';
const seconds=Number(process.argv[2]??3600),seeds=(process.argv[3]??'7,11,23').split(',').map(Number),fps=Number(process.argv[4]??60);
assert(seconds>0&&seconds<=14400&&seeds.every(Number.isInteger)&&fps>=20&&fps<=120);
const results=[];
for(const seed of seeds){
 const g=createGame(seed);g.options.collect=false;g.ecology.collect=false;g.autoplay.setEnabled(true);
 let checks=0,frames=0,maxApex=0,maxGroups=0,maxSize=0,firstPlayerApex=null;
 for(;frames<seconds*fps&&!g.gameOver;frames++){
  g.update(1/fps);const units=g.entities.filter(e=>e.alive&&e.behavior!=='orb');const apex=units.filter(e=>e.apex).length;maxApex=Math.max(maxApex,apex);assert(apex<=g.balance.ecology.maxApex,'apex cap');maxGroups=Math.max(maxGroups,g.allyLinks.groups.size);
  if(g.player.apex&&firstPlayerApex===null)firstPlayerApex=g.gameTime;
  for(const group of g.allyLinks.groups.values()){
   assert(group.members.size>=2&&group.members.size<=6&&group.members.has(group.leader),'group structure');
   for(const e of group.members){assert(e.alive&&units.includes(e)&&e.color===group.color&&e.companionGroup===group.id,'group member');assert([...group.members].every(t=>t.color===e.color),'friendly group');assert(!units.some(t=>t.beingAbsorbedByRef===e),'peaceful outgoing absorption');}
  }
  if(frames%fps===0){
   for(const e of units){checks++;maxSize=Math.max(maxSize,e.size);for(const key of ['x','y','size','hp','maxHp','moveSpeed','facing'])assert(Number.isFinite(e[key]),`${key} finite #${e.id}`);assert(e.hp>0&&e.hp<=e.maxHp+1e-6,'health');assert(e.x>=0&&e.x<=g.balance.world.worldWidth&&e.y>=0&&e.y<=g.balance.world.worldHeight,'world center');if(e.companionGroup)assert(g.allyLinks.groups.has(e.companionGroup),'orphan');}
   assert(g.abilities.events.length<=256&&g.ecology.events.length<=256&&g.era.events.length<=100&&g.era.recentDuels.length<=16&&g.allyLinks.events.length<=100&&g.apexHistory.recent.length<=24&&g.apexHistory.completed.length<=12&&g.runMetrics.samples.length<=600,'bounded runtime histories');
   assert(g.relics.items.length<=3&&g.relics.items.every(i=>i.alive),'relic population');
  }
 }
 results.push({seed,fps,policy:g.autoplay.policy,lifePolicy:'ordinary lives; no replenishment',requestedSeconds:seconds,actualSeconds:+g.gameTime.toFixed(3),stop:g.gameOver?'natural-game-over':'duration',frames,unitChecks:checks,maxApex,maxGroups,maxSize,player:{size:g.player.size,score:g.player.score,lives:g.lives,defeats:g.player.defeatSerial??0,firstApexSeconds:firstPlayerApex},era:{cycle:g.era.cycle,apocalypses:g.era.completedApocalypses,duels:g.era.duelStarts},relicPickupsAllUnits:g.relics.pickups,apex:g.apexHistory.summary(g.gameTime),historySizes:{abilities:g.abilities.events.length,ecology:g.ecology.events.length,era:g.era.events.length,ally:g.allyLinks.events.length,samples:g.runMetrics.samples.length}});
 process.stderr.write(JSON.stringify({seed,completedSeconds:g.gameTime,stop:g.gameOver?'natural-game-over':'duration',checks})+'\n');
}
console.log(JSON.stringify({result:'PASS',results},null,2));
