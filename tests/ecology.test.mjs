import test from 'node:test';
import assert from 'node:assert/strict';
import {Ecology} from '../js/ecology.js';
import {createGame} from '../tools/headless.mjs';
import {decideAI} from '../js/ai.js';
function fixture(n=10){return {gameTime:0,entities:Array.from({length:n},(_,i)=>({id:i+1,size:120-i,score:100-i,alive:true,behavior:'ai'}))};}
test('role quotas and rank 5 eligibility do not promote rank 6',()=>{
 const g=fixture();g.entities[4].size=99;const e=new Ecology();e.update(g,0);
 assert.equal(g.entities.filter(x=>x.role==='predator').length,2);assert.equal(g.entities.filter(x=>x.role==='prey').length,4);
 assert.equal(g.entities.filter(x=>x.apex).length,4);assert.equal(g.entities[5].apex,false);
});
test('two evaluations, immediate death release, respawn confirmation',()=>{
 const g=fixture();const e=new Ecology();e.update(g,0);const a=g.entities[0];
 a.score=0;e.update(g,2);assert.equal(a.apex,true);e.update(g,2);assert.equal(a.apex,false);
 a.score=999;e.update(g,2);e.update(g,2);assert.equal(a.apex,true);
 e.release(a,0,'defeat');assert.equal(a.apex,false);e.update(g,2);assert.equal(a.apex,false);e.update(g,2);assert.equal(a.apex,true);
});
test('small populations are foragers and personalities persist across role changes',()=>{
 const g=fixture(4),e=new Ecology();e.update(g,0);assert.ok(g.entities.every(x=>x.role==='forager'));
 const p=g.entities[0].personality;g.entities.push(...fixture(10).entities.map(x=>({...x,id:x.id+10})));e.update(g,2);e.update(g,2);assert.equal(g.entities[0].personality,p);
});
test('common score credited to AI and player without HUD duplication',()=>{
 const g=createGame(3);const a=g.entities.find(e=>e.behavior==='ai');g.awardScore(a,7.6);g.awardScore(g.player,9.2);
 assert.equal(a.score,8);assert.equal(g.score,9);g.score+=2;assert.equal(g.player.score,11);
});
test('prey cannot select ordinary hunting and critical health enters recovery',()=>{
 const g=createGame(4);const a=g.entities.find(e=>e.behavior==='ai');a.role='prey';a.personality='growth';a.size=60;a.attackUnlocked=true;
 const enemy=g.entities.find(e=>e.behavior==='ai'&&e.color!==a.color);enemy.size=20;enemy.x=a.x+30;enemy.y=a.y;
 g.entities=[a,enemy];g.buildGrid();decideAI(a,g,g.balance);assert.notEqual(a.state,'chase_fight');
 a.hp=a.maxHp*.2;decideAI(a,g,g.balance);assert.equal(a.recovering,true);
});
