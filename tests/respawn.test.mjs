// R-ECO-010: Life respawn lands somewhere random but not too dangerous, then stays briefly invulnerable.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity} from '../js/ai.js';
import {applyDamage} from '../js/combat.js';
import {canAbsorb} from '../js/collision.js';
import {respawnDanger,pickRespawnPoint} from '../js/respawn.js';
import {statusChips} from '../js/statusLabels.js';

const unit=(g,props)=>{const e=new AIEntity({balance:g.balance,x:0,y:0,startSize:props.size??60,color:props.color??'red',colorHex:'#f00'});Object.assign(e,props);return e;};

test('R-ECO-010 respawn danger counts lava, the doom field and units that could kill or absorb the player', () => {
  const g=createGame(7),p=g.player;p.size=60;g.entities=[p];
  const river=g.biomes.rivers[0];
  assert.equal(respawnDanger(g,{x:river.x,y:river.y},p.size).hazard,true,'lava river');
  g.era.apocalypse={x:1000,y:1000,radius:300};
  assert.equal(respawnDanger(g,{x:1100,y:1000},p.size).hazard,true,'doom field');
  g.era.apocalypse=null;
  const spot={x:2000,y:6000};
  assert.deepEqual(respawnDanger(g,spot,p.size),{hazard:false,threats:0});
  const hostile=unit(g,{x:spot.x+300,y:spot.y,size:90,color:p.color==='red'?'blue':'red'});
  const absorber=unit(g,{x:spot.x-300,y:spot.y,size:90,color:p.color});
  const small=unit(g,{x:spot.x,y:spot.y+200,size:20,color:p.color==='red'?'blue':'red'});
  g.entities=[p,hostile,absorber,small];
  assert.equal(respawnDanger(g,spot,p.size).threats,2,'a bigger enemy and a bigger same-colour absorber count; a small enemy does not');
});

test('R-ECO-010 a Life respawn is random, clear of hazards and threats, and invulnerable for the configured seconds', () => {
  const points=new Set();
  for(const seed of [3,7,11,23]){
    const g=createGame(seed),p=g.player;
    for(let i=0;i<6;i++){const e=unit(g,{x:1000+i*1100,y:4000,size:400,color:p.color==='red'?'blue':'red'});g.entities.push(e);}
    g.handlePlayerDefeat('DEFEATED');
    const danger=respawnDanger(g,p,p.size);
    assert.deepEqual(danger,{hazard:false,threats:0},`seed ${seed}`);
    assert.equal(p.respawnInvulnerableRemaining,g.balance.respawn.invulnerableSeconds);
    points.add(`${Math.round(p.x)}:${Math.round(p.y)}`);
  }
  assert(points.size>1,'not a fixed point');
  const g=createGame(3);g.handlePlayerDefeat('DEFEATED');
  assert(!(g.player.x===g.balance.world.worldWidth/2&&g.player.y===g.balance.world.worldHeight/2),'no longer the world centre');
});

test('R-ECO-010 respawn invulnerability blocks damage and absorption, shows a chip, then runs out', () => {
  const g=createGame(7),p=g.player;g.entities=[p];
  g.handlePlayerDefeat('DEFEATED');
  const enemy=unit(g,{x:p.x+50,y:p.y,size:p.size*2,color:p.color==='red'?'blue':'red'});
  const big=unit(g,{x:p.x-50,y:p.y,size:p.size*2,color:p.color});
  g.entities.push(enemy,big);
  const hp=p.hp;
  assert.equal(applyDamage(p,50,g,enemy,g.balance),false);assert.equal(p.hp,hp);
  assert.equal(canAbsorb(big,p),false);
  assert.match(statusChips(p,g).find(c=>c.kind==='respawn-invulnerable')?.text??'',/부활 무적 3/);
  for(let t=0;t<g.balance.respawn.invulnerableSeconds+.2;t+=.1)g.updatePlayer(.1);
  assert.equal(p.respawnInvulnerableRemaining,0);
  assert.equal(statusChips(p,g).some(c=>c.kind==='respawn-invulnerable'),false);
  assert.equal(canAbsorb(big,p),true);
  assert.equal(applyDamage(p,50,g,enemy,g.balance),true);assert(p.hp<hp);
});

test('R-ECO-010 when every candidate is risky the least dangerous point is used', () => {
  const g=createGame(7),p=g.player;
  g.balance.respawn={...g.balance.respawn,threatRadius:1e6};
  g.entities.push(unit(g,{x:100,y:100,size:p.size*3,color:p.color==='red'?'blue':'red'}));
  const point=pickRespawnPoint(g);
  assert(Number.isFinite(point.x)&&Number.isFinite(point.y));
  assert.equal(point.hazard,false);assert(point.threats>=1);
});
