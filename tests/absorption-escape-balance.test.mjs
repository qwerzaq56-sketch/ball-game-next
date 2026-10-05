import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';import {AIEntity} from '../js/ai.js';
import {startAbsorption,updateAbsorptions,resistanceTimeFor} from '../js/absorption.js';
import {startDodge,updateDodge,dodgeDistanceForSize,absorptionDodgeDistance} from '../js/combat.js';
function fixture(size=600,hpFraction=1){const g=createGame(77),p=g.player;p.size=size*2;p.color='green';p.x=p.y=4000;p.hp=p.maxHp=10000;p.allyAbsorptionEnabled=true;const t=new AIEntity({balance:g.balance,startSize:size,x:4000,y:4000,color:'green',colorHex:'#0f0'});t.hp=t.maxHp*hpFraction;g.entities=[p,t];startAbsorption(p,t,g.balance,g);return {g,p,t};}
test('R-ABS-012 absorption takes three times the previous duration at matching size, health and contact',()=>{
 for(const size of [30,200,600])for(const hp of [.1,.5,1]){const {g,t}=fixture(size,hp);const required=resistanceTimeFor(t,g.balance),oldTime=required/4.2,newTime=required/g.balance.absorption.maxAbsorptionSpeed;assert(Math.abs(newTime/oldTime-3)<1e-12);updateAbsorptions(g,oldTime,g.balance);assert(t.alive);assert(Math.abs(t.absorptionProgress/required-1/3)<1e-9);}
});
test('R-ABS-012 large absorbed targets retain dodge but its near-contact travel is capped',()=>{
 const {g,p,t}=fixture(1500);startDodge(t,0,g.balance);assert.equal(t.currentDodgeDistance,dodgeDistanceForSize(t.size,g.balance));assert.equal(absorptionDodgeDistance(t,g.balance),90);const x=t.x;updateDodge(t,.1,g.balance);assert.equal(t.x-x,45);assert.equal(t.beingAbsorbedByRef,p);assert.equal(t.dodgeState,'DODGING');
});
test('R-ABS-012 dodge reduction smoothly releases outside its surface radius and leaves absorber mobility intact',()=>{
 const {g,p,t}=fixture();startDodge(t,0,g.balance);const full=t.currentDodgeDistance,contact=(p.size+t.size)/2;
 t.x=p.x+contact;assert(absorptionDodgeDistance(t,g.balance)<full);t.x=p.x+contact+40;const middle=absorptionDodgeDistance(t,g.balance);assert(middle>90&&middle<full);t.x=p.x+contact+80;assert.equal(absorptionDodgeDistance(t,g.balance),full);
 t.beingAbsorbedByRef=null;assert.equal(absorptionDodgeDistance(t,g.balance),full);startDodge(p,0,g.balance);assert.equal(absorptionDodgeDistance(p,g.balance),p.currentDodgeDistance);
});
