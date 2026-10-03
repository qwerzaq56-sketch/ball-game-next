import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {touchActionFeedback} from '../js/touchFeedback.js';
import {worldView,segmentInView,boxInView} from '../js/renderVisibility.js';

test('mobile charge feedback follows combat availability and reads recharge timers without mutation',()=>{
 const g=createGame(7),p=g.player;p.attackUnlocked=p.dodgeUnlocked=true;p.attackStack=2;p.attackMaxStack=3;p.dodgeStack=1;p.dodgeMaxStack=2;
 p.attackStackTimer=g.balance.attack.attackCooldown*.5;const before=JSON.stringify(p);
 let f=touchActionFeedback(g,'attack');assert.equal(f.state,'ready');assert.equal(f.charges,'2/3');assert.equal(f.progress,.5);
 assert.equal(JSON.stringify(p),before);
 p.attackStack=0;f=touchActionFeedback(g,'attack');assert.equal(f.disabled,true);assert.equal(f.state,'cooldown');
 p.attackStack=2;p.attackState='TELEGRAPH';assert.equal(touchActionFeedback(g,'attack').state,'busy');assert.equal(touchActionFeedback(g,'dodge').state,'ready');
 p.frozen=1;assert.equal(touchActionFeedback(g,'attack').state,'frozen');assert.equal(touchActionFeedback(g,'dodge').disabled,true);
});
test('mobile feedback distinguishes unlock, peace, pause and special cooldown',()=>{
 const g=createGame(7),p=g.player;assert.equal(touchActionFeedback(g,'attack').state,'locked');
 p.attackUnlocked=true;p.attackStack=2;p.companionGroup=1;assert.equal(touchActionFeedback(g,'attack').state,'ready');
 p.apex=true;assert.equal(touchActionFeedback(g,'special').state,'ready');p.companionGroup=null;p.normalSkillCooldown=2.4;
 assert.equal(touchActionFeedback(g,'special').label,'E 3s');p.attackState='READY';p.dodgeState='READY';g.paused=true;assert.equal(touchActionFeedback(g,'attack').disabled,true);
});
test('render bounds keep crossing segments and effect extents while rejecting fully outside objects',()=>{
 const v=worldView({width:400,height:200},{x:1000,y:1000,zoom:.5});assert.deepEqual(v,{left:600,right:1400,top:800,bottom:1200});
 assert(segmentInView(v,{x:0,y:1000},{x:2000,y:1000}));assert.equal(segmentInView(v,{x:0,y:0},{x:100,y:100}),false);
 assert(boxInView(v,500,900,605,1000));assert.equal(boxInView(v,0,0,100,100),false);
});
test('large bodies stay visible when their centers are outside the old fixed-margin view',()=>{
 const g=createGame(7);g.camera={x:2500,y:2500,zoom:1};
 assert(g.isRoughlyVisible({x:3500,y:2500,size:1000}));assert.equal(g.isRoughlyVisible({x:4500,y:2500,size:1000}),false);
});
test('offscreen particle rendering skips drawing without removing effects and keeps intersecting rings',()=>{
 const g=createGame(7);g.camera={x:2500,y:2500,zoom:1};let arcs=0;
 g.particles=[{x:4500,y:4500,size:3,type:'dot',life:.5,maxLife:1,color:'#ffffff'},{x:3150,y:2500,size:10,type:'ring',life:.1,maxLife:1,color:'#ffffff'}];
 const before=JSON.stringify(g.particles),ctx={beginPath(){},arc(){arcs++;},fill(){},stroke(){}};
 g.drawParticles(ctx);assert.equal(arcs,1);assert.equal(JSON.stringify(g.particles),before);
});
