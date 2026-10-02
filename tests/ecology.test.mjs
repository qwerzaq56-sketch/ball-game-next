import test from 'node:test';
import assert from 'node:assert/strict';
import {Ecology} from '../js/ecology.js';
import {createGame} from '../tools/headless.mjs';
import {decideAI} from '../js/ai.js';
function fixture(n=10){return {gameTime:0,entities:Array.from({length:n},(_,i)=>({id:i+1,size:120-i,score:100-i,alive:true,behavior:'ai'}))};}
test('role quotas and rank 3 eligibility does not promote rank 4',()=>{
 const g=fixture();g.entities.slice(2).forEach((x,i)=>x.size=99-i);const e=new Ecology();e.update(g,0);
 assert.equal(g.entities.filter(x=>x.role==='predator').length,2);assert.equal(g.entities.filter(x=>x.role==='prey').length,4);
 assert.equal(g.entities.filter(x=>x.apex).length,2);assert.equal(g.entities[3].apex,false);
});
test('two evaluations, immediate death release, respawn confirmation',()=>{
 const g=fixture();const e=new Ecology();e.update(g,0);const a=g.entities[0];
 a.size=90;e.update(g,2);assert.equal(a.apex,true);e.update(g,2);assert.equal(a.apex,false);
 a.size=150;e.update(g,2);e.update(g,2);assert.equal(a.apex,true);
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
test('new AI receives an immediate role without bypassing existing hysteresis',()=>{
 const g=createGame(7);g.entities=g.entities.filter(e=>e.behavior!=='ai');g.enemySpawnTimer=0;g.enemySpawnLoop(.1);
 const newborn=g.entities.find(e=>e.behavior==='ai');assert.equal(newborn.role,'forager');assert.ok(newborn.personality);assert.equal(newborn.score,0);
});

test('apex eligibility follows size even when score order disagrees',()=>{
 const g=fixture(8);g.entities.forEach((x,i)=>{x.score=i*100;x.size=150-i*10;});const e=new Ecology();e.update(g,0);
 assert.deepEqual(g.entities.filter(x=>x.apex).map(x=>x.id),[1,2,3]);
 const a=g.entities[0];a.score=-1000;e.update(g,2);e.update(g,2);assert.equal(a.apex,true);
 assert.equal(g.entities[7].apex,false);assert.equal(e.scoreOrder[0],8);
});
test('equal-size apex candidates keep their previous size order and ignore score swaps',()=>{
 const g=fixture(6);g.entities.forEach(x=>x.size=120);const e=new Ecology();e.update(g,0);
 g.entities.reverse();g.entities.find(x=>x.id===6).score=9999;e.update(g,2);e.update(g,2);
 assert.deepEqual(e.sizeOrder,[1,2,3,4,5,6]);assert.equal(g.entities.find(x=>x.id===6).apex,false);
});

test('confirmed replacements never exceed three titles even during hysteresis',()=>{
 const g=fixture(8),e=new Ecology();e.update(g,0);
 g.entities[5].size=200;g.entities[6].size=210;g.entities[7].size=220;
 for(let i=0;i<4;i++){e.update(g,2);assert(g.entities.filter(x=>x.apex).length<=3);}
 assert.deepEqual(g.entities.filter(x=>x.apex).map(x=>x.id),[6,7,8]);
});
