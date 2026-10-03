import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {scaledSkill} from '../js/skillCatalog.js';
import {attackChargeDistanceForSize,startAttack,updateAttack} from '../js/combat.js';
import {growthRewardFor} from '../js/entity.js';
test('all E/R geometry scales above size 350 while small skills retain their geometry',()=>{
 const g=createGame(7);for(const color of g.balance.colors.map(c=>c.id))for(const slot of ['E','R']){
  const a=scaledSkill(g.balance,{color,size:350},slot),b=scaledSkill(g.balance,{color,size:1400},slot);
  for(const key of ['radius','length','width','castRange','buffRadius','commandRadius'])if(a[key]){if(a.effect==='embers'&&key==='radius'){assert(b[key]>=a[key]);assert(b[key]>1400/2);}else if(a.effect==='muster'&&key==='radius')assert.equal(b[key],a[key]*2);else if(color==='green'&&slot==='E'&&key==='radius')assert(b[key]>=a[key]);else assert.equal(b[key],a[key]*4);};
  assert.equal(b.cooldown,a.cooldown);assert.equal(b.damage,a.damage);
 }
});
test('camera bounds player diameter even after instant growth and mobile rotation',()=>{
 const g=createGame(7);for(const size of [500,1500,4000])for(const [width,height]of [[1280,720],[844,390],[390,844]]){
  g.player.size=size;g.canvas.width=width;g.canvas.height=height;g.camera.zoom=1;g.updateCamera(1/60);
  assert(g.player.size*g.camera.zoom<=Math.min(width,height)*.42+1e-8);
 }
});
test('large attack travels capped distance and preview uses the same distance',()=>{
 const g=createGame(7),p=g.player;p.size=1500;p.apex=false;p.attackStack=1;p.x=p.y=3000;startAttack(p,0,g.balance);
 assert.equal(p.currentChargeDistance,600);assert.equal(attackChargeDistanceForSize(1500,g.balance,true),420);
 p.attackState='CHARGING';const x=p.x;updateAttack(p,p.currentChargeDuration,g.balance,[],g);assert.equal(p.x-x,600);
});
test('reward reduction is smooth and halves all rewards throughout large-size bands',()=>{
 const g=createGame(7);for(const [size,amount]of [[400,100],[450,75],[500,50],[1000,50],[1500,50],[2000,50]])assert.equal(growthRewardFor(100,{size},g.balance),amount);
});

test('grown skill snapshot hits beyond its original radius and keeps its cast geometry',async()=>{
 const {AIEntity}=await import('../js/ai.js'),g=createGame(7),p=g.player;p.color='cyan';p.size=1400;p.apex=true;p.x=p.y=3000;
 const t=new AIEntity({x:3650,y:3000,startSize:1400,color:'red',colorHex:'#f00',balance:g.balance});g.entities=[p,t];g.buildGrid();
 assert(g.abilities.start(p,0,null,null,'R'));const cast=p.specialCast;assert.equal(cast.skill.radius,3640);
 p.size=1500;assert.equal(cast.skill.radius,3640);g.abilities.fire(p,cast);assert(t.frozen>0);
});
