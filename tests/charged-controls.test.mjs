import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';import {AIEntity,decideAI} from '../js/ai.js';import {startAttack,updateAttack} from '../js/combat.js';import {absorptionGrowthFor,startAbsorption,updateAbsorptions} from '../js/absorption.js';
function setup(){const g=createGame(7),p=g.player;p.size=100;p.x=p.y=4000;p.color='blue';p._recomputeStacks(g.balance,false);g.entities=[p];return {g,p};}
test('holding does not attack; release consumes charge once and full charge increases real damage',()=>{
 const {g,p}=setup();g.input.mouseDown=true;g.updatePlayer(.75);assert.equal(p.attackState,'READY');assert.equal(g.input.attackChargeSeconds,.75);
 g.input.mouseDown=false;g.input._attackQueued={angle:0,charge:.5};g.updatePlayer(.01);assert.equal(p.attackState,'CHARGING');assert(Math.abs(p.currentAttackPower-1.175)<1e-8);assert.equal(g.input._attackQueued,null);
 const target=new AIEntity({balance:g.balance,x:4100,y:4000,startSize:100,color:'red',colorHex:'#f00'});g.entities.push(target);p.attackStack=1;startAttack(p,0,g.balance,1);p.attackState='CHARGING';const hp=target.hp;updateAttack(p,p.currentChargeDuration,g.balance,[target],g);assert.equal(hp-target.hp,104);assert.equal(p.currentAttackPower,2);
});
test('right hold and mobile toggle gate absorption; releasing cancels an existing connection',()=>{
 const {g,p}=setup(),target=new AIEntity({balance:g.balance,x:4100,y:4000,startSize:40,color:'blue',colorHex:'#00f'});g.entities.push(target);g.updatePlayer(.01);assert.equal(p.allyAbsorptionEnabled,false);
 g.input.absorbHeld=true;g.updatePlayer(.01);assert.equal(p.allyAbsorptionEnabled,true);startAbsorption(p,target,g.balance,g);g.input.absorbHeld=false;g.updatePlayer(.01);updateAbsorptions(g,.01,g.balance);assert.equal(target.beingAbsorbedByRef,null);
 g.input.touchMode=true;g.input.absorbToggle=true;g.updatePlayer(.01);assert.equal(p.allyAbsorptionEnabled,true);g.input.absorbToggle=false;g.updatePlayer(.01);assert.equal(p.allyAbsorptionEnabled,false);
});
test('green same-species absorption receives 85 percent of the original growth reward',()=>{
 const {g,p}=setup(),target={size:60};const full=absorptionGrowthFor(p,target,g.balance);p.color='green';assert.equal(absorptionGrowthFor(p,target,g.balance),full*.85);
});
test('nearby combat interrupts all four navigation and collection modes',()=>{
 for(const state of ['war_move','relationship','search','chase_eat']){const {g,p}=setup(),a=new AIEntity({balance:g.balance,x:4000,y:4000,startSize:100,color:'blue',colorHex:'#00f'}),enemy=new AIEntity({balance:g.balance,x:4240,y:4000,startSize:100,color:'red',colorHex:'#f00'});a.state=state;a.personality='growth';a.target={x:4500,y:4000,alive:true};g.entities=[a,enemy];g.biomes.enabled=false;g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.state,'chase_fight');assert.equal(a.target,enemy);}
});
test('size400 invitation diameter covers the corresponding snowstorm visible diameter',()=>{const {g,p}=setup();p.size=400;const expected=208+(400-40)*.65;assert.equal(g.allyLinks.inviteRange(p),expected);assert(g.abilities.skill({...p,color:'green'},'E').radius>=expected);});
test('a follower approaching the link limit uses dodge to catch the leader',()=>{
 const {g,p}=setup();p.size=500;const a=new AIEntity({balance:g.balance,x:5200,y:4000,startSize:100,color:'blue',colorHex:'#00f'});g.entities.push(a);g.biomes.enabled=false;g.allyLinks.recruit(p,a);g.allyLinks.move(a,.01);assert.equal(a.dodgeState,'DODGING');assert(Math.cos(a.dodgeDir)<0);
});
