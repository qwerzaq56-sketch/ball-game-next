import test from 'node:test';
import assert from 'node:assert/strict';
import {drawMatteBody} from '../js/vectorArt.js';
import {resetRandom,random} from '../js/random.js';
test('R-VIS-001 matte body keeps exact colored silhouette with a bounded neutral separator and state while RNG and thin outlines are independent of size',()=>{
 for(const zoom of [.5,1])for(const size of [20,100,400]){
  const data={},arcs=[],widths=[];
  const ctx=new Proxy(data,{get:(o,k)=>k==='arc'?((...a)=>arcs.push(a)):o[k]??(()=>{}),set:(o,k,v)=>{o[k]=v;if(k==='lineWidth')widths.push(v);return true;}});
  const e={x:10,y:20,size,colorHex:'#22c55e',attackState:'READY'};
  const before=JSON.stringify(e);resetRandom(22);const expected=random('ai');resetRandom(22);
  drawMatteBody(ctx,e,size/2,zoom);assert.equal(JSON.stringify(e),before);assert.equal(random('ai'),expected);
  assert.equal(arcs.length,3);assert.equal(arcs[0][2],size/2+1.5/zoom);assert(arcs.slice(1).every(a=>a[2]===size/2));assert(widths.every(w=>w*zoom<=2));
 }
});
