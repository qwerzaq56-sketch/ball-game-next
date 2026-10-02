import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity} from '../js/ai.js';
import {inCone,inWave,ABILITIES} from '../js/abilities.js';
import {startAttack,startDodge,applyDamage,canStartAttack} from '../js/combat.js';
function fixture(color='cyan'){
 const g=createGame(11);const p=g.player;p.size=100;p.maxHp=p.hp=500;p.color=color;p.colorHex=g.balance.colors.find(c=>c.id===color).color;p.apex=true;p._specialApex=true;p.specialCooldown=0;p.attackStack=2;p.dodgeStack=2;
 const t=new AIEntity({x:p.x+100,y:p.y,color:'red',colorHex:'#f00',balance:g.balance,startSize:40});t.hp=t.maxHp=1000;t.score=0;g.entities=[p,t];g.buildGrid();return {g,p,t};
}
function ticks(g,n){for(let i=0;i<n;i++)g.abilities.update(1/60);}
test('geometry boundaries: exact cone/wave, outside and behind excluded',()=>{
 const o={x:0,y:0};assert.equal(inCone(o,{x:260,y:0},0,260),true);assert.equal(inCone(o,{x:261,y:0},0,260),false);assert.equal(inCone(o,{x:-1,y:0},0,260),false);
 assert.equal(inWave(o,{x:400,y:90},0),true);assert.equal(inWave(o,{x:401,y:0},0),false);assert.equal(inWave(o,{x:1,y:91},0),false);
});
test('cooldown consumes at windup, attack forbidden, dodge cancels without refund',()=>{
 const {g,p}=fixture();assert.equal(g.abilities.start(p,0),true);assert.equal(p.specialCooldown,10);assert.equal(canStartAttack(p),false);
 startDodge(p,0,g.balance);assert.equal(p.specialCast,null);assert.equal(p.specialCooldown,10);assert.equal(g.abilities.start(p,0),false);
});
test('initial/reacquired cooldown minimum and death release',()=>{
 const {g,p}=fixture();p._specialApex=false;g.abilities.update(0);assert.equal(p.specialCooldown,5);p.specialCooldown=8;p.apex=false;g.abilities.update(0);p.apex=true;g.abilities.update(0);assert.equal(p.specialCooldown,8);
 p.specialCooldown=0;g.abilities.start(p,0);g.abilities.release(p);assert.equal(p.specialCast,null);
});
test('cyan windup then half-damage defense, one second freeze and immunity',()=>{
 const {g,p,t}=fixture();g.abilities.start(p,0);ticks(g,35);assert.equal(t.hp,1000);ticks(g,1);assert.equal(t.hp,965);assert.ok(t.frozen>.98);
 ticks(g,60);assert.equal(t.frozen,0);assert.ok(t.freezeImmune>1.9);
});
test('invincibility blocks damage and freeze without consuming miss RNG',()=>{
 const {g,p,t}=fixture();t.invincible=true;g.abilities.start(p,0);ticks(g,36);assert.equal(t.hp,1000);assert.equal(t.frozen??0,0);
});
test('blue wave hits once and pushes 120 over .2 seconds, then immunity',()=>{
 const {g,p,t}=fixture('blue');g.abilities.start(p,0);ticks(g,36);ticks(g,12);const before=t.hp;assert.equal(before,965);ticks(g,30);assert.equal(t.hp,before);assert.ok(Math.abs(t.x-(p.x+220))<1e-6);assert.ok(t.waveImmune>0);
});
test('green buff separates from command, caps four and excludes player automation',()=>{
 const {g,p}=fixture('green');for(let i=0;i<6;i++){const a=new AIEntity({x:p.x+i*10,y:p.y+50,color:'green',colorHex:'#0f0',balance:g.balance,startSize:50});g.entities.push(a);}
 g.abilities.start(p,0);ticks(g,30);assert(Math.abs(g.abilities.damageMultiplier(p)-1.30)<1e-8);assert.equal(p.command,undefined);assert.equal(g.entities.filter(e=>e.command).length,4);
 const a=g.entities.find(e=>e.command);g.abilities.endCommand(a,'test');assert(Math.abs(g.abilities.damageMultiplier(a)-1.30)<1e-8);assert.equal(a.commandLock,3);
 g.abilities.release(p);assert(Math.abs(g.abilities.damageMultiplier(a)-1.15)<1e-8);assert.equal(g.entities.filter(e=>e.command).length,0);
});
test('red has no direct damage and refuses empty casting',()=>{
 const {g,p,t}=fixture('red');t.color='blue';g.abilities.start(p,0);ticks(g,48);assert.equal(t.hp,1000);g.entities=[p];p.specialCooldown=0;assert.equal(g.abilities.start(p,0),false);
});
test('apex attack only reduces dash; width and duration snapshot unchanged',()=>{
 const {g,p}=fixture();startAttack(p,0,g.balance);assert.ok(Math.abs(p.currentChargeDistance/p.currentAttackRange-.7)<1e-9);const d=p.currentChargeDistance;p.apex=false;assert.equal(p.currentChargeDistance,d);
 p.attackState='READY';p.attackStack=1;startAttack(p,0,g.balance);assert.equal(p.currentChargeDistance,p.currentAttackRange);
});
test('blue refused candidates cannot be centrally absorbed while commanded',()=>{
 const {g,p,t}=fixture('blue');t.color='blue';t.size=90;t.x=p.x+10;const small=new AIEntity({x:t.x,y:t.y,color:'blue',colorHex:'#00f',balance:g.balance,startSize:20});g.entities.push(small);
 t.command={kind:'devour',owner:p,choices:new Map([[small.id,false]]),remaining:4};assert.equal(g.abilities.absorptionAllowed(t,small),false);
 g.entities=[t,small];g.buildGrid();g.resolveConsumption();assert.equal(small.beingAbsorbedByRef,null);
});
test('yellow field ticks quarter-second; exact lifetime and same-tick overlap uses maximum',()=>{
 const {g,p,t}=fixture('yellow');const q={...p,id:999};g.entities.push(q);
 g.abilities.fields=[{owner:p,x:t.x,y:t.y,time:0,tick:0},{owner:q,x:t.x,y:t.y,time:0,tick:0}];ticks(g,30);
 assert.equal(t.hp,620); // Two ticks of 200 raw × 1.05 ally bonus minus 20 defense; overlaps apply once.
 ticks(g,270);assert.equal(g.abilities.fields.length,0);assert.equal(t.hp,0);
});
test('command reaccept lock, harvest no orb and red unseen destination completion',()=>{
 const {g,p,t}=fixture('green');t.color='green';t.command={owner:p,kind:'harvest',remaining:5};g.buildGrid();assert.equal(g.abilities.commandDecision(t),false);assert.equal(t.command,null);assert.equal(t.commandLock,3);
});
import {resetRandom,random} from '../js/random.js';
test('MISS blocks damage and extra effects; invincibility does not consume randomness',()=>{
 const {g,p,t}=fixture('yellow');g.abilities.fields=[{owner:p,x:p.x,y:p.y,time:0,tick:0}];
 let seed;for(let i=0;i<100;i++){resetRandom(i);if(random('ai')<.25){seed=i;break;}}
 resetRandom(seed);const hp=p.hp;p.beingAbsorbedByRef=t;assert.equal(applyDamage(p,100,g,t,g.balance),false);assert.equal(p.hp,hp);assert.equal(p.beingAbsorbedByRef,t);
 resetRandom(seed);const expected=random('ai');resetRandom(seed);p.invincible=true;applyDamage(p,100,g,t,g.balance);assert.equal(random('ai'),expected);
});
test('rally shares activation position and never automatically controls the player',()=>{
 const {g,p,t}=fixture('red');t.color='blue';const a=new AIEntity({x:p.x+20,y:p.y,color:'red',colorHex:'#f00',balance:g.balance,startSize:60});g.entities.push(a);a.attackStack=1;
 g.abilities.start(p,0);t.x+=100;t.y+=30;ticks(g,48);assert.equal(a.command.target,t);assert.deepEqual(a.command.point,{x:t.x,y:t.y});assert.equal(p.command,undefined);
});
test('frozen owner cannot start actions and death removes owned buffs/commands/field',()=>{
 const {g,p,t}=fixture('green');p.frozen=1;assert.equal(g.abilities.start(p,0),false);assert.equal(canStartAttack(p),false);
 p.frozen=0;t.morale=new Map([[p.id,5]]);t.command={owner:p,kind:'harvest',remaining:5};g.abilities.fields=[{owner:p,x:p.x,y:p.y,time:0,tick:0}];g.abilities.release(p);
 assert.equal(t.morale.size,0);assert.equal(t.command,null);assert.equal(g.abilities.fields.length,0);
});
test('lethal frost does not freeze a same-tick Life respawn',()=>{
 const {g,p,t}=fixture('cyan');t.color='cyan';t.size=100;t.apex=true;t._specialApex=true;t.specialCooldown=0;
 p.color='blue';p.hp=1;p.x=t.x+100;g.abilities.start(t,0);ticks(g,36);assert.equal(g.lives,2);assert.equal(p.alive,true);assert.equal(p.frozen??0,0);assert.equal(p.apex,false);
});
test('ability toggle forbids casting and AI consideration without changing core stacks',()=>{
 const {g,p}=fixture();g.abilities.enabled=false;const stack=p.attackStack;assert.equal(g.abilities.start(p,0),false);assert.equal(g.abilities.considerAI(p),false);assert.equal(p.attackStack,stack);
});
import {decideAI} from '../js/ai.js';
test('rally explicit size exception overrides ordinary .8 hunt limit',()=>{
 const {g,p,t}=fixture('red');t.color='blue';t.size=78;const a=new AIEntity({x:p.x+20,y:p.y,color:'red',colorHex:'#f00',balance:g.balance,startSize:60});
 a.role='prey';a.personality='cautious';a.command={owner:p,kind:'rally',target:t,point:{x:t.x,y:t.y},remaining:4};g.entities.push(a);g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.state,'chase_fight');assert.equal(a.target,t);
});

test('cast flash captures origin and expires independently of damage/cooldown',()=>{
 const {g,p,t}=fixture('cyan');const x=p.x,y=p.y;
 g.abilities.start(p,0);ticks(g,36);
 assert.equal(g.abilities.flashes.length,1);
 const f=g.abilities.flashes[0];assert.equal(f.x,x);assert.equal(f.y,y);
 assert.equal(f.color,'cyan');assert.equal(t.hp,965);
 p.x+=200;assert.equal(f.x,x);
 ticks(g,46);assert.equal(g.abilities.flashes.length,0);assert.equal(t.hp,965);
 assert(p.specialCooldown>8);
});

import {blueWaveDirections} from '../js/abilities.js';
test('blue three-lane directions use two AI draws once, within separated side ranges',()=>{
  resetRandom(23);const r1=random('ai'),r2=random('ai'),next=random('ai');
  resetRandom(23);const dirs=blueWaveDirections(1);
  assert.equal(dirs[0],1);assert.equal(dirs[1],1+(-120+r1*80)*Math.PI/180);assert.equal(dirs[2],1+(40+r2*80)*Math.PI/180);assert.equal(random('ai'),next);
  for(let seed=0;seed<100;seed++){resetRandom(seed);const d=blueWaveDirections(0);assert(d[1]>=-2*Math.PI/3&&d[1]<=-2*Math.PI/9);assert(d[2]>=2*Math.PI/9&&d[2]<=2*Math.PI/3);}
});
test('blue directions remain fixed through windup; cooldown and cast count apply once',()=>{
  const {g,p}=fixture('blue');g.abilities.start(p,.3);const dirs=[...p.specialCast.directions];
  ticks(g,35);assert.deepEqual(p.specialCast.directions,dirs);assert.equal(g.abilities.waves.length,0);
  ticks(g,1);assert.equal(g.abilities.waves.length,3);assert.deepEqual(g.abilities.waves.map(w=>w.dir),dirs);
  assert.deepEqual(g.abilities.flashes[0].directions,dirs);
  assert.equal(g.abilities.events.filter(e=>e.type==='special-fire').length,1);
  assert(Math.abs(p.specialCooldown-9.4)<1e-8);
  assert.equal(g.abilities.waves[0].hit,g.abilities.waves[1].hit);
});
test('overlapping blue lanes cannot triple damage, knockback or consume multiple MISS rolls',()=>{
  const {g,p,t}=fixture('blue');t.x=p.x+10;g.abilities.start(p,0);
  p.specialCast.directions=[0,-Math.PI/3,Math.PI/3];
  let hits=0;const damage=g.abilities.damage.bind(g.abilities);
  g.abilities.damage=(...args)=>{hits++;return damage(...args)};
  ticks(g,36);ticks(g,12);assert.equal(hits,1);assert.equal(t.hp,965);
  assert(Math.abs(t.x-(p.x+130))<1e-6);ticks(g,30);assert.equal(t.hp,965);assert.equal(hits,1);
});
test('blue side lanes hit separate targets, behind-caster target stays untouched',()=>{
  const {g,p,t}=fixture('blue');t.x=p.x+200;
  const targets=[-Math.PI/3,Math.PI/3,Math.PI].map(dir=>{
    const a=new AIEntity({x:p.x+200*Math.cos(dir),y:p.y+200*Math.sin(dir),color:'red',colorHex:'#f00',balance:g.balance,startSize:40});a.hp=a.maxHp=1000;return a;
  });g.entities.push(...targets);g.abilities.start(p,0);p.specialCast.directions=[0,-Math.PI/3,Math.PI/3];ticks(g,70);
  assert.equal(t.hp,965);assert.equal(targets[0].hp,965);assert.equal(targets[1].hp,965);assert.equal(targets[2].hp,1000);
});
test('dodging a blue windup cancels all three lanes without refund or fire event',()=>{
  const {g,p}=fixture('blue');g.abilities.start(p,0);startDodge(p,0,g.balance);ticks(g,40);
  assert.equal(g.abilities.waves.length,0);assert.equal(g.abilities.events.filter(e=>e.type==='special-fire').length,0);assert(p.specialCooldown>9);
});
test('rejected blue casting consumes no extra AI draws',()=>{
  const {g,p}=fixture('blue');p.specialCooldown=1;resetRandom(19);const expected=random('ai');resetRandom(19);
  assert.equal(g.abilities.start(p,0),false);assert.equal(random('ai'),expected);
});

test('blue windup and activation drawing reuse stored lanes without random draws',()=>{
  const {g,p}=fixture('blue');g.abilities.start(p,0);
  const dirs=[...p.specialCast.directions];
  const ctx=new Proxy({}, {get:()=>()=>{},set:()=>true});
  resetRandom(7);const expectedAI=random('ai'),expectedNames=random('names');resetRandom(7);
  for(let i=0;i<10;i++)g.abilities.draw(ctx,1);
  assert.deepEqual(p.specialCast.directions,dirs);assert.equal(random('ai'),expectedAI);assert.equal(random('names'),expectedNames);
  ticks(g,36);resetRandom(8);const next=random('ai');resetRandom(8);g.abilities.draw(ctx,.5);assert.equal(random('ai'),next);
});
test('shared blue registry also records invincible targets once across overlapping lanes',()=>{
  const {g,p,t}=fixture('blue');t.x=p.x+10;t.invincible=true;g.abilities.start(p,0);p.specialCast.directions=[0,-Math.PI/3,Math.PI/3];
  let attempts=0;const damage=g.abilities.damage.bind(g.abilities);g.abilities.damage=(...args)=>{attempts++;return damage(...args)};
  ticks(g,40);assert.equal(attempts,1);assert.equal(t.hp,1000);assert.equal(t.wavePush,undefined);
});
