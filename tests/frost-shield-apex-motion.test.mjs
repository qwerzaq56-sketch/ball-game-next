import test from 'node:test';import assert from 'node:assert/strict';import {createGame} from '../tools/headless.mjs';import {AIEntity,updateAI} from '../js/ai.js';import {applyDamage} from '../js/combat.js';import {Ecology} from '../js/ecology.js';import {debugRoleLabel} from '../js/presentation.js';import {beginGrowthMotion,updateGrowthMotion} from '../js/growthMotion.js';import {startAbsorption} from '../js/absorption.js';
function setup(){const g=createGame(7),p=g.player;p.color='cyan';p.size=200;p.hp=p.maxHp=1000;p.apex=true;p._specialApex=true;g.entities=[p];g.biomes.enabled=false;return {g,p};}
const unit=(g,color='red',x=g.player.x+100)=>new AIEntity({balance:g.balance,x,y:g.player.y,startSize:100,color,colorHex:'#fff'});
test('cyan shield protects self and nearby allies after defense, expires and refreshes without stacking',()=>{
 const {g,p}=setup(),ally=unit(g,'cyan'),enemy=unit(g);g.entities.push(ally,enemy);g.buildGrid();const skill=g.abilities.skill(p,'E');g.abilities.fireNormal(p,{slot:'E',id:1,dir:0,skill});assert.equal(p.shieldHp,150);assert.equal(ally.shieldHp,75);assert.equal(enemy.shieldHp,undefined);const hp=p.hp;applyDamage(p,100,g,enemy,g.balance,{knockback:false});assert.equal(p.hp,hp);assert(p.shieldHp<150);g.abilities.fireNormal(p,{slot:'E',id:2,dir:0,skill});assert.equal(p.shieldHp,150);applyDamage(p,1000,g,enemy,g.balance,{knockback:false});assert.equal(p.shieldHp,0);assert(p.hp<hp);g.abilities.fireNormal(p,{slot:'E',id:3,dir:0,skill});g.abilities.update(6);assert.equal(p.shieldHp,0);
});
test('cyan R marks then explodes at moving victim and freezes after three actual field hits',()=>{
 const {g,p}=setup(),enemy=unit(g);enemy.hp=enemy.maxHp=10000;g.entities.push(enemy);g.buildGrid();const skill=g.abilities.skill(p,'R');g.abilities.fire(p,{slot:'R',id:1,dir:0,point:{x:p.x,y:p.y},skill});assert.equal(g.abilities.frostMarks.length,1);assert.equal(enemy.frozen,undefined);g.abilities.update(1);assert.equal(g.abilities.frostFields.length,0);enemy.x+=200;g.abilities.update(.2);assert.equal(g.abilities.frostFields.length,1);assert.equal(g.abilities.frostFields[0].x,enemy.x);assert.equal(enemy.frozen,undefined);g.abilities.update(.5);g.abilities.update(.5);assert(!(enemy.frozen>0));g.abilities.update(.5);assert.equal(enemy.frozen,1.2);g.abilities.update(5);assert.equal(g.abilities.frostFields.length,0);
});
test('cold marks cancel on death or a player life boundary',()=>{
 const {g,p}=setup(),enemy=unit(g);enemy.hp=10000;g.entities.push(enemy);g.buildGrid();const skill=g.abilities.skill(p,'R');g.abilities.fire(p,{slot:'R',id:1,dir:0,point:p,skill});enemy.defeatSerial=1;g.abilities.update(2);assert.equal(g.abilities.frostFields.length,0);assert.equal(g.abilities.frostMarks.length,0);
});
test('apex eligibility requires half of the largest live size and immediately removes ineligible titles',()=>{
 const {g,p}=setup(),a=unit(g,'blue'),b=unit(g,'green');p.size=1000;a.size=500;b.size=499;g.entities=[p,a,b];g.ecology=new Ecology();g.ecology.update(g,0);assert(p.apex);assert(a.apex);assert(!b.apex);p.size=1100;g.ecology.update(g,2);assert(!a.apex);assert.equal(debugRoleLabel(p),'★ 최상위 포식자');
});
test('absorbed AI spends dodge charge to flee even before ordinary decisions',()=>{
 const {g,p}=setup(),a=unit(g,'cyan');p.size=400;a.size=100;a.dodgeStack=1;a.dodgeMaxStack=1;a.dodgeUnlocked=true;g.entities.push(a);startAbsorption(p,a,g.balance,g);updateAI(a,.01,g,g.balance);assert.equal(a.dodgeState,'DODGING');assert.equal(a.dodgeStack,0);assert(Math.cos(a.dodgeDir)>0);
});
test('growth drawing smoothly springs toward new size without changing actual size or restarting every frame',()=>{
 const e={size:100};beginGrowthMotion(e);e.size=200;assert.equal(e.visualSize,100);updateGrowthMotion(e,.016);assert(e.visualSize>100&&e.visualSize<110);const before=e.visualSize;beginGrowthMotion(e);assert.equal(e.visualSize,before);for(let i=0;i<240;i++)updateGrowthMotion(e,1/60);assert(Math.abs(e.visualSize-200)<.03);assert.equal(e.size,200);
});
