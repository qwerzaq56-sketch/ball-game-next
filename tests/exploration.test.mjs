import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,updateAI,decideAI} from '../js/ai.js';
import {Entity} from '../js/entity.js';
import {explorationDestination} from '../js/exploration.js';
function fixture(){const g=createGame(7);const a=new AIEntity({x:1000,y:1000,color:'yellow',colorHex:'#ff0',startSize:30,balance:g.balance});a.role='forager';a.personality='growth';g.entities=[a];g.buildGrid();return {g,a};}
test('exploration retains a destination, respects body bounds and replaces it on arrival/expiry',()=>{
 const {g,a}=fixture();a.x=15;a.y=15;const p=explorationDestination(a,g);
 assert(p.x>=15&&p.y>=15);assert(Math.hypot(p.x-a.x,p.y-a.y)>500);assert(a.wanderTimer>=4&&a.wanderTimer<=6);
 assert.equal(explorationDestination(a,g),p);a.x=p.x;a.y=p.y;assert.notEqual(explorationDestination(a,g),p);
 const next=a.explorationPoint;g.gameTime=next.expires;assert.notEqual(explorationDestination(a,g),next);assert(a.explorationRecent.length<=4);
});
test('perception remains local: unseen food does not become a chase target',()=>{
 const {g,a}=fixture();const food=new Entity({x:1600,y:1000,size:10,color:'blue',growthValue:100});g.entities.push(food);g.buildGrid();
 decideAI(a,g,g.balance);assert.equal(a.state,'search');assert.equal(a.target,null);
 updateAI(a,1/60,g,g.balance);assert(a.explorationPoint);assert.equal(a.target,null);
 food.x=1200;g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.target,food);assert.equal(a.state,'chase_eat');
});
test('danger overrides exploratory travel and disabled configuration keeps legacy wandering',()=>{
 const {g,a}=fixture();const enemy=new AIEntity({x:1200,y:1000,color:'red',colorHex:'#f00',startSize:80,balance:g.balance});g.entities.push(enemy);g.buildGrid();
 decideAI(a,g,g.balance);assert.equal(a.state,'flee');assert.equal(a.target,enemy);
 g.balance.ai.explorationEnabled=false;assert.equal(explorationDestination(a,g),null);
});
