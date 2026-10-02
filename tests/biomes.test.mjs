import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,decideAI,updateAI} from '../js/ai.js';
import {Entity} from '../js/entity.js';
function fixture(){const g=createGame(7),b=g.balance;const a=new AIEntity({x:1000,y:1000,color:'blue',colorHex:'#00f',startSize:40,balance:b});a.role='forager';a.personality='growth';g.entities=[g.player,a];g.buildGrid();return {g,a};}
test('four distributed regions leave central spawn safe and reset their timers',()=>{
 const {g}=fixture();assert.equal(g.biomes.regions.length,4);assert.equal(g.biomes.regionAt(g.player),null);assert.equal(g.biomes.status(g.player),'평원');
 g.biomes.spawnEncounter();assert.equal(g.biomes.encounters,1);g.reset();assert.equal(g.biomes.encounters,0);assert.equal(g.biomes.encounterTimer,30);
});
test('blizzard reduces local perception but never reveals distant food; ends on schedule',()=>{
 const {g,a}=fixture();const r=g.biomes.regions.find(r=>r.id==='snow');a.x=r.x;a.y=r.y;g.gameTime=16;
 assert.equal(g.biomes.sensingRange(a),208);const orb=new Entity({x:a.x+250,y:a.y,size:10,color:'green',growthValue:100});g.entities=[a,orb];g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.target,null);
 g.gameTime=24;decideAI(a,g,g.balance);assert.equal(a.target,orb);assert.equal(g.biomes.sensingRange(a),320);
 a.x=2500;a.y=2500;g.gameTime=16;assert.equal(g.biomes.sensingRange(a),320);
});
test('lava applies defended environmental ticks and honors invincibility and death handling',()=>{
 const {g,a}=fixture();const r=g.biomes.regions.find(r=>r.hotRadius);a.x=r.x;a.y=r.y;a.hp=a.maxHp=200;
 g.biomes.update(.49);assert.equal(a.hp,200);g.biomes.update(.01);assert.equal(a.hp,188);assert.equal(a.retaliateTarget,null);
 a.invincible=true;g.biomes.update(.5);assert.equal(a.hp,188);a.invincible=false;a.hp=1;g.biomes.update(.5);assert.equal(a.alive,false);assert(!g.snapshot().units.some(e=>e.id===a.id));
});
test('environment escape overrides commands and peaceful groups can flee without aggression',()=>{
 const {g,a}=fixture();const r=g.biomes.regions.find(r=>r.hotRadius);a.x=r.x+50;a.y=r.y;a.command={owner:g.player,kind:'harvest',remaining:5};g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.state,'flee');assert.equal(a.target,r);assert.equal(a.command,null);
 const other=new AIEntity({x:a.x+80,y:a.y,color:a.color,colorHex:a.colorHex,startSize:40,balance:g.balance});g.entities=[a,other];g.allyLinks.refresh();g.allyLinks.join(a,other);const before=a.x;g.allyLinks.move(a,.1);assert(a.x>before);assert.equal(a.attackState,'READY');assert.equal(a.specialCast,null);assert(a.companionGroup);
});
test('ordinary and commanded movement route around magma with finite world-bounded waypoints',()=>{
 const {g,a}=fixture();const r=g.biomes.regions.find(r=>r.hotRadius);a.x=r.x-r.hotRadius-150;a.y=r.y;const target={x:r.x+600,y:r.y,alive:true};
 const point=g.biomes.routePoint(a,target);assert.notEqual(point,target);assert(Math.abs(point.y-r.y)>100);assert(point.x>=a.size/2&&point.x<=5000-a.size/2);
 a.state='command_move';a.target=target;a.decisionTimer=10;const oldY=a.y;updateAI(a,.1,g,g.balance);assert.notEqual(a.y,oldY);assert.equal(a.state,'command_move');assert.equal(a.target,target);
});
test('regional encounters obey orb cap, rotate priority and avoid dangerous cores',()=>{
 const {g}=fixture();g.entities=[g.player];g.biomes.spawnEncounter();const orbs=g.entities.filter(e=>e.behavior==='orb');assert.equal(orbs.length,32);
 for(const orb of orbs){const r=g.biomes.regions.find(r=>r.id===orb.regionReward);assert(Math.hypot(orb.x-r.x,orb.y-r.y)>=r.radius*.55-1e-8);assert(orb.growthValue>0);}
 g.balance.spawning.maxOrbCount=33;g.biomes.spawnEncounter();assert.equal(g.entities.filter(e=>e.behavior==='orb').length,33);assert.equal(g.entities.at(-1).regionReward,'lake');
 g.biomes.spawnEncounter();assert.equal(g.entities.filter(e=>e.behavior==='orb').length,33);
});
test('disabled biomes keep world and sensing neutral',()=>{
 const g=createGame(7);g.balance.biomes.enabled=false;g.reset();assert.equal(g.biomes.regions.length,0);assert.equal(g.biomes.danger(g.player),null);g.gameTime=16;assert.equal(g.biomes.sensingRange(g.player),320);g.biomes.update(100);assert.equal(g.biomes.encounters,0);
});
