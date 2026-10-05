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
  g.drawEntity(ctx,e);const outline=strokes.find(s=>s.path?.x===e.x&&s.path?.y===e.y&&s.path?.r===40&&s.style===e.colorHex);assert(outline,'real size/2 body outline is visible');
 }
});

test('attack preview is hidden before unlock and red only during reuse wait',async()=>{const {createGame}=await import('../tools/headless.mjs');const g=createGame(7),p=g.player;g.input.mouseDown=true;p.attackUnlocked=true;p.attackState='READY';p.attackStack=1;p.frozen=0;p.dodgeState='READY';const data={};const strokes=[];const ctx=new Proxy(data,{get:(obj,key)=>key==='stroke'?()=>strokes.push(data.strokeStyle):obj[key]??(()=>{}),set:(obj,key,value)=>{obj[key]=value;return true;}});for(const change of [{attackStack:0},{attackState:'RECOVERY'}]){const old={};for(const key in change){old[key]=p[key];p[key]=change[key];}strokes.length=0;g.drawEntity(ctx,p);assert(strokes.includes('rgba(248,113,113,.85)'),JSON.stringify(change));Object.assign(p,old);}strokes.length=0;g.drawEntity(ctx,p);assert(strokes.includes('rgba(255,255,255,.45)'));for(const change of [{attackUnlocked:false},{frozen:1},{dodgeState:'DODGING'}]){Object.assign(p,{attackUnlocked:true,frozen:0,dodgeState:'READY'},change);strokes.length=0;g.drawEntity(ctx,p);assert(!strokes.includes('rgba(248,113,113,.85)'));assert(!strokes.includes('rgba(255,255,255,.45)'));}});

test('small bodies stay plain and species marks appear only when large enough on screen',()=>{const calls=[];const ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});for(const [size,zoom] of [[30,1],[60,1],[100,.2]])drawSpeciesMark(ctx,{behavior:'ai',color:'blue',x:0,y:0,size},zoom);assert.equal(calls.length,0);drawSpeciesMark(ctx,{behavior:'ai',color:'blue',x:0,y:0,size:80},1);assert(calls.length>0);});
