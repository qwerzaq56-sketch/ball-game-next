import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSpeciesMark,drawGrowthPulse,drawPlayerDirection} from '../js/vectorArt.js';
import {random,resetRandom} from '../js/random.js';
test('vector overlays preserve entity state and RNG while growth uses an outside ring',()=>{
 const arcs=[];const ctx=new Proxy({}, {get:(_,key)=>key==='arc'?((...args)=>arcs.push(args)):()=>{},set:()=>true});
 const e={x:20,y:30,size:40,behavior:'player',color:'blue',facing:1,scalePulseTimer:.15};const before=JSON.stringify(e);resetRandom(9);const expected=random('ai');resetRandom(9);
 for(const color of ['cyan','blue','green','red','yellow'])drawSpeciesMark(ctx,{...e,color},1);
 drawGrowthPulse(ctx,e,1);drawPlayerDirection(ctx,e,1);assert.equal(JSON.stringify(e),before);assert.equal(random('ai'),expected);assert(arcs.some(a=>a[0]===e.x&&a[1]===e.y&&a[2]>e.size/2));
});
