import {growthFromSize} from '../js/entity.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity} from '../js/ai.js';
import {spawnOrb} from '../js/spawning.js';
import {assessGameplay,evaluationSummary} from '../js/gameplayEvaluation.js';
import {resetRandom,random} from '../js/random.js';
test('biome labels always lie on the matching generated terrain, including central grassland',()=>{
 for(const seed of [7,23,701]){const g=createGame(seed);for(const label of g.biomes.labels)assert.equal(g.biomes.regionAt(label).id,label.id);const grass=g.biomes.labels.find(t=>t.id==='grassland');assert.equal(g.biomes.regionAt(grass).id,'grassland');}
});
test('snow geometry and biome names do not translate or animate during blizzard',()=>{
 const g=createGame(7);g.biomes.rivers=[];const capture=t=>{g.gameTime=t;const calls=[];const ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});g.biomes.draw(ctx,1);return calls;};assert.deepEqual(capture(17),capture(18));
});
test('player visibility and automatic exploration are restricted only inside an active snowstorm',()=>{
 const g=createGame(7),r=g.biomes.regions.find(r=>r.id==='snow'),p=g.player;p.x=r.x;p.y=r.y;g.gameTime=17;const near=spawnOrb(g.balance,{x:p.x+100,y:p.y}),far=spawnOrb(g.balance,{x:p.x+300,y:p.y});g.entities=[p,near,far];g.buildGrid();assert.equal(g.biomes.playerSightRadius(),208);assert(g.biomes.playerCanSee(near));assert(g.biomes.playerCanSee({x:p.x+100,y:p.y}));assert.equal(g.biomes.playerCanSee({x:p.x+300,y:p.y}),false);assert.equal(g.biomes.playerCanSee(far),false);
 g.relics.desired=()=>null;g.autoplay.setEnabled(true);g.autoplay.update(.1);assert.equal(g.autoplay.action.aim.x,near.x);assert.equal(g.autoplay.action.aim.y,near.y);near.alive=false;g.autoplay.timer=0;g.autoplay.update(.1);assert.notEqual(g.autoplay.action.aim.x,far.x);
 g.gameTime=24;assert.equal(g.biomes.playerSightRadius(),Infinity);assert(g.biomes.playerCanSee(far));p.size=600;g.gameTime=17;assert.equal(g.biomes.playerSightRadius(),340);
});
test('opportunity assessment is read-only, uses attainable clusters and accounts for nearby danger',()=>{
 const g=createGame(7),p=g.player;p.x=p.y=4000;const food=spawnOrb(g.balance,{x:4100,y:4000});g.entities=[p,food];g.buildGrid();g.autoplay.setEnabled(true);resetRandom(9);const expected=random('ai');resetRandom(9);const good=assessGameplay(g);assert(good.growthOpportunity);assert(good.potentialSizeGain>=good.growthNeeded);assert.equal(random('ai'),expected);assert.equal(food.alive,true);
 const enemy=new AIEntity({x:4100,y:4000,startSize:80,color:p.color==='red'?'blue':'red',colorHex:'#f00',balance:g.balance});g.entities.push(enemy);g.buildGrid();const dangerous=assessGameplay(g);assert(dangerous.crisis);assert(dangerous.crisisSeverity>0);assert.equal(dangerous.growthOpportunity,false);
});
test('assessment targets scale with current size and insufficient resources stay below threshold',()=>{
 const g=createGame(7),p=g.player;p.growth=growthFromSize(160,p.baseSize,g.balance.growth.growthToSizeRatio,g.balance.growth);p.refreshFromGrowth(g.balance);const food=spawnOrb(g.balance,{x:p.x+100,y:p.y});food.growthValue=5;g.entities=[p,food];g.buildGrid();const row=assessGameplay(g);assert(Math.abs(row.growthNeeded-1.6)<1e-10);assert.equal(row.growthOpportunity,false);
});
test('continuous opportunity counts as covered windows; missing encounters are retained, not dropped',()=>{
 const rows=Array.from({length:15},(_,i)=>({time:i+1,size:30,defeats:0,purposeful:true,growthOpportunity:i<5,potentialSizeGain:1,crisis:false,crisisSeverity:0}));const s=evaluationSummary(rows,{encounterSeconds:5});assert.equal(s.growth.longestDrySeconds,10);assert.equal(s.growth.unfinishedWaitSeconds,10);assert.equal(s.crisis.encounters,0);assert.equal(s.crisis.meanSeconds,null);assert.equal(s.crisis.longestDrySeconds,15);assert.equal(s.growth.qualifiedWindows,11);assert(s.growth.coverage>0&&s.growth.coverage<1);
 const full=evaluationSummary(rows.map(s=>({...s,growthOpportunity:true})),{encounterSeconds:5});assert.equal(full.growth.coverage,1);assert.equal(full.growth.longestDrySeconds,0);
});
