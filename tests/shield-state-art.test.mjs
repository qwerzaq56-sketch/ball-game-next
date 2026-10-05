import test from 'node:test';
import assert from 'node:assert/strict';
import {drawShieldStateArt} from '../js/shieldStateArt.js';
import {random,resetRandom} from '../js/random.js';
function context(){const calls=[],stack=[],ctx={strokeStyle:'original',lineWidth:8,globalAlpha:.4,save(){calls.push(['save']);stack.push({strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,globalAlpha:this.globalAlpha});},restore(){calls.push(['restore']);Object.assign(this,stack.pop());},beginPath(){calls.push(['beginPath']);},arc(...args){calls.push(['arc',...args]);},stroke(){calls.push(['stroke',this.strokeStyle,this.lineWidth,this.globalAlpha]);}};return {ctx,calls,stack};}
test('positive shield always retains old geometry and exact fallback at every zoom',()=>{
 for(const zoom of [.5,1,2]){const {ctx,calls,stack}=context(),e={x:21,y:39,shieldHp:40,shieldRemaining:0},before=structuredClone(e);
  assert.equal(drawShieldStateArt(ctx,e,30,zoom),true);
  assert.deepEqual(calls.find(x=>x[0]==='arc'),['arc',21,39,30+7/zoom,0,Math.PI*2]);
  assert.deepEqual(calls.find(x=>x[0]==='stroke'),['stroke','#a5f3fc',3/zoom,.4]);assert.deepEqual(e,before);assert.equal(stack.length,0);assert.equal(ctx.strokeStyle,'original');assert.equal(ctx.lineWidth,8);assert.equal(ctx.globalAlpha,.4);
 }
});
test('rich changes only stroke presentation; nonpositive shield draws nothing',()=>{
 for(const zoom of [.5,1,2]){const {ctx,calls}=context();assert.equal(drawShieldStateArt(ctx,{x:0,y:0,shieldHp:1},30,zoom,{rich:true}),true);assert.deepEqual(calls.find(x=>x[0]==='stroke'),['stroke','rgba(165,243,252,.65)',1.5/zoom,.4]);assert.deepEqual(calls.find(x=>x[0]==='arc'),['arc',0,0,30+7/zoom,0,Math.PI*2]);}
 for(const shieldHp of [undefined,0,-1]){const {ctx,calls}=context();assert.equal(drawShieldStateArt(ctx,{x:0,y:0,shieldHp},30,1,{rich:true}),false);assert.deepEqual(calls,[]);}
 resetRandom(72);const expected=random('ai');resetRandom(72);drawShieldStateArt(context().ctx,{x:0,y:0,shieldHp:1},30,1,{rich:true});assert.equal(random('ai'),expected);
});
