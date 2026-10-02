import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptsAbsorption,pruneEncounters,chooseGeneral} from '../js/species.js';
import {createGame} from '../tools/headless.mjs';
test('green refusal is stable until separation; central consumption respects refusal',()=>{
 const g=createGame(1);const a=g.entities.find(e=>e.behavior==='ai'&&e.color==='green'),b=g.entities.find(e=>e!==a&&e.behavior==='ai'&&e.color==='green');
 a.size=90;b.size=20;b.x=a.x;b.y=a.y;a.absorbEncounters=new Map([[b.id,false]]);
 for(let i=0;i<30;i++)assert.equal(acceptsAbsorption(a,b,g.balance),false);
 g.entities=[a,b];g.buildGrid();g.resolveConsumption();assert.equal(b.beingAbsorbedByRef,null);
 b.x=a.x+1000;pruneEncounters(a,g,g.balance);assert.equal(a.absorbEncounters.has(b.id),false);
});
test('choice retention does not reroll a valid target',()=>{
 const a={color:'red',state:'chase_eat',target:{}};const choices=[{state:'chase_eat',target:a.target},{state:'chase_fight',target:{}}];
 for(let i=0;i<20;i++)assert.equal(chooseGeneral(a,choices),choices[0]);
});
test('cyan replaces purple while preserving five colors',()=>{
 const g=createGame(2);assert.equal(g.balance.colors.length,5);assert.ok(g.balance.colors.some(c=>c.id==='cyan'));assert.ok(!g.balance.colors.some(c=>c.id==='purple'));
});
import {updateAI} from '../js/ai.js';
test('cyan reduction applies only to idle wander and yellow boundary resets direction timer',()=>{
 const g=createGame(3);const a=g.entities.find(e=>e.behavior==='ai');a.color='cyan';a.x=1000;a.y=1000;a.state='search';a.target=null;a.wanderAngle=0;a.wanderTimer=5;a.decisionTimer=5;
 a.attackState='READY';a.dodgeState='READY';g.entities=[a];g.buildGrid();const x=a.x;updateAI(a,.1,g,g.balance);
 assert.ok(Math.abs(a.x-x-a.moveSpeed*.55*.7*.1)<1e-8);
 a.color='yellow';a.x=-1;a.wanderTimer=5;g.clampAllToWorld();assert.equal(a.wanderTimer,0);
});
test('AI personality exists at birth and green may approach before start-distance roll',()=>{
 const g=createGame(5);const a=g.entities.find(e=>e.behavior==='ai'&&e.color==='green');
 assert.ok(a.personality);const b={id:999,alive:true,color:'green',behavior:'ai',size:1,x:a.x+200,y:a.y};
 assert.equal(acceptsAbsorption(a,b,g.balance),true);assert.equal(a.absorbEncounters?.has(999)??false,false);
});
