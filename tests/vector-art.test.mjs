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

test('actual entity drawing keeps the body outline when decorative helpers replace Canvas paths',async()=>{
 const {createGame}=await import('../tools/headless.mjs');const g=createGame(7),p=g.player,a=g.entities.find(e=>e.behavior==='ai');
 for(const e of [p,a]){
  e.size=80;e.scalePulseTimer=.15;e.apex=false;e.frozen=0;e.morale=null;e.command=null;e.invincible=false;
  let path=null;const strokes=[];const data={beginPath(){path=null;},arc(x,y,r){path={x,y,r};},stroke(){strokes.push({path,style:data.strokeStyle});}};
  const ctx=new Proxy(data,{get:(obj,key)=>obj[key]??(()=>{}),set:(obj,key,value)=>{obj[key]=value;return true;}});
  g.drawEntity(ctx,e);const outline=strokes.find(s=>s.path?.x===e.x&&s.path?.y===e.y&&s.path?.r===40&&s.style===(e.behavior==='player'?'#ffffff':'rgba(0,0,0,0.45)'));assert(outline,'real size/2 body outline is visible');
 }
});
