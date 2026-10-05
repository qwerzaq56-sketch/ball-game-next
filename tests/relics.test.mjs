import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity,decideAI} from '../js/ai.js';
import {Entity} from '../js/entity.js';
import {updateHealthRegen} from '../js/combat.js';
function fixture(){const g=createGame(11);g.entities=[g.player];g.relics.items=[];return g;}
function item(g,kind='combat',x=g.player.x,y=g.player.y){const r={id:'test-relic',x,y,size:24,behavior:'relic',kind,expires:g.gameTime+90,alive:true};g.relics.items.push(r);return r;}
test('relics are separate collectibles; contact competition resolves by distance then id',()=>{
 const g=fixture(),p=g.player;const a=new AIEntity({x:p.x,y:p.y,color:'red',colorHex:'#f00',startSize:20,balance:g.balance});g.entities.push(a);const r=item(g);const before=g.ecology.sizeOrder.length;g.relics.update(0);
 assert.equal(r.alive,false);assert.equal(p.relic.kind,'combat');assert.equal(a.relic,undefined);assert.equal(g.ecology.sizeOrder.length,before);assert(!g.entities.includes(r));assert.equal(g.relics.items.length,0);
 const next=item(g,'growth',p.x+50);a.x=next.x;a.y=next.y;g.relics.update(0);assert.equal(a.relic.kind,'growth');assert.equal(p.relic.kind,'combat');
});
test('pickup replaces one effect, expires at sixty seconds and leaves no stale item target',()=>{
 const g=fixture(),p=g.player;item(g);g.relics.update(0);item(g,'regen');g.relics.update(0);assert.equal(p.relic.kind,'regen');g.gameTime=60;g.relics.update(0);assert.equal(p.relic,null);
 const r=item(g,'growth',3000,2500);g.gameTime=r.expires;g.relics.update(0);assert.equal(r.alive,false);assert(!g.relics.items.includes(r));
});
test('combat relic adds to ally/morale bonuses while allowing companion attacks',()=>{
 const g=fixture(),p=g.player;p.relic={kind:'combat',expires:60};assert.equal(g.abilities.damageMultiplier(p),1.1);p.morale=new Map([[999,5]]);assert.equal(g.abilities.damageMultiplier(p),1.25);p.companionGroup=1;p.apex=true;p.specialCooldown=0;assert.equal(g.abilities.canCast(p),true);
});
test('growth relic increases pickup growth only; score and edibility remain independent',()=>{
 const g=fixture(),p=g.player;p.relic={kind:'growth',expires:60};const orb=new Entity({x:p.x,y:p.y,size:10,color:'red',growthValue:10});const huge=new Entity({x:p.x,y:p.y,size:100,color:'red',growthValue:100});g.entities.push(orb,huge);g.buildGrid();g.resolveConsumption();assert.equal(p.growth,6);assert.equal(p.score,10);assert.equal(huge.alive,true);
});
test('regen relic scales rate but keeps damage delay and maximum HP',()=>{
 const g=fixture(),p=g.player;p.relic={kind:'regen',expires:60};p.hp=50;p.regenTimer=0;assert.equal(updateHealthRegen(p,.1,g.balance,g.relics.regenMultiplier(p)),false);assert.equal(p.hp,50);p.regenTimer=g.balance.healthRegen.delay;const rate=g.balance.healthRegen.baseRate+p.size*g.balance.healthRegen.regenPerSize;updateHealthRegen(p,1,g.balance,g.relics.regenMultiplier(p));assert.equal(p.hp,50+rate*1.25);p.hp=p.maxHp-.1;updateHealthRegen(p,1,g.balance,1.25);assert.equal(p.hp,p.maxHp);
});
test('death, life defeat and reset clear relics while spawn count remains bounded',()=>{
 const g=fixture(),p=g.player;p.relic={kind:'combat',expires:60};g.handlePlayerDefeat('test');assert.equal(p.relic,null);p.relic={kind:'growth',expires:60};g.onEntityDeath(p,null);assert.equal(p.relic,null);
 for(let i=0;i<10;i++)g.relics.spawn();assert.equal(g.relics.items.length,3);g.reset();assert.equal(g.relics.items.length,1);assert.equal(g.relics.pickups,0);assert.equal(g.relics.effect(g.player),null);
});
test('AI seeks only safe visible relics after other targets and disabled relics add no regions/items',()=>{
 const g=fixture(),a=new AIEntity({x:2500,y:2500,color:'red',colorHex:'#f00',startSize:40,balance:g.balance});a.role='forager';a.personality='growth';g.entities=[a];const r=item(g,'growth',a.x+250,a.y);g.buildGrid();decideAI(a,g,g.balance);assert.equal(a.target,r);r.x=a.x+500;decideAI(a,g,g.balance);assert.equal(a.target,null);
 g.balance.relics.enabled=false;g.reset();assert.equal(g.relics.items.length,0);assert.equal(g.biomes.regions.length,6);assert.equal(g.relics.desired(g.player,()=>true),null);
});
