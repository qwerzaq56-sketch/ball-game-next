import {growthFromSize} from '../js/entity.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity} from '../js/ai.js';
import {nextSkillGoal} from '../js/progression.js';

test('initial growth immediately sets size, HP and skill capacity before the first pickup',()=>{
 const g=createGame(1);g.balance.player.startingGrowth=400;g.reset();const p=g.player;
 assert.equal(p.size,52);assert.equal(p.maxHp,260);assert.equal(p.hp,260);assert.equal(p.attackMaxStack,1);assert.equal(p.dodgeMaxStack,1);
 p.addGrowth(0,g.balance);assert.equal(p.size,52);assert.equal(p.hp,260);
});
test('capacity reductions clamp empty or partly spent player/AI stacks and increases award only new slots',()=>{
 const g=createGame(1),p=g.player,a=new AIEntity({x:1000,y:1000,startSize:120,color:'red',colorHex:'#f00',balance:g.balance});p.addGrowth(growthFromSize(120,p.baseSize,g.balance.growth.growthToSizeRatio,g.balance.growth),g.balance);
 for(const e of [p,a]){e.attackStack=0;e.dodgeStack=1;}
 g.balance.skills.attackStackThresholds[1].size=200;g.balance.skills.dodgeStackThresholds[1].size=200;
 p._recomputeStacks(g.balance,false);a._recomputeStacks(g.balance);
 for(const e of [p,a]){assert.equal(e.attackStack,0);assert.equal(e.dodgeStack,0);assert.equal(e.attackMaxStack,1);}
 g.balance.skills.attackStackThresholds[1].size=100;p._recomputeStacks(g.balance,false);a._recomputeStacks(g.balance);
 for(const e of [p,a])assert.equal(e.attackStack,1);
});
test('growth guidance follows configured nearest unlocks and ignores score',()=>{
 const g=createGame(1),p=g.player;assert.match(nextSkillGoal(p,g.balance).label,/공격 해금.*40/);
 p.size=45;p.score=99999;assert.match(nextSkillGoal(p,g.balance).label,/회피 해금.*50/);
 g.balance.skills.dodgeStackThresholds[0].size=40;p.size=20;assert.match(nextSkillGoal(p,g.balance).label,/공격 해금 · 회피 해금/);
});
