import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,decideAI,updateAI} from '../js/ai.js';
import {Entity} from '../js/entity.js';
import {applyDamage,RETALIATION_MEMORY} from '../js/combat.js';

// Regression for the two approved-rule gaps found in Codex's review (proposals 005 and 004).
function setup(){
  const g=createGame(4), b=g.balance;
  const unit=(size,color,x,y=1000)=>new AIEntity({x,y,color,colorHex:'#fff',balance:b,startSize:size});
  const orbs=(value=80)=>new Entity({x:1000,y:1100,size:10,color:'yellow',growthValue:value});
  const run=(ents,ai)=>{g.entities=ents;g.buildGrid();decideAI(ai,g,b);return ai.state;};
  return {g,b,unit,orbs,run};
}
function growthPrey(t,hp){
  const a=t.unit(100,'yellow',1000); a.role='prey'; a.personality='growth'; a.hp=a.maxHp*hp; return a;
}

test('growth prey: risk starts at HP 60% but not 59%', ()=>{
  const t=setup(), big=t.unit(130,'red',1250);
  const a1=growthPrey(t,.6);
  assert.equal(t.run([a1,big,t.orbs()],a1),'chase_eat');
  const a2=growthPrey(t,.59);
  assert.equal(t.run([a2,big,t.orbs()],a2),'flee');
});

test('growth prey: once started, risk continues until HP 50%', ()=>{
  const t=setup(), big=t.unit(130,'red',1250), a=growthPrey(t,.7), food=t.orbs();
  assert.equal(t.run([a,big,food],a),'chase_eat');
  a.hp=a.maxHp*.55;
  assert.equal(t.run([a,big,food],a),'chase_eat');
  a.hp=a.maxHp*.5;
  assert.equal(t.run([a,big,food],a),'flee');
});

test('growth prey: risk stops when cluster value drops below 80', ()=>{
  const t=setup(), big=t.unit(130,'red',1250), a=growthPrey(t,.7);
  assert.equal(t.run([a,big,t.orbs(80)],a),'chase_eat');
  assert.equal(t.run([a,big,t.orbs(79)],a),'flee');
});

test('growth prey: the two threat limits override continuing risk', ()=>{
  const t=setup(), a=growthPrey(t,.7), food=t.orbs();
  assert.equal(t.run([a,t.unit(130,'red',1250),food],a),'chase_eat');
  assert.equal(t.run([a,t.unit(130,'red',1100),food],a),'flee');   // within 160
  const b=growthPrey(t,.7);
  assert.equal(t.run([b,t.unit(151,'red',1250),t.orbs()],b),'flee'); // > 1.5x
});

function challenger(t,personality='growth',hp=.7){
  const a=t.unit(100,'yellow',1000); a.role='predator'; a.relationship='challenger';
  a.personality=personality; a.hp=a.maxHp*hp; a.attackStack=2; return a;
}
function apex(t,{size=130,hp=.25,x=1250,color='red'}={}){
  const o=t.unit(size,color,x); o.apex=true; o.hp=o.maxHp*hp; return o;
}

test('challenger: eligible weak apex is dueled instead of fled from', ()=>{
  const t=setup(), a=challenger(t);
  assert.equal(t.run([a,apex(t)],a),'chase_fight');
});

test('challenger: ineligible apex still triggers normal flee', ()=>{
  const t=setup();
  let a=challenger(t); assert.equal(t.run([a,apex(t,{hp:.31})],a),'flee');       // target HP > 30%
  a=challenger(t); assert.equal(t.run([a,apex(t,{size:151})],a),'flee');          // > 1.5x
  a=challenger(t,'growth',.59); assert.equal(t.run([a,apex(t)],a),'flee');        // own HP < 60%
});

test('challenger: any other big threat still wins over the duel', ()=>{
  const t=setup(), a=challenger(t), other=t.unit(140,'blue',1000,1250);
  assert.equal(t.run([a,apex(t),other],a),'flee');
});

test('challenger: personality gates are kept', ()=>{
  const t=setup();
  let a=challenger(t,'opportunist'); const o=apex(t); o.attackState='IDLE';
  assert.equal(t.run([a,o],a),'flee');              // waits for recovery frames
  a=challenger(t,'opportunist'); const o2=apex(t); o2.attackState='RECOVERY';
  assert.equal(t.run([a,o2],a),'chase_fight');
  a=challenger(t,'cautious'); const o3=apex(t); const near=t.unit(150,'blue',1250,1100);
  assert.equal(t.run([a,o3,near],a),'flee');        // target spot is not safe
});

// General retaliation (v0.25): restored from v0.6 and extended to every role/color.
function hitBy(t,victim,attacker,opts){
  attacker.attackState='READY';
  t.g.entities=[victim,attacker];t.g.buildGrid();
  applyDamage(victim,1,t.g,attacker,t.b,opts);
  victim.hp=victim.maxHp*(victim._hpAfter??.8);
}
function victim(t,role='prey',personality='growth',hp=.8){
  const a=t.unit(100,'yellow',1000); a.role=role; a.personality=personality; a.hp=a.maxHp*hp; a.attackStack=2; a._hpAfter=hp; return a;
}

test('retaliation: a hit prey fights back against an equal-size attacker', ()=>{
  const t=setup(), a=victim(t), foe=t.unit(100,'red',1200);
  hitBy(t,a,foe);
  assert.equal(a.retaliateTarget,foe);
  assert.equal(t.run([a,foe],a),'chase_fight');
  assert.equal(a.target,foe);
});

test('retaliation: survival still wins over it (big attacker, low HP, no stack)', ()=>{
  const t=setup();
  let a=victim(t), foe=t.unit(130,'red',1200); hitBy(t,a,foe);
  assert.equal(t.run([a,foe],a),'flee');                       // attacker is a threat (>=1.2x)
  a=victim(t,'prey','growth',.3); foe=t.unit(100,'red',1200); hitBy(t,a,foe);
  assert.notEqual(t.run([a,foe],a),'chase_fight');             // HP <= 30%
  a=victim(t); a.attackStack=0; foe=t.unit(100,'red',1200); hitBy(t,a,foe); a.attackStack=0;
  assert.notEqual(t.run([a,foe],a),'chase_fight');             // cannot attack
});

test('retaliation: field ticks and same-colour hits never create a target', ()=>{
  const t=setup(), a=victim(t), foe=t.unit(100,'red',1200), ally=t.unit(100,'yellow',1200);
  hitBy(t,a,foe,{kind:'field'}); assert.equal(a.retaliateTarget??null,null);
  hitBy(t,a,ally); assert.equal(a.retaliateTarget??null,null);
});

test('R-AI-010 retaliation memory expires after the configured six seconds', ()=>{
  const t=setup(), a=victim(t), foe=t.unit(100,'red',1200);
  hitBy(t,a,foe); t.g.entities=[a,foe]; t.g.buildGrid();
  for(let i=0;i<Math.ceil(t.b.ai.retaliationSeconds*60)+2;i++) updateAI(a,1/60,t.g,t.b);
  assert.equal(a.retaliateTarget,null);
});

test('retaliation: cautious AI needs the attacker spot free of other threats', ()=>{
  const t=setup(), c=victim(t,'prey','cautious'), foe=t.unit(100,'red',1200), big=t.unit(150,'blue',1200,1100);
  hitBy(t,c,foe); t.g.entities=[c,foe,big]; t.g.buildGrid();
  decideAI(c,t.g,t.b);
  assert.notEqual(c.state,'chase_fight');
  const c2=victim(t,'prey','cautious'), foe2=t.unit(100,'red',1200); hitBy(t,c2,foe2);
  assert.equal(t.run([c2,foe2],c2),'chase_fight');
});

test('flee hysteresis keeps a remembered threat beyond sensing and releases at 400',()=>{
 const t=setup(), a=victim(t), foe=t.unit(130,'red',1300);
 assert.equal(t.run([a,foe],a),'flee');
 foe.x=1340;assert.equal(t.run([a,foe],a),'flee');
 foe.x=1400;assert.equal(t.run([a,foe],a),'search');
 foe.x=1300;t.run([a,foe],a);foe.alive=false;
 assert.equal(t.run([a,foe],a),'search');
});
test('absorption escape does not return to food inside the same absorber margin',()=>{
 const t=setup(), a=victim(t), ally=t.unit(200,'yellow',1050), food=t.orbs();
 a.beingAbsorbedByRef=ally;t.g.entities=[a,ally,food];t.g.buildGrid();
 updateAI(a,1/60,t.g,t.b);assert.equal(a.escapeAbsorber,ally);
 a.beingAbsorbedByRef=null;assert.equal(t.run([a,ally,food],a),'flee');
 ally.alive=false;assert.equal(t.run([a,ally,food],a),'chase_eat');
});
test('absorption escape releases beyond maintain distance plus margin',()=>{
 const t=setup(), a=victim(t), ally=t.unit(200,'yellow',1050);
 a.escapeAbsorber=ally;
 const radius=Math.max(t.b.absorption.baseMaintainDistance+ally.size*t.b.absorption.maintainDistancePerSize,(ally.size+a.size)/2+t.b.absorption.baseMaintainDistance+ally.size*t.b.absorption.surfaceReachPerSize)+80;
 ally.x=a.x+radius; t.run([a,ally],a);assert.equal(a.escapeAbsorber,null);
});
test('sand escape holds to 420 and releases when the field expires',()=>{
 const t=setup(), a=victim(t), owner=t.unit(200,'red',1000);
 const field={owner,x:1200,y:1000};t.g.abilities.fields=[field];
 assert.equal(t.run([a],a),'flee');field.x=1400;assert.equal(t.run([a],a),'flee');
 t.g.abilities.fields=[];assert.equal(t.run([a],a),'search');
});

test('cautious prey can engage similar enemies in sensing range',()=>{
 const t=setup(), a=victim(t,'prey','cautious'), foe=t.unit(100,'red',1120);
 assert.equal(t.run([a,foe],a),'chase_fight');assert.equal(a.target,foe);
 foe.x=1250;assert.equal(t.run([a,foe],a),'chase_fight');
});
test('contact defense flees without a stack and still yields to recovery',()=>{
 const t=setup(), a=victim(t), foe=t.unit(100,'red',1120);
 a.attackStack=0;assert.equal(t.run([a,foe],a),'flee');
 a.attackStack=2;a.hp=a.maxHp*.3;assert.notEqual(t.run([a,foe],a),'chase_fight');
});

test('sand avoidance enters and releases using the active field radius while preserving its margin',()=>{
 const t=setup(),a=victim(t),owner=t.unit(200,'red',1000),field={owner,x:1080,y:1000,radius:100};t.g.abilities.fields=[field];
 assert.equal(t.run([a],a),'flee');field.x=1159;assert.equal(t.run([a],a),'flee');field.x=1160;assert.equal(t.run([a],a),'search');
 field.x=1500;field.radius=800;assert.equal(t.run([a],a),'flee');field.radius=100;assert.equal(t.run([a],a),'search');
});
test('companion command and combat guards follow custom sand radius instead of a fixed 420',()=>{
 const t=setup(),a=victim(t),owner=t.unit(200,'red',1000),field={owner,x:1300,y:1000,radius:100};t.g.entities=[a];t.g.buildGrid();t.g.abilities.fields=[field];a.companionGroup=999;a.state='search';
 let commands=0,combats=0;t.g.biomes.danger=()=>null;t.g.abilities.commandDecision=()=>{commands++;return true;};t.g.allyLinks.move=()=>{};t.g.allyLinks.combat=()=>{combats++;return false;};
 updateAI(a,.01,t.g,t.b);assert.equal(commands,1);assert.equal(combats,0);field.x=1500;field.radius=800;updateAI(a,.01,t.g,t.b);assert.equal(commands,1);assert.equal(combats,1);
});

test('healthy prey exploit recovery of larger grown threats, but low health still flees',()=>{
 const t=setup(),a=t.unit(160,'blue',1000),big=t.unit(400,'red',1100);a.personality='cautious';big.attackState='RECOVERY';t.g.gameTime=10;
 assert.equal(t.run([a,big],a),'chase_fight');assert.equal(a.nextHarass,11.5);
 a.hp=a.maxHp*.3;assert.equal(t.run([a,big],a),'flee');
});
