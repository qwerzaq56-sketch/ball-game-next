import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';import {updateSprint} from '../js/sprint.js';import {AIEntity,decideAI,updateAI} from '../js/ai.js';import {Entity} from '../js/entity.js';import {startAttack,updateAttack} from '../js/combat.js';
const actor=(g,color='green',x=4000,size=200)=>new AIEntity({balance:g.balance,x,y:4000,startSize:size,color,colorHex:'#fff'});
test('sprint unlock, available dodge independence, stamina exhaustion and release recovery',()=>{
 const g=createGame(7),p=g.player;p.size=149;p.dodgeMaxStack=2;p.dodgeStack=0;
 assert.equal(updateSprint(p,.5,g.balance,{held:true,moving:true}),1);p.size=150;
 assert.equal(updateSprint(p,1,g.balance,{held:true,moving:true}),1.5);assert.equal(p.sprintGauge,2);
 p.dodgeStack=1;assert.equal(updateSprint(p,.1,g.balance,{held:true,moving:true}),1.5);p.dodgeStack=0;
 updateSprint(p,2,g.balance,{held:true,moving:true});assert.equal(p.sprintGauge,0);assert(p.sprintExhausted);
 assert.equal(updateSprint(p,.5,g.balance,{held:true,moving:true}),1);assert.equal(p.sprintGauge,0);
 updateSprint(p,1,g.balance,{held:false,moving:true});assert.equal(p.sprintGauge,.6);assert(!p.sprintExhausted);
 assert.equal(updateSprint(p,.1,g.balance,{held:true,moving:true}),1.5);
 p.attackState='CHARGING';assert.equal(updateSprint(p,.1,g.balance,{held:true,moving:true}),1);
});
test('sprint increases actual player movement after hold threshold with dodges available',()=>{
 const g=createGame(7),p=g.player;g.entities=[p];g.biomes.enabled=false;p.size=200;p.dodgeMaxStack=2;p.dodgeStack=0;p.x=4000;p.y=4000;p.dodgeStack=2;g.input.spaceHeldSeconds=.18;g.input.keys=new Set(['d',' ']);g.updatePlayer(.1);assert.equal(p.x,4037.5);assert(p.sprinting);g.input.keys.delete(' ');g.updatePlayer(.1);assert.equal(p.x,4062.5);
});
test('lava damages body overlap with an endpoint and the middle of a river while center stays outside',()=>{
 const g=createGame(7),p=g.player;g.entities=[p];g.biomes.enabled=true;g.biomes.sandstormTimer=1000;g.biomes.rivers=[{x:4000,y:4000,hotRadius:20},{x:4100,y:4000,hotRadius:20}];p.size=300;p.color='blue';p.x=4050;p.y=4160;p.maxHp=p.hp=1000;p.invincible=false;
 assert.equal(g.biomes.lavaAt(p),null);assert(g.biomes.lavaAt(p,p.size/2));g.biomes.damageTimer=0;g.biomes.update(.5);assert(p.hp<1000);
 p.x=4000;p.y=4190;assert.equal(g.biomes.lavaAt(p,p.size/2),null);
});
test('green E merges whole existing groups and buffs each member once',()=>{
 const g=createGame(7),caster=actor(g),mate=actor(g,'green',4100),otherLeader=actor(g,'green',4200),otherMember=actor(g,'green',4250),enemy=actor(g,'red',4050);g.entities=[caster,mate,otherLeader,otherMember,enemy];g.biomes.enabled=false;g.buildGrid();assert(g.allyLinks.recruit(caster,mate));assert(g.allyLinks.recruit(otherLeader,otherMember));const oldGroup=otherMember.companionGroup;
 const skill={...g.abilities.skill(caster,'E'),acceptChance:1};g.abilities.fireNormal(caster,{id:1,slot:'E',dir:0,skill});for(const e of [caster,mate,otherLeader,otherMember]){assert.equal(e.inviteBuffs.length,1);assert.equal(g.abilities.invitePower(e,'damage'),.05);}assert.notEqual(otherMember.companionGroup,oldGroup);assert.equal(otherMember.companionGroup,caster.companionGroup);assert(!g.allyLinks.groups.has(oldGroup));assert(!enemy.inviteBuffs?.length);
});
test('AI prefers high-value food per travel distance and moves faster to collect it',()=>{
 const g=createGame(7),a=actor(g,'blue',4000,100),small=new Entity({x:4050,y:4000,size:10,color:'blue',growthValue:5}),large=new Entity({x:4200,y:4000,size:20,color:'red',growthValue:200});g.entities=[a,small,large];g.biomes.enabled=false;g.abilities.considerAI=()=>false;g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.target,large);assert.equal(a.state,'chase_eat');a.decisionTimer=100;a.moveSpeed=200;updateAI(a,.1,g,g.balance);assert.equal(a.x,4024);
});

test('oversized or hostile group merges fail atomically without splitting either formation',()=>{
 const g=createGame(7),units=Array.from({length:7},(_,i)=>actor(g,'green',4000+i*20));g.entities=units;g.buildGrid();for(let i=1;i<4;i++)g.allyLinks.recruit(units[0],units[i]);for(let i=5;i<7;i++)g.allyLinks.recruit(units[4],units[i]);const ids=units.map(e=>e.companionGroup);assert.equal(g.allyLinks.merge(units[0],units[4]),false);assert.deepEqual(units.map(e=>e.companionGroup),ids);
 g.allyLinks.leave(units[3]);units[0].warTargets=new Set([units[6]]);assert.equal(g.allyLinks.merge(units[0],units[4]),false);assert.equal(units[6].companionGroup,ids[6]);
});

test('movement drives default facing; explicit drag overrides it and a tap dodge follows facing',()=>{
 const g=createGame(7),p=g.player;g.entities=[p];g.biomes.enabled=false;g.input.touchMode=true;g.input.touchMove={x:0,y:1};g.updatePlayer(.01);assert.equal(p.facing,Math.PI/2);
 g.touchAim={kind:'attack',dragged:true,angle:Math.PI,chargeSeconds:.2};g.updatePlayer(.01);assert.equal(p.facing,Math.PI);g.touchAim=null;g.input.touchMove={x:0,y:0};p.dodgeUnlocked=true;p.dodgeStack=1;p.dodgeMaxStack=1;g.input.consumeDodge=()=>true;g.updatePlayer(.01);assert.equal(p.dodgeDir,Math.PI);
});
