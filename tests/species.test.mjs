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
