import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,decideAI} from '../js/ai.js';
import {dist} from '../js/collision.js';
const actor=g=>new AIEntity({x:1000,y:1000,color:'blue',colorHex:'#00f',startSize:40,balance:g.balance});
test('generated biomes cover every cell with broad noncircular regions independent of relics',()=>{
 const g=createGame(7);assert.equal(g.balance.world.worldWidth,8000);assert.equal(g.biomes.regions.length,6);assert.equal(g.biomes.tiles.length,1600);
 for(const t of g.biomes.tiles)assert.equal(g.biomes.regionAt({x:t.x+100,y:t.y+100}),t.region);
 assert.equal(new Set(g.biomes.tiles.map(t=>t.region.id)).size,6);
 const before=g.biomes.tiles.map(t=>t.region.id);g.balance.relics.enabled=false;g.reset();assert.deepEqual(g.biomes.tiles.map(t=>t.region.id),before);
 for(const p of [{x:0,y:0},{x:7999,y:7999},{x:-1,y:4000}])assert(g.biomes.regionAt(p));
});
test('blizzard reduces local sensing and blooms a capped visible snow reward once per event',()=>{
 const g=createGame(7),a=actor(g),r=g.biomes.regions.find(r=>r.id==='snow');a.x=r.x;a.y=r.y;g.entities=[a];g.gameTime=16;
 assert.equal(g.biomes.sensingRange(a),208);g.biomes.update(0);assert.equal(g.entities.length,13);assert(g.entities.slice(1).every(e=>g.biomes.regionAt(e).id==='snow'));
 g.biomes.update(0);assert.equal(g.entities.length,13);g.gameTime=24;assert.equal(g.biomes.sensingRange(a),320);
 g.balance.spawning.maxOrbCount=14;g.gameTime=40;g.biomes.update(0);assert.equal(g.entities.length,15);
});
test('lava channels inflict defended environmental ticks only on their contact area',()=>{
 const g=createGame(7),a=actor(g),h=g.biomes.rivers[10];g.entities=[a];a.x=h.x;a.y=h.y;a.hp=a.maxHp=200;
 g.biomes.update(.49);assert.equal(a.hp,200);g.biomes.update(.01);assert.equal(a.hp,188);assert.equal(a.retaliateTarget,null);
 a.invincible=true;g.biomes.update(.5);assert.equal(a.hp,188);a.invincible=false;a.y+=300;g.biomes.update(.5);assert.equal(a.hp,188);
 a.x=h.x;a.y=h.y;a.hp=1;g.biomes.update(.5);assert.equal(a.alive,false);
});
test('lava escape overrides commands and routes approach around the actual river',()=>{
 const g=createGame(7),a=actor(g),h=g.biomes.rivers[10];a.x=h.x+50;a.y=h.y;g.entities=[a];a.command={owner:g.player,kind:'harvest',remaining:5};g.buildGrid();decideAI(a,g,g.balance);
 assert.equal(a.state,'flee');assert.equal(a.command,null);assert(g.biomes.rivers.includes(a.target));
 a.x=h.x;a.y=h.y-180;const target={x:h.x,y:h.y+400};const waypoint=g.biomes.routePoint(a,target);assert.notEqual(waypoint,target);assert(Number.isFinite(waypoint.x)&&Number.isFinite(waypoint.y));
});
test('regional encounters respect biome masks, orb cap and avoid lava',()=>{
 const g=createGame(7);g.entities=[g.player];g.biomes.spawnEncounter();const orbs=g.entities.filter(e=>e.behavior==='orb');assert(orbs.length>30&&orbs.length<=48);
 for(const orb of orbs){assert.equal(g.biomes.regionAt(orb).id,orb.regionReward);assert(!g.biomes.rivers.some(h=>dist(orb,h)<h.hotRadius));}
 g.balance.spawning.maxOrbCount=49;g.biomes.spawnEncounter();assert.equal(g.entities.filter(e=>e.behavior==='orb').length,49);
 g.reset();assert.equal(g.biomes.encounters,0);
});
test('disabled biomes keep world and sensing neutral',()=>{
 const g=createGame(7);g.balance.biomes.enabled=false;g.reset();assert.equal(g.biomes.regions.length,0);assert.equal(g.biomes.tiles.length,0);assert.equal(g.biomes.danger(g.player),null);g.gameTime=16;assert.equal(g.biomes.sensingRange(g.player),320);g.biomes.update(100);assert.equal(g.biomes.encounters,0);
});
test('terrain is reproducible by seed, varies across seeds and wraps all sampled locations',()=>{
 const a=createGame(7),before=a.biomes.tiles.map(t=>t.region.id);a.reset();assert.deepEqual(a.biomes.tiles.map(t=>t.region.id),before);const b=createGame(701);assert.notDeepEqual(b.biomes.tiles.map(t=>t.region.id),before);
 const w=a.balance.world;for(let y=0;y<w.worldHeight;y+=333){assert.equal(a.biomes.regionAt({x:-1,y}),a.biomes.regionAt({x:w.worldWidth-1,y}));assert.equal(a.biomes.regionAt({x:20,y:y+w.worldHeight}),a.biomes.regionAt({x:20,y}));}
});
