import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
test('oversized bodies keep their size and center in each constrained dimension',()=>{
 const g=createGame(7);g.balance.world.worldWidth=500;g.balance.world.worldHeight=1000;g.entities=[g.player];g.player.size=600;g.player.x=-900;g.player.y=1200;g.clampAllToWorld();assert.equal(g.player.x,250);assert.equal(g.player.y,700);assert.equal(g.player.size,600);
 g.player.size=1200;g.clampAllToWorld();assert.equal(g.player.x,250);assert.equal(g.player.y,500);
 g.player.size=20;g.player.x=-100;g.player.y=2000;g.clampAllToWorld();assert.equal(g.player.x,10);assert.equal(g.player.y,990);
});
test('enemy births account for growing bodies and terminate on maps without safe space',()=>{
 const g=createGame(7);g.player.size=1800;g.pickSafeSpawnPos=()=>({x:g.player.x+350,y:g.player.y});
 const e=g.createSafeEnemy(g.balance.colors[0]);assert(Math.hypot(e.x-g.player.x,e.y-g.player.y)>=Math.max(350,(e.size+g.player.size)/2+80));assert(e.x>=e.size/2&&e.x<=5000-e.size/2);
 g.balance.world.worldWidth=30;g.balance.world.worldHeight=30;g.player.x=g.player.y=15;const trapped=g.createSafeEnemy(g.balance.colors[0]);assert(trapped.x>=0&&trapped.x<=30&&trapped.y>=0&&trapped.y<=30);assert(trapped.size>0);
});
