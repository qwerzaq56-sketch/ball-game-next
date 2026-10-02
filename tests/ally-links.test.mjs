import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,updateAI} from '../js/ai.js';
import {canAbsorb} from '../js/collision.js';
import {canStartAttack,applyDamage} from '../js/combat.js';
import {resetRandom,random} from '../js/random.js';
function fixture(){const g=createGame(11);const make=(x,size=40,color='blue')=>new AIEntity({x,y:1000,startSize:size,color,colorHex:'#39f',balance:g.balance});const a=make(1000),b=make(1130),c=make(1260);g.entities=[a,b,c];return {g,a,b,c,make};}
test('ally edges enter at surface 100 and hold until 140; direct neighbors only',()=>{
 const {g,a,b,c}=fixture();g.allyLinks.refresh();assert.equal(g.allyLinks.edges.size,2);assert.equal(g.allyLinks.neighbors(a).length,1);assert.equal(g.allyLinks.bonus(b),.10);
 b.x=1170;g.allyLinks.refresh();assert(g.allyLinks.connected(a,b));b.x=1181;g.allyLinks.refresh();assert(!g.allyLinks.connected(a,b));
 c.color='red';g.allyLinks.refresh();assert.equal(g.allyLinks.edges.size,0);
});
test('large units are not missed by grid range and bonuses cap at three direct allies',()=>{
 const {g,a,make}=fixture();a.size=800;const allies=Array.from({length:5},(_,i)=>make(1450+i));g.entities=[a,...allies];g.allyLinks.refresh();assert.equal(g.allyLinks.neighbors(a).length,5);assert(Math.abs(g.allyLinks.bonus(a)-.15)<1e-8);
 allies.forEach(e=>e.alive=false);assert.equal(g.allyLinks.bonus(a),0);
});
test('joining blocks all aggression and leaves free movement/attacks available after departure',()=>{
 const {g,a,b,c}=fixture();a.size=100;a.attackUnlocked=true;a.attackStack=2;g.allyLinks.refresh();assert(g.allyLinks.join(a,b));
 assert.equal(canStartAttack(a),false);assert.equal(canAbsorb(a,c),false);a.apex=true;a.specialCooldown=0;assert.equal(g.abilities.canCast(a),false);
 c.color='red';const hp=c.hp;assert.equal(applyDamage(c,100,g,a,g.balance),false);assert.equal(c.hp,hp);
 g.allyLinks.leave(a);assert.equal(a.companionGroup,null);assert.equal(b.companionGroup,null);assert.equal(canStartAttack(a),true);
});
test('followers form up without combat and group dissolves when separated or dead',()=>{
 const {g,a,b}=fixture();g.entities=[a,b];g.allyLinks.refresh();g.allyLinks.join(b,a);const x=b.x;
 for(let i=0;i<60;i++)updateAI(b,1/60,g,g.balance);
 assert.equal(b.state,'companion');assert.notEqual(b.x,x);assert.equal(b.attackState,'READY');
 a.x=3000;g.allyLinks.refresh();assert.equal(b.companionGroup,null);assert.equal(g.allyLinks.groups.size,0);
 a.x=1000;b.x=1100;a.companionCooldown=0;b.companionCooldown=0;g.allyLinks.refresh();g.allyLinks.join(b,a);a.alive=false;g.allyLinks.refresh();assert.equal(b.companionGroup,null);
});
test('player is the formation leader and formation entry/exit can occur probabilistically',()=>{
 const {g,a}=fixture();g.player.x=a.x;g.player.y=a.y;g.entities=[g.player,a];
 let joinSeed;for(let s=0;s<100;s++){resetRandom(s);if(random('ai')<.18){joinSeed=s;break;}}
 resetRandom(joinSeed);g.allyLinks.update(0);assert(g.player.companionGroup);assert.equal(g.allyLinks.groups.get(a.companionGroup).leader,g.player);
 let leaveSeed;for(let s=0;s<100;s++){resetRandom(s);if(random('ai')<.08){leaveSeed=s;break;}}
 resetRandom(leaveSeed);g.allyLinks.timer=0;g.player.companionCooldown=0;a.companionCooldown=0;g.allyLinks.update(0);assert.equal(g.player.companionGroup,null);
});
test('edge drawing and refresh consume no random numbers; reset clears links and groups',()=>{
 const {g,a,b}=fixture();g.allyLinks.refresh();g.allyLinks.join(a,b);resetRandom(9);const expected=random('ai');resetRandom(9);
 const ctx=new Proxy({}, {get:()=>()=>{},set:()=>true});g.allyLinks.draw(ctx,1);g.allyLinks.refresh();assert.equal(random('ai'),expected);
 g.reset();assert.equal(g.allyLinks.groups.size,0);assert.equal(g.allyLinks.edges.size,0);
});

test('a player joining an existing AI formation becomes its leader; leaders move at the slowest member pace',()=>{
 const {g,a,b}=fixture();a.moveSpeed=200;b.moveSpeed=80;g.entities=[a,b,g.player];g.player.x=1100;g.player.y=1000;
 g.allyLinks.refresh();assert(g.allyLinks.join(b,a));assert(g.allyLinks.join(g.player,a));
 const group=g.allyLinks.groups.get(a.companionGroup);assert.equal(group.leader,g.player);
 g.allyLinks.leave(g.player);assert.equal(group.leader,a);a.wanderAngle=0;a.wanderTimer=3;
 const x=a.x;g.allyLinks.move(a,1);assert.equal(a.x-x,44);
});

test('companion danger uses separate entry and release distances, and forgets invalid threats',()=>{
 const {g,a,b,make}=fixture();const enemy=make(1319,80,'red');g.entities=[a,b,enemy];g.buildGrid();g.allyLinks.refresh();g.allyLinks.join(a,b);
 g.allyLinks.move(a,0);assert.equal(a.state,'flee');assert.equal(a.companionThreat,enemy);
 enemy.x=1350;g.buildGrid();g.allyLinks.move(a,0);assert.equal(a.state,'flee');
 enemy.x=1401;g.buildGrid();g.allyLinks.move(a,0);assert.equal(a.state,'companion');assert.equal(a.companionThreat,null);
 enemy.x=1321;g.buildGrid();g.allyLinks.move(a,0);assert.equal(a.state,'companion');
 enemy.x=1319;g.buildGrid();g.allyLinks.move(a,0);enemy.alive=false;g.allyLinks.move(a,0);assert.equal(a.state,'companion');
});

test('sand escape holds to 420 after entering at 360; joining removes maintained attacks and outgoing absorption',()=>{
 const {g,a,b,make}=fixture();const owner=make(2000,120,'yellow');owner.apex=true;g.entities=[a,b,owner];
 g.abilities.fields=[{owner,x:1359,y:1000,time:0,tick:0}];g.allyLinks.refresh();g.allyLinks.join(a,b);
 g.allyLinks.move(a,0);assert.equal(a.state,'flee');g.abilities.fields[0].x=1419;g.allyLinks.move(a,0);assert.equal(a.state,'flee');
 g.abilities.fields[0].x=1421;g.allyLinks.move(a,0);assert.equal(a.state,'companion');
 g.allyLinks.leave(a);g.abilities.fields.push({owner:a,x:1000,y:1000,time:0,tick:0});b.beingAbsorbedByRef=a;
 g.allyLinks.enter(a,{id:99});assert(!g.abilities.fields.some(f=>f.owner===a));assert.equal(b.beingAbsorbedByRef,null);
});

test('leaders steer back from borders and command skills skip peaceful companions',()=>{
 const {g,a,b}=fixture();g.entities=[a,b];g.allyLinks.refresh();g.allyLinks.join(a,b);
 const leader=g.allyLinks.groups.get(a.companionGroup).leader;leader.x=leader.size/2;leader.wanderAngle=Math.PI;leader.wanderTimer=2;
 g.allyLinks.move(leader,.1);assert(leader.x>leader.size/2);
 const owner={...g.player,size:200,color:a.color};g.abilities.command(owner,'harvest',6,500,{id:1});assert.equal(a.command,undefined);assert.equal(b.command,undefined);
});
test('companions keep escaping same-color absorbers beyond their size-driven connection range',()=>{
 const {g,a,b,make}=fixture(),owner=make(1529,1000);g.entities=[a,b,owner];g.allyLinks.refresh();g.allyLinks.join(a,b);
 a.beingAbsorbedByRef=owner;g.allyLinks.move(a,0);assert.equal(a.state,'flee');assert.equal(a.escapeAbsorber,owner);
 a.beingAbsorbedByRef=null;owner.x=1550;g.allyLinks.move(a,0);assert.equal(a.state,'flee');
 owner.x=1611;g.allyLinks.move(a,0);assert.equal(a.state,'companion');assert.equal(a.escapeAbsorber,null);
 owner.x=1529;a.escapeAbsorber=owner;g.allyLinks.leave(a);g.allyLinks.join(a,b);assert.equal(a.escapeAbsorber,owner);owner.alive=false;g.allyLinks.move(a,0);assert.equal(a.escapeAbsorber,null);
});
