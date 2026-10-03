import test from 'node:test';import assert from 'node:assert/strict';
import {sizeFromGrowth,growthFromSize} from '../js/entity.js';import {lavaResistance} from '../js/biomes.js';import {targetSize,BalanceMetrics} from '../js/balanceMetrics.js';import {normalizeFeedback} from '../js/balanceFeedback.js';import {createGame} from '../tools/headless.mjs';import {applyDamage} from '../js/combat.js';import {absorptionGrowthFor} from '../js/absorption.js';
test('late growth preserves early curve, remains monotonic and round trips at large sizes',()=>{const c={lateThreshold:25,lateTransition:50,lateMultiplier:2};assert.equal(sizeFromGrowth(625,20,1.6,c),60);assert.equal(sizeFromGrowth(100,20,1.6,c),36);for(const size of [20,80,100,160,400,900])assert(Math.abs(sizeFromGrowth(growthFromSize(size,20,1.6,c),20,1.6,c)-size)<1e-7);assert(sizeFromGrowth(100000,20,1.6,c)>sizeFromGrowth(100000,20,1.6)*1.5);});
test('area transfer remains 80 percent under the late growth curve',()=>{const g=createGame(7),p=g.player;p.growth=growthFromSize(400,p.baseSize,1.6,g.balance.growth);p.refreshFromGrowth(g.balance);const delta=absorptionGrowthFor(p,{size:300},g.balance);p.addGrowth(delta,g.balance);assert(Math.abs(p.size*p.size-(400*400+.8*300*300))<1e-5);});
test('red lava resistance increases with size but cannot grant immunity',()=>{const b={biomes:{redLavaResistancePerSize:.002,maxRedLavaResistance:.85}};assert.equal(lavaResistance({color:'blue',size:1000},b),0);assert.equal(lavaResistance({color:'red',size:100},b),.2);assert.equal(lavaResistance({color:'red',size:1000},b),.85);b.biomes.maxRedLavaResistance=5;assert(lavaResistance({color:'red',size:10000},b)<1);});
test('damage measurements record real loss before regen and exclude invincibility',()=>{const g=createGame(7),p=g.player;g.balanceLog=new BalanceMetrics(g,'test');p.hp=p.maxHp=100;applyDamage(p,30,g,null,g.balance,{kind:'field',knockback:false});const r=g.balanceLog.export().groups[0];assert.equal(r.damage,20);assert.equal(r.hpLostRatio,.2);p.invincible=true;applyDamage(p,30,g,null,g.balance);assert.equal(r.hits,1);});
test('time targets interpolate and feedback rejects impossible records',()=>{assert.equal(targetSize(30,[{seconds:0,size:20},{seconds:60,size:60}]),40);assert.equal(targetSize(100,[{seconds:0,size:20}]),20);assert.equal(normalizeFeedback([{time:5,desiredSize:80,satisfaction:4,pressure:3},{time:-1,desiredSize:80,satisfaction:4,pressure:3}]).length,1);});

test('hunting drops scale with victim size and retain its accumulated capital without duplicate direct reward',async()=>{const {spawnDeathOrbs}=await import('../js/spawning.js');const g=createGame(7),b=g.balance;for(const size of [40,100,400]){const growth=growthFromSize(size,20,b.growth.growthToSizeRatio,b.growth),dead={x:100,y:100,size,baseSize:20,growth,color:'red',colorHex:'#f00',id:900};const orbs=spawnDeathOrbs(dead,b),sum=orbs.reduce((s,o)=>s+o.growthValue,0),direct=b.killReward.baseReward*Math.pow(size/b.killReward.referenceSize,b.killReward.growthExponent)*b.killReward.growthRewardMultiplier;assert(sum+1e-8>=size*b.killReward.growthPerSize);assert(sum+direct+1e-8>=growth*.9);assert(orbs.length<=b.killReward.orbMaxCount);assert(orbs.every(o=>o.rewardSource===900&&Number.isFinite(o.growthValue)));}});
test('lava resistance after defense retains gradual real damage rather than collapsing prematurely to minimum',()=>{const g=createGame(7),p=g.player;p.size=200;p.maxHp=p.hp=1000;p.invincible=false;applyDamage(p,160,g,null,g.balance,{kind:'field',knockback:false,postDefenseMultiplier:.6});assert.equal(p.hp,964);assert.equal(p.damageHpRatio,.036);});
test('area-based food replenishment increases when scarce while respecting the global cap',async()=>{const {spawnOrb}=await import('../js/spawning.js');const g=createGame(7);g.entities=[g.player,...Array.from({length:100},()=>spawnOrb(g.balance))];g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(g.entities.length,107);g.balance.spawning.maxOrbCount=107;g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(g.entities.length,108);g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(g.entities.length,108);g.balance.world.worldWidth=g.balance.world.worldHeight=1000;g.balance.spawning.maxOrbCount=2400;g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(g.entities.length,109);});

test('density replenishment sustains its target under continuous consumption within the batch budget',async()=>{
 const {spawnOrb}=await import('../js/spawning.js'),g=createGame(7),count=()=>g.entities.filter(e=>e.alive&&e.behavior==='orb').length;
 const target=g.balance.spawning.minimumOrbDensity*g.balance.world.worldWidth*g.balance.world.worldHeight/1e6;
 g.entities=[g.player,...Array.from({length:target},()=>spawnOrb(g.balance))];
 for(let i=0;i<80;i++){g.entities.splice(1,3);g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(count(),target);}
 // A burst beyond the per-tick budget takes several bounded refills.
 g.entities.splice(1,20);g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(count(),target-14);
 for(let i=0;i<3;i++){g.orbSpawnTimer=0;g.orbSpawnLoop(.1);}assert.equal(count(),target);
 g.balance.spawning.maxOrbCount=target-1;g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(count(),target);
 g.entities.splice(1,3);g.orbSpawnTimer=0;g.orbSpawnLoop(.1);assert.equal(count(),target-1);
});

test('natural food Growth can be tuned independently of food shape, RNG, hunting drops and density',async()=>{
 const {spawnOrb,spawnDeathOrbs}=await import('../js/spawning.js'),{resetRandom}=await import('../js/random.js'),g=createGame(7),b=g.balance;const spawn=()=>Array.from({length:20},()=>spawnOrb(b));resetRandom(817);const before=spawn();b.spawning.naturalFoodGrowthMultiplier=2;resetRandom(817);const after=spawn();for(let i=0;i<before.length;i++){for(const key of ['x','y','size','color'])assert.equal(before[i][key],after[i][key]);assert.equal(after[i].growthValue,before[i].growthValue*2);}const dead={x:1000,y:1000,size:100,baseSize:20,growth:2000,color:'red',colorHex:'#f00',id:900};resetRandom(834);const drops=spawnDeathOrbs(dead,b).map(o=>o.growthValue);b.spawning.naturalFoodGrowthMultiplier=1;resetRandom(834);assert.deepEqual(spawnDeathOrbs(dead,b).map(o=>o.growthValue),drops);b.spawning.naturalFoodGrowthMultiplier=-2;assert(spawnOrb(b).growthValue>0);b.spawning.naturalFoodGrowthMultiplier=Infinity;resetRandom(817);assert.equal(spawnOrb(b).growthValue,before[0].growthValue);
});

test('large kill drops keep at least ninety percent close without changing rewards or random consumption',async()=>{
 const {spawnDeathOrbs}=await import('../js/spawning.js'),{resetRandom}=await import('../js/random.js'),g=createGame(7),b=g.balance;
 for(const size of [299,300,400,1000,1500])for(const seed of [1,7,31]){
  const dead={x:4000,y:4000,size,baseSize:20,growth:10000,color:'red',colorHex:'#f00',id:900};
  resetRandom(seed);const drops=spawnDeathOrbs(dead,b);
  const legacy=structuredClone(b);legacy.killReward.compactDropMinSize=Infinity;resetRandom(seed);const previous=spawnDeathOrbs(dead,legacy);
  assert.deepEqual(drops.map(o=>[o.size,o.growthValue]),previous.map(o=>[o.size,o.growthValue]));
  const radius=o=>Math.hypot(o.x-dead.x,o.y-dead.y);
  if(size<300)assert.deepEqual(drops.map(o=>[o.x,o.y]),previous.map(o=>[o.x,o.y]));
  else{
   assert(drops.filter(o=>radius(o)>size*.9+1e-8).length<=Math.floor(drops.length*.1));
   assert(drops.filter(o=>radius(o)+o.size/2>size*2).length<=Math.floor(drops.length*.1));
   assert(drops.every(o=>radius(o)<=size*2.25+1e-8));
  }
 }
});
