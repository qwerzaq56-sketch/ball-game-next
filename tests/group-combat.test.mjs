import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,updateAI,decideAI} from '../js/ai.js';
import {startAttack,updateAttack,applyDamage} from '../js/combat.js';
function setup(){const g=createGame(7);const unit=(x,color='blue',size=100)=>new AIEntity({x,y:4000,color,colorHex:'#39f',startSize:size,balance:g.balance});g.biomes.enabled=false;g.entities=[];return {g,unit};}
test('member votes plus leader triple vote give all three formation personalities',()=>{
 const {g,unit}=setup(),a=unit(4000),b=unit(4050),c=unit(4100);g.entities=[a,b,c];g.allyLinks.refresh();g.allyLinks.join(b,a);g.allyLinks.join(c,a);const group=g.allyLinks.groups.get(a.companionGroup);
 a.personality='growth';b.personality=c.personality='cautious';assert.equal(g.allyLinks.personality(group),'challenge');assert.deepEqual(g.allyLinks.profile(group).weights,{challenge:3,opportunity:0,avoidance:2});
 a.personality='opportunist';assert.equal(g.allyLinks.personality(group),'opportunity');a.personality='cautious';assert.equal(g.allyLinks.personality(group),'avoidance');
});
test('nearby allied strength permits stronger opponents but solitary and cautious units retreat',()=>{
 const {g,unit}=setup(),a=unit(4000),b=unit(4050),enemy=unit(4180,'red',160);a.personality=b.personality='growth';g.entities=[a,b,enemy];g.buildGrid();g.allyLinks.refresh();g.allyLinks.join(b,a);
 assert(g.allyLinks.combat(a));assert.equal(a.target,enemy);assert.equal(a.attackState,'TELEGRAPH');
 a.attackState='READY';a.personality=b.personality='cautious';assert.equal(g.allyLinks.combat(a),false);g.allyLinks.move(a,0);assert.equal(a.state,'flee');
 a.personality=b.personality='growth';b.x=4400;assert.equal(g.allyLinks.combat(a),false);
});
test('companions react with dodge and do not cancel committed attacks to form up',()=>{
 const {g,unit}=setup(),a=unit(4000),b=unit(4050),enemy=unit(4100,'red',100);g.entities=[a,b,enemy];g.buildGrid();g.allyLinks.refresh();g.allyLinks.join(b,a);
 startAttack(a,0,g.balance);const time=a.attackTimer;updateAI(a,.05,g,g.balance);assert.equal(a.attackState,'TELEGRAPH');assert(a.attackTimer>time);
 a.attackState='READY';enemy.attackState='TELEGRAPH';let dodged=false;for(let i=0;i<30;i++){a.dodgeState='READY';a.dodgeStack=2;updateAI(a,.001,g,g.balance);if(a.dodgeState==='DODGING'){dodged=true;break;}a.attackState='READY';}assert(dodged);
});
test('prey flees, counters exposed recovery once, then flees until opportunity timer releases',()=>{
 const {g,unit}=setup(),a=unit(4000),enemy=unit(4140,'red',140);a.role='prey';a.personality='cautious';g.entities=[a,enemy];g.buildGrid();g.gameTime=10;
 decideAI(a,g,g.balance);assert.equal(a.state,'flee');enemy.attackState='RECOVERY';decideAI(a,g,g.balance);assert.equal(a.state,'chase_fight');assert.equal(a.target,enemy);
 decideAI(a,g,g.balance);assert.equal(a.state,'flee');g.gameTime=14;decideAI(a,g,g.balance);assert.equal(a.state,'chase_fight');
});
test('all roles engage similar enemies while empty stacks and critical HP preserve survival',()=>{
 for(const role of ['prey','forager','predator']){const {g,unit}=setup(),a=unit(4000),enemy=unit(4250,'red',100);a.role=role;a.personality='growth';g.entities=[a,enemy];g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.state,'chase_fight');a.attackStack=0;decideAI(a,g,g.balance);assert.notEqual(a.state,'chase_fight');a.hp=a.maxHp*.2;decideAI(a,g,g.balance);assert(a.recovering);}
});
test('swept attacks hit touching bodies without hidden padding or tunneling; allies stay safe',()=>{
 const {g,unit}=setup(),a=unit(4000),touch=unit(4150,'red',40),outside=unit(4150,'red',40),ally=unit(4150,'blue',40);touch.y+=70;outside.y+=71;g.entities=[a,touch,outside,ally];
 startAttack(a,0,g.balance);a.attackState='CHARGING';a.currentChargeDistance=300;a.currentChargeDuration=.1;const hp=touch.hp,out=outside.hp;updateAttack(a,.2,g.balance,[touch,outside],g);
 assert(touch.hp<hp);assert.equal(outside.hp,out);assert.equal(a.x,4300);assert.equal(a.attackHitSet.size,1);assert.equal(applyDamage(ally,100,g,a,g.balance),false);
});
test('green recruitment accepts distant same-color followers, allows approach grace, enforces capacity',()=>{
 const {g,unit}=setup(),owner=unit(4000,'green',150);owner.apex=true;const followers=Array.from({length:7},(_,i)=>unit(4200+i*10,'green',50));g.entities=[owner,...followers];g.buildGrid();g.abilities.fire(owner,{id:1,dir:0,point:{x:4000,y:4000}});
 const group=g.allyLinks.groups.get(owner.companionGroup);assert.equal(group.members.size,6);assert.equal(group.leader,owner);g.allyLinks.refresh();assert.equal(group.members.size,6);
 for(let i=0;i<180;i++){for(const f of followers.filter(f=>f.companionGroup))updateAI(f,1/60,g,g.balance);g.gameTime+=1/60;g.allyLinks.refresh();}assert.equal(group.members.size,6);
});
test('apex cap defaults to five and live changes retain size order under confirmation',()=>{
 const {g,unit}=setup();g.entities=Array.from({length:9},(_,i)=>unit(4000+i*100,'blue',190-i*10));g.ecology.initial=true;g.ecology.timer=0;g.ecology.update(g,0);assert.equal(g.entities.filter(e=>e.apex).length,5);
 g.balance.ecology.maxApex=2;g.ecology.update(g,2);assert.equal(g.entities.filter(e=>e.apex).length,2);g.balance.ecology.maxApex=7;g.ecology.update(g,2);g.ecology.update(g,2);assert.equal(g.entities.filter(e=>e.apex).length,7);
 g.balance.ecology.maxApex=0;g.ecology.update(g,2);assert.equal(g.entities.filter(e=>e.apex).length,0);
});

test('green AI recruits the same-color player without changing manual movement authority',()=>{
 const {g,unit}=setup(),p=g.player;p.color='green';p.x=4000;p.y=4000;p.hp=p.maxHp;const owner=unit(4100,'green',200);owner.apex=true;g.entities=[p,owner];g.abilities.fire(owner,{id:1,dir:0,point:{x:4100,y:4000}});assert(p.companionGroup);assert.equal(g.allyLinks.groups.get(p.companionGroup).leader,owner);g.input.touchMove={x:1,y:0};const x=p.x;g.updatePlayer(.1);assert.equal(p.x-x,p.moveSpeed*.1);
});
test('formation profile is observational and does not change members or group metadata',()=>{
 const {g,unit}=setup(),a=unit(4000),b=unit(4050);g.entities=[a,b];g.allyLinks.refresh();g.allyLinks.join(b,a);const group=g.allyLinks.groups.get(a.companionGroup),keys=Object.keys(group),state=[a.state,b.state];
 g.allyLinks.profile(group);g.allyLinks.personality(group);assert.deepEqual(Object.keys(group),keys);assert.deepEqual([a.state,b.state],state);
});
test('a charging body hits a seam neighbor along its swept path',()=>{
 const {g,unit}=setup(),w=g.balance.world,a=unit(w.worldWidth-100),b=unit(30,'red',40);g.entities=[a,b];startAttack(a,0,g.balance);a.attackState='CHARGING';a.currentChargeDistance=300;a.currentChargeDuration=.1;const hp=b.hp;updateAttack(a,.1,g.balance,[b],g);assert(b.hp<hp);g.clampAllToWorld();assert.equal(a.x,200);
});
