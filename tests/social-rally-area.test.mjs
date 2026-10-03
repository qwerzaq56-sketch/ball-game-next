import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,updateAI} from '../js/ai.js';
import {isHostile,dist} from '../js/collision.js';
import {applyDamage} from '../js/combat.js';
import {absorptionGrowthFor,startAbsorption,updateAbsorptions} from '../js/absorption.js';
import {resetRandom,random} from '../js/random.js';
import {AFFINITY} from '../js/allyLinks.js';
const actor=(g,x,color='blue',size=100)=>new AIEntity({x,y:4000,color,colorHex:'#39f',startSize:size,balance:g.balance});
function setup(){const g=createGame(7);g.entities=[];g.biomes.enabled=false;return g;}
test('affinity is independent of combat personality and persists after role reassignment',()=>{
 const g=createGame(7);assert(g.entities.filter(e=>e.behavior==='ai').every(e=>Object.keys(AFFINITY).includes(e.companionAffinity)));const a=g.entities.find(e=>e.behavior==='ai'),trait=a.companionAffinity;g.ecology.update(g,2);assert.equal(a.companionAffinity,trait);
 assert(AFFINITY.social.join>AFFINITY.neutral.join&&AFFINITY.neutral.join>AFFINITY.independent.join);assert(AFFINITY.social.leave<AFFINITY.neutral.leave&&AFFINITY.neutral.leave<AFFINITY.independent.leave);
});
test('Q proposal respects range, cooldown, frozen state, capacity and recipient preference',()=>{
 const g=setup(),a=actor(g,4000),b=actor(g,4100),far=actor(g,4500);b.companionAffinity='social';g.entities=[a,b,far];g.buildGrid();let seed;for(let i=0;i<100;i++){resetRandom(i);if(random('ai')<.85){seed=i;break;}}resetRandom(seed);
 assert(g.allyLinks.offer(a));assert(a.companionGroup);assert.equal(b.companionGroup,a.companionGroup);assert.equal(far.companionGroup,undefined);assert.equal(g.allyLinks.offer(a),false);a.frozen=1;g.gameTime=9;assert.equal(g.allyLinks.offer(a),false);
});
test('festival enables mixed-color companionship, prevents friendly direct and field damage, then restores hostility',()=>{
 const g=setup(),a=actor(g,4000),b=actor(g,4100,'red');g.entities=[a,b];g.buildGrid();assert(isHostile(a,b));assert.equal(g.allyLinks.recruit(a,b,true),false);
 g.gameTime=60;g.allyLinks.timer=10000;g.allyLinks.update(0);assert.equal(g.allyLinks.truceUntil,80);assert(g.allyLinks.recruit(a,b,true));g.allyLinks.refresh();assert(g.allyLinks.edges.size>0);assert.equal(isHostile(a,b),false);assert.equal(g.allyLinks.bonus(a),0);
 const hp=b.hp;assert.equal(applyDamage(b,100,g,a,g.balance),false);assert.equal(applyDamage(b,100,g,a,g.balance,{kind:'field'}),false);assert.equal(b.hp,hp);
 g.gameTime=80;g.allyLinks.refresh();assert.equal(a.companionGroup,null);assert.equal(b.companionGroup,null);assert(isHostile(a,b));
});
test('mixed-color group membership does not end just because color differs, death still dissolves it',()=>{
 const g=setup(),a=actor(g,4000),b=actor(g,4080,'red');g.entities=[a,b];g.allyLinks.truceUntil=80;assert(g.allyLinks.recruit(a,b,true));g.allyLinks.refresh();assert.equal(g.allyLinks.groups.size,1);b.alive=false;g.allyLinks.refresh();assert.equal(g.allyLinks.groups.size,0);
});
test('red marks all enemies in the aimed area and buffs nearby same-color units without player autopilot',()=>{
 const g=setup(),p=g.player;p.x=p.y=4000;p.color='red';p.size=150;p.apex=true;p.specialCooldown=0;const ally=actor(g,4100,'red'),near=actor(g,4300,'blue'),inside=actor(g,4500,'green'),outside=actor(g,4300,'yellow');outside.y=4300;g.entities=[p,ally,near,inside,outside];g.buildGrid();
 assert(g.abilities.start(p,0,{x:4300,y:4000}));g.abilities.update(.8);assert.equal(g.abilities.rallies.length,1);const rally=g.abilities.rallies[0];assert(rally.targets.has(near)&&rally.targets.has(inside)&&!rally.targets.has(outside));assert.equal(g.abilities.speedMultiplier(ally),1.25);assert(g.abilities.damageMultiplier(ally)>=1.3);assert.equal(p.command,undefined);assert.equal(ally.command.kind,'rally');assert.equal(g.abilities.speedMultiplier(near),1);
 g.gameTime=6;g.abilities.update(0);assert.equal(g.abilities.speedMultiplier(ally),1);assert.equal(g.abilities.rallies.length,0);
});
test('red mark command chooses another marked enemy after a kill and stops for low HP or a truce',()=>{
 const g=setup(),owner=actor(g,4000,'red',200),ally=actor(g,4100,'red'),a=actor(g,4200,'blue'),b=actor(g,4300,'green');owner.apex=true;g.entities=[owner,ally,a,b];g.buildGrid();g.abilities.fire(owner,{id:1,dir:0,point:{x:4250,y:4000}});assert(g.abilities.commandDecision(ally));assert.equal(ally.target,a);a.alive=false;assert(g.abilities.commandDecision(ally));assert.equal(ally.target,b);ally.hp=ally.maxHp*.2;assert.equal(g.abilities.commandDecision(ally),false);assert.equal(ally.command,null);
 g.abilities.release(owner);assert.equal(g.abilities.speedMultiplier(ally),1);
});
test('a formation member can obey red marking while retaining companion membership',()=>{
 const g=setup(),owner=actor(g,4000,'red',200),ally=actor(g,4100,'red'),target=actor(g,4250,'blue');owner.apex=true;g.entities=[owner,ally,target];g.buildGrid();g.allyLinks.refresh();g.allyLinks.join(ally,owner);g.abilities.fire(owner,{id:1,dir:0,point:{x:4250,y:4000}});updateAI(ally,.01,g,g.balance);assert.equal(ally.target,target);assert(ally.companionGroup);assert.equal(ally.attackState,'TELEGRAPH');
});
test('absorption carries 80 percent of target area even if target has zero accumulated growth',()=>{
 for(const who of ['ai','player']){const g=setup(),a=who==='player'?g.player:actor(g,4000,'blue',100),b=actor(g,4000,a.color,80);a.size=100;a.x=a.y=4000;g.entities=[a,b];const expected=Math.sqrt(10000+.8*6400);assert.equal(b.growth,0);assert(absorptionGrowthFor(a,b,g.balance)>0);startAbsorption(a,b,g.balance,g);b.absorptionRequired=.001;updateAbsorptions(g,.1,g.balance);assert(Math.abs(a.size-expected)<1e-9);assert.equal(b.alive,false);}
});
test('overlap relaxation is gradual, bounded and ignores action phases and temporary allies',()=>{
 const g=setup(),a=actor(g,4000),b=actor(g,4020,'red');g.entities=[a,b];g.buildGrid();g.resolvePushApart(1/60);assert(a.x<4000&&4000-a.x<3);assert(dist(a,b)<100);const x=a.x;a.attackState='CHARGING';g.resolvePushApart(1/60);assert.equal(a.x,x);a.attackState='RECOVERY';g.resolvePushApart(1/60);assert(x-a.x<3);
 g.allyLinks.truceUntil=80;g.allyLinks.recruit(a,b,true);const before=a.x;g.resolvePushApart(.1);assert.equal(a.x,before);
});
test('collision easing is stable across frame rates instead of a one-frame pop',()=>{
 const run=hz=>{const g=setup(),a=actor(g,4000),b=actor(g,4020,'red');g.entities=[a,b];for(let i=0;i<hz;i++){g.buildGrid();g.resolvePushApart(1/hz);}return dist(a,b);};assert(Math.abs(run(30)-run(60))<.02);assert(Math.abs(run(60)-run(120))<.02);
});

test('red accepts aimed enemies beyond default target search and follows their moving marks',()=>{
 const g=setup(),owner=actor(g,4000,'red',200),ally=actor(g,4050,'red'),target=actor(g,4550,'blue');owner.apex=true;owner.specialCooldown=0;g.entities=[owner,ally,target];g.buildGrid();assert(g.abilities.start(owner,0,{x:4350,y:4000}));g.abilities.update(.8);target.x=4800;assert(g.abilities.commandDecision(ally));assert.equal(ally.target,target);assert.equal(ally.state,'chase_fight');assert.deepEqual(ally.command.point,{x:4800,y:4000});
});
