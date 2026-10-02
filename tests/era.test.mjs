import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {random,resetRandom} from '../js/random.js';
import {AIEntity,decideAI,updateAI} from '../js/ai.js';
function fixture(){const g=createGame(11),a=new AIEntity({x:2000,y:2500,color:'blue',colorHex:'#00f',startSize:60,balance:g.balance});a.role='predator';a.personality='growth';a.relationship='independent';g.entities=[g.player,a];g.buildGrid();return {g,a};}
function phase(g,time){g.gameTime=time;g.era.update(0);}
test('Era phase boundaries repeat with game time and pause/reset stop the schedule',()=>{
 const {g}=fixture();for(const [time,id,remaining]of [[0,'abundance',180],[180,'competition',180],[360,'war',120],[480,'decline',60],[540,'abundance',180]]){phase(g,time);assert.equal(g.era.phase.id,id);assert.equal(g.era.remaining,remaining);}
 assert.equal(g.era.cycle,1);g.paused=true;g.update(10);assert.equal(g.gameTime,540);g.reset();assert.equal(g.era.phase.id,'abundance');assert.equal(g.era.cycle,0);assert.equal(g.era.apocalypse,null);
});
test('war travel uses a point and preserves prey, recovery, threat and companion restrictions',()=>{
 const {g,a}=fixture();phase(g,360);decideAI(a,g,g.balance);assert.equal(a.state,'war_move');assert(a.target.alive);assert.equal(a.target.id,undefined);
 a.decisionTimer=100;const x=a.x;updateAI(a,.1,g,g.balance);assert.notEqual(a.x,x);assert.equal(a.state,'war_move');
 a.role='prey';decideAI(a,g,g.balance);assert.equal(a.state,'search');a.role='predator';a.hp=a.maxHp*.2;decideAI(a,g,g.balance);assert.notEqual(a.state,'war_move');
 a.hp=a.maxHp;a.recovering=false;const danger=new AIEntity({x:a.x+100,y:a.y,color:'red',colorHex:'#f00',startSize:100,balance:g.balance});g.entities.push(danger);g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.state,'flee');
});
test('war endpoints release immediately at phase end instead of holding stale travel',()=>{
 const {g,a}=fixture();phase(g,360);decideAI(a,g,g.balance);assert.equal(a.state,'war_move');a.decisionTimer=100;phase(g,480);updateAI(a,.01,g,g.balance);assert.notEqual(a.state,'war_move');
});
test('apocalypse warns without damage, avoids respawn centre and ticks after six seconds',()=>{
 const {g,a}=fixture();phase(g,480);const field=g.era.apocalypse;assert(field);assert(Math.hypot(field.x-g.player.x,field.y-g.player.y)>field.radius+100);
 a.x=field.x;a.y=field.y;const hp=a.hp;decideAI(a,g,g.balance);assert.equal(a.environmentThreat,field);assert.equal(a.state,'flee');
 for(let i=0;i<12;i++){g.gameTime+=.5;g.era.update(.5);}assert.equal(field.active,true);assert.equal(a.hp,hp);
 g.gameTime+=.5;g.era.update(.5);assert(a.hp<hp);const after=a.hp;a.invincible=true;g.gameTime+=.5;g.era.update(.5);assert.equal(a.hp,after);
});
test('apocalypse finishes once, creates capped perimeter rewards and returns next cycle',()=>{
 const {g}=fixture();g.entities=[g.player];phase(g,480);const field=g.era.apocalypse;g.gameTime=494;g.era.update(14);assert.equal(g.era.apocalypse,null);assert.equal(g.era.completedApocalypses,1);
 const rewards=g.entities.filter(e=>e.regionReward==='apocalypse');assert.equal(rewards.length,12);for(const e of rewards)assert(Math.hypot(e.x-field.x,e.y-field.y)>field.radius);
 g.era.update(0);assert.equal(g.entities.filter(e=>e.regionReward==='apocalypse').length,12);
 phase(g,1020);assert(g.era.apocalypse);assert.notEqual(g.era.apocalypse.id,field.id);
});
test('duel observer reads actual challenges, records bounded history and leaves RNG/state alone',()=>{
 const {g,a}=fixture();const target=new AIEntity({x:a.x+100,y:a.y,color:'red',colorHex:'#f00',startSize:80,balance:g.balance});target.apex=true;g.entities.push(target);
 const before=JSON.stringify(g.snapshot());resetRandom(937);const expected=random('ai');resetRandom(937);for(let i=0;i<30;i++){a.challengeTarget=target;a.state='chase_fight';g.era.observeDuels();a.challengeTarget=null;g.era.observeDuels();}
 assert.equal(random('ai'),expected);assert.equal(g.era.duelStarts,30);assert.equal(g.era.duelEnds,30);assert.equal(g.era.recentDuels.length,16);assert.equal(g.era.duels.size,0);assert.equal(JSON.stringify(g.snapshot().units),JSON.stringify(JSON.parse(before).units));
});
test('disabled Era retains legacy regional schedule and creates no war or apocalypse',()=>{
 const {g,a}=fixture();g.balance.era.enabled=false;g.reset();phase(g,480);assert.equal(g.era.apocalypse,null);assert.equal(g.era.warDestination(a),null);assert.equal(g.era.encounterInterval,45);assert.equal(g.biomes.encounterTimer,45);
});

test('a former predator or new apex releases the challenger duel privilege',()=>{
 const {g,a}=fixture();const target=new AIEntity({x:a.x+250,y:a.y,color:'red',colorHex:'#f00',startSize:80,balance:g.balance});target.apex=true;target.hp=target.maxHp*.25;g.entities.push(target);g.buildGrid();a.challengeTarget=target;a.state='chase_fight';a.role='prey';decideAI(a,g,g.balance);assert.equal(a.challengeTarget,null);assert.equal(a.state,'flee');
 a.role='predator';a.apex=true;a.challengeTarget=target;decideAI(a,g,g.balance);assert.equal(a.challengeTarget,null);
});
