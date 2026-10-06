import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {BIOME_OBJECTS,DEFAULT_OBJECT_IDS,OBJECT_REGIONS,defaultObjectPreset,applyObjectPreset} from '../js/biomeObjectCatalog.js';
import {LANDMARK_PRESENTATION} from '../js/landmarkArt.js';
function setup(id){const g=createGame(7),p=g.player;g.entities=[p];g.biomes.enabled=true;const preset=defaultObjectPreset();preset.enabled=[id];preset.countPerType=1;applyObjectPreset(g.balance,preset);g.biomeObjects.sync();const o=g.biomeObjects.objects[0];p.x=o.x;p.y=o.y;p.hp=p.maxHp=1000;g.buildGrid();return {g,p,o};}
test('R-VIS-003 recovery decoration requires successful benefit, not proximity',()=>{
 const {g,p,o}=setup('desert-oasis');g.gameTime=10;
 g.biomeObjects.update(1);assert.equal(p.healVisualUntil,undefined);
 p.hp=500;g.biomeObjects.update(1);assert(p.hp>500);assert.equal(p.healVisualUntil,10.22);
 delete p.healVisualUntil;p.x=o.x+o.config.radius+p.size/2+1;g.buildGrid();const hp=p.hp;
 g.biomeObjects.update(1);assert.equal(p.hp,hp);assert.equal(p.healVisualUntil,undefined);
 const shelter=setup('snow-shelter');shelter.g.gameTime=12;shelter.p.frostbiteRemaining=1;shelter.p.frostExposure=6;
 shelter.g.biomes.update(.1);assert.equal(shelter.p.frostbiteRemaining,0);assert.equal(shelter.p.frostClearVisualUntil,12.3);
 delete shelter.p.frostClearVisualUntil;shelter.g.biomes.update(.1);assert.equal(shelter.p.frostClearVisualUntil,undefined);
});
test('R-WORLD-016 scaled landmark ranges match presentation and continuous contact stops outside',()=>{
 for(const [id,profile]of Object.entries(LANDMARK_PRESENTATION)){
  const {o}=setup(id);assert.equal(BIOME_OBJECTS[id].radius,profile.radius);
  assert.equal(o.config.radius,profile.radius*o.visualScale);
 }
 const {g,p,o}=setup('desert-oasis');p.hp=500;
 p.x=o.x+o.config.radius+p.size/2-.1;g.buildGrid();g.biomeObjects.update(1);assert(p.hp>500);
 const healed=p.hp;p.x=o.x+o.config.radius+p.size/2+.1;g.buildGrid();g.biomeObjects.update(1);assert.equal(p.hp,healed);
});
test('each biome has two active candidates, with three in the lake placed in its own biome deterministically',()=>{for(const region of Object.keys(OBJECT_REGIONS))assert.equal(DEFAULT_OBJECT_IDS.map(id=>BIOME_OBJECTS[id]).filter(c=>c.region===region).length,region==='lake'?3:2);const a=createGame(7),b=createGame(7);a.biomeObjects.sync();b.biomeObjects.sync();assert.equal(a.biomeObjects.objects.length,64);assert.deepEqual(a.biomeObjects.objects,b.biomeObjects.objects);for(const o of a.biomeObjects.objects)assert.equal(a.biomes.regionAt(o).id,o.config.region);});
test('invalid imports reject transactionally and settings are copied',()=>{const {g}=setup('grass-flowers'),p=defaultObjectPreset();p.overrides['grass-flowers']={growth:90};applyObjectPreset(g.balance,p);p.overrides['grass-flowers'].growth=1;assert.equal(g.balance.biomeObjects.overrides['grass-flowers'].growth,90);const before=JSON.stringify(g.balance.biomeObjects);for(const bad of [{...p,enabled:['missing']},{...p,countPerType:0},{...p,overrides:{'grass-flowers':{growth:NaN}}},{...p,overrides:JSON.parse('{"__proto__":{"power":0.1}}')}]){assert.throws(()=>applyObjectPreset(g.balance,bad));assert.equal(JSON.stringify(g.balance.biomeObjects),before);}});
test('food objects respect global cooldown, disabled candidates and orb capacity',()=>{const {g,o}=setup('grass-flowers');g.biomeObjects.update();assert.equal(g.entities.length,4);assert.equal(g.entities[1].growthValue,45);g.biomeObjects.update();assert.equal(g.entities.length,4);const p=defaultObjectPreset();p.enabled=[];applyObjectPreset(g.balance,p);g.biomeObjects.update();assert.equal(g.biomeObjects.objects.length,0);p.enabled=['grass-flowers'];p.countPerType=1;applyObjectPreset(g.balance,p);g.biomeObjects.update();assert.equal(g.entities.length,4);g.gameTime=o.config.cooldown;g.balance.spawning.maxOrbCount=4;g.biomeObjects.update();assert.equal(g.entities.length,5);});
test('objects require body contact and heal only wounded actors',()=>{const {g,p,o}=setup('lake-spring');g.biomeObjects.update();assert.equal(g.biomeObjects.events.length,0);p.hp=950;p.x=o.x+o.config.radius+p.size/2+1;g.buildGrid();g.biomeObjects.update();assert.equal(p.hp,950);p.x=o.x;g.buildGrid();g.biomeObjects.update();assert.equal(p.hp,1000);});
test('shield, speed, frost protection and volcanic cost apply to the touching actor',()=>{let {g,p}=setup('forest-tree');g.biomeObjects.update();assert.equal(p.shieldHp,80);assert.equal(p.shieldRemaining,6);({g,p}=setup('grass-windstone'));g.biomeObjects.update();assert.equal(g.abilities.speedMultiplier(p),1.25);g.gameTime=4;assert.equal(g.abilities.speedMultiplier(p),1);({g,p}=setup('snow-shelter'));g.biomeObjects.update();p.color='green';p.size=40;assert.equal(g.biomes.frostResistance(p),.15);p.x+=500;assert.equal(g.biomes.frostResistance(p),0);({g,p}=setup('volcano-vent'));g.biomeObjects.update();assert.equal(p.hp,990);assert.equal(g.abilities.speedMultiplier(p),1.35);});
test('ice flowers double their food value during a blizzard',()=>{const {g}=setup('snow-flowers');g.gameTime=16;assert(g.biomes.blizzard());g.biomeObjects.update();assert.equal(g.entities[1].growthValue,130);});

test('oasis continuously heals all occupants without shared cooldown, and stops on exit',()=>{const {g,p,o}=setup('desert-oasis');const a={...p,id:p.id+100,hp:500};p.hp=500;g.entities=[p,a];g.buildGrid();g.biomeObjects.cooldowns.set(o.id,100);g.biomeObjects.update(2);assert.equal(p.hp,520);assert.equal(a.hp,520);p.x=o.x+o.config.radius+p.size/2+1;g.buildGrid();g.biomeObjects.update(2);assert.equal(p.hp,520);assert.equal(a.hp,540);g.biomes.enabled=false;g.biomeObjects.update(2);assert.equal(a.hp,540);});

test('current counterflow cannot overpower ordinary actor movement and object scales repeat deterministically',()=>{const {g,p,o}=setup('lake-current');p.size=40;p.moveSpeed=100;p.x=o.points[0].x;p.y=o.points[0].y;g.buildGrid();const vector=g.biomeObjects.currentVector(o,p),before={x:p.x,y:p.y};g.biomeObjects.update(.1);const moved=Math.hypot(p.x-before.x,p.y-before.y);assert(moved<=100*g.biomes.moveMultiplier(p)*.25*.1+1e-6);assert(vector);const a=createGame(7),b=createGame(7);a.biomeObjects.sync();b.biomeObjects.sync();assert.deepEqual(a.biomeObjects.objects.map(o=>o.visualScale),b.biomeObjects.objects.map(o=>o.visualScale));assert(new Set(a.biomeObjects.objects.map(o=>o.visualScale)).size>5);assert.equal(a.biomeObjects.objects.filter(o=>o.candidate==='desert-oasis').length,2);});

test('approved larger oasis preserves variation, count and healing power while scaling body/range together',()=>{
 const a=createGame(7),b=createGame(7);a.biomeObjects.sync();b.biomeObjects.sync();
 const objects=a.biomeObjects.objects.filter(o=>o.candidate==='desert-oasis');assert.equal(objects.length,2);
 let hash=7;for(const char of 'desert-oasis')hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 for(const [i,o]of objects.entries()){
  const oldVariation=.8+((hash+i*73)%401)/1000;
  assert.equal(o.visualScale,oldVariation*1.4);
  assert.equal(o.config.radius,BIOME_OBJECTS['desert-oasis'].radius*o.visualScale);
  assert.equal(o.config.power,BIOME_OBJECTS['desert-oasis'].power*2);
 }
 assert.deepEqual(objects,b.biomeObjects.objects.filter(o=>o.candidate==='desert-oasis'));
});
