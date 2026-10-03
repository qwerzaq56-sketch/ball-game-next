import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
test('analog touch input scales movement; keyboard diagonals and mixed input never exceed base speed',()=>{
 const g=createGame(7),p=g.player;g.entities=[p];g.input.touchMove={x:.5,y:0};
 const x=p.x,y=p.y;g.updatePlayer(.1);assert(Math.abs(p.x-x-p.moveSpeed*.05)<1e-8);assert.equal(p.y,y);
 g.input.touchMove={x:0,y:0};g.input.keys=new Set(['d','s']);const start={x:p.x,y:p.y};g.updatePlayer(.1);assert(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-p.moveSpeed*.1)<1e-8);
 g.input.touchMove={x:1,y:0};const before={x:p.x,y:p.y};g.updatePlayer(.1);assert(Math.abs(Math.hypot(p.x-before.x,p.y-before.y)-p.moveSpeed*.1)<1e-8);
});

test('released R keeps its captured direction and world point, consumes once, and cannot buffer through freezing',()=>{
 const g=createGame(7),p=g.player;g.entities=[p];p.color='yellow';p.apex=true;p.size=100;p.attackState=p.dodgeState='READY';p.specialCooldown=0;g.input._ultimateQueued={angle:Math.PI/2,point:{x:p.x,y:p.y+200}};g.updatePlayer(.01);assert.equal(p.specialCast.dir,Math.PI/2);assert.deepEqual(p.specialCast.point,{x:p.x,y:p.y+200});assert.equal(g.input._ultimateQueued,false);
 p.specialCast=null;p.specialCooldown=0;p.frozen=1;g.input._ultimateQueued=true;g.updatePlayer(.01);assert.equal(g.input._ultimateQueued,false);p.frozen=0;g.updatePlayer(.01);assert.equal(p.specialCast,null);
});
test('R preview point follows configured reach across the world seam without spending cooldown or random numbers',async()=>{
 const {resetRandom,random}=await import('../js/random.js'),g=createGame(7),p=g.player;p.color='yellow';p.x=7990;p.y=4000;g.balance.abilitySkills.overrides={'yellow-storm':{castRange:80}};const before=JSON.stringify(p);resetRandom(741);const expected=random('ai');resetRandom(741);const point=g.abilities.aimPoint(p,0,{x:300,y:4000});assert(Math.abs(point.x-70)<1e-8);assert.equal(point.y,4000);assert.equal(random('ai'),expected);assert.equal(JSON.stringify(p),before);
});
