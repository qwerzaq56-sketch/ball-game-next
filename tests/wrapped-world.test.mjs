import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,updateAI} from '../js/ai.js';
import {spawnOrb} from '../js/spawning.js';
import {dist,circlesOverlap} from '../js/collision.js';
import {delta,angleTo,wrappedIntervals} from '../js/topology.js';
import {startAttack,updateAttack} from '../js/combat.js';
import {updateAbsorptions} from '../js/absorption.js';
import {inWave,inCone} from '../js/abilities.js';
const legacyWorld=()=>{const g=createGame(7);g.balance.world.worldWidth=g.balance.world.worldHeight=5000;g.reset();return g;};
const actor=(g,x,y=2500,color='blue',size=40)=>new AIEntity({x,y,color,colorHex:'#39f',startSize:size,balance:g.balance});
test('wrapped movement preserves overshoot on every edge and keeps oversized bodies movable',()=>{
 const g=legacyWorld(),p=g.player;g.entities=[p];p.x=5004;p.y=-3;g.clampAllToWorld();assert.equal(p.x,4);assert.equal(p.y,4997);
 p.x=-5007;p.y=10011;p.size=6000;g.clampAllToWorld();assert.equal(p.x,4993);assert.equal(p.y,11);assert.equal(p.size,6000);
});
test('wrapped neighbors, overlap and combat agree on shortest directions across seams and corners',()=>{
 const g=legacyWorld(),a=actor(g,4990),b=actor(g,10,2500,'red');g.entities=[a,b];g.buildGrid();assert.equal(dist(a,b),20);assert(circlesOverlap(a,b));assert(g.getNearbyEntities(a,40).includes(b));assert(Math.abs(angleTo(a,b))<1e-9);
 a.attackUnlocked=true;a.attackStack=3;startAttack(a,0,g.balance);a.attackState='CHARGING';a.currentChargeDuration=2;a.currentChargeDistance=0;a.attackTimer=0;const hp=b.hp;updateAttack(a,.01,g.balance,[b],g);assert(b.hp<hp);
 a.y=4990;b.y=10;assert(Math.abs(dist(a,b)-Math.hypot(20,20))<1e-9);assert(inCone(a,b,Math.PI/4,100));assert(inWave(a,b,Math.PI/4,100,20));
});
test('food pickup and absorption pull use the short path at the seam',()=>{
 const g=legacyWorld(),p=g.player;p.x=4995;p.y=2500;p.size=80;const food=spawnOrb(g.balance,{x:5,y:2500});g.entities=[p,food];g.buildGrid();g.resolveConsumption();assert.equal(food.alive,false);
 p.size=100;const target=actor(g,5,2500,p.color);target.beingAbsorbedByRef=p;target.absorptionRequired=100;target.absorptionProgress=0;g.entities=[p,target];updateAbsorptions(g,.1,g.balance);assert(target.x<5);assert(target.absorptionProgress>0);
});
test('same-color links and peaceful formations stay connected across the map seam',()=>{
 const g=legacyWorld(),a=actor(g,4990),b=actor(g,40);g.entities=[a,b];g.allyLinks.refresh();assert.equal(g.allyLinks.edges.size,1);assert(g.allyLinks.join(a,b));g.allyLinks.refresh();assert.equal(g.allyLinks.groups.size,1);
 const lead=g.allyLinks.groups.get(a.companionGroup).leader;lead.facing=0;lead.companionVelocity={x:100,y:0};g.allyLinks.move(lead===a?b:a,.1);assert(Number.isFinite(b.x));
});
test('camera follows the nearest wrapped player image instead of jumping through the center',()=>{
 const g=legacyWorld();g.camera={x:4998,y:2500,zoom:1};g.player.x=2;g.player.y=2500;g.updateCamera(1/60);
 assert(Math.abs(delta(g.camera,g.player,g.balance.world).x)<5);const p=g.worldToScreen(2,2500);assert(Math.abs(p.x-g.canvas.width/2)<5);
 assert.deepEqual(wrappedIntervals(-100,100,5000),[[4900,5000],[0,100]]);
});
test('AI pursues seam-adjacent food in the short direction and biome radii remain unchanged',()=>{
 const g=legacyWorld(),a=actor(g,4990),food=spawnOrb(g.balance,{x:40,y:2500});g.entities=[a,food];a.state='chase_eat';a.target=food;a.decisionTimer=10;a.attackState=a.dodgeState='READY';g.buildGrid();const x=a.x;updateAI(a,.1,g,g.balance);assert(a.x>x);assert.equal(g.biomes.regions[0].radius,1100);
});
test('targeted ability points wrap rather than stopping at the border',()=>{
 const g=legacyWorld(),p=g.player;p.color='green';p.apex=true;p.x=4990;p.y=2500;p.specialCooldown=0;p.attackState=p.dodgeState='READY';assert(g.abilities.start(p,0,{x:5010,y:2500}));assert.equal(p.specialCast.point.x,10);
});
