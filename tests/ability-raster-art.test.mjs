import test from 'node:test';
import assert from 'node:assert/strict';
import {random,resetRandom} from '../js/random.js';
import {restrainAbilityAlpha} from '../js/abilityRasterArt.js';
test('ability display correction preserves raw pixel colors and opaque shapes',()=>{
 const source=new Uint8ClampedArray([20,80,160,0,20,80,160,64,20,80,160,128,20,80,160,255]),before=[...source],result=restrainAbilityAlpha(source);
 assert.deepEqual([...source],before);assert.equal(result[3],0);assert.equal(result[15],255);assert.ok(result[7]<64);assert.ok(result[11]<128);
 for(let i=0;i<source.length;i++)if(i%4!==3)assert.equal(result[i],source[i]);
});
const capture=()=>{const commands=[];return {commands,ctx:new Proxy({globalAlpha:1},{get:(t,k)=>k in t?t[k]:(...args)=>commands.push([k,...args]),set:(t,k,v)=>{t[k]=v;commands.push(['set',k,v]);return true;}})};};
test('ability texture clipping uses parent geometry and consumes no gameplay state or randomness',async()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;let decodes=0;
 try{
  globalThis.Image=class{naturalWidth=1024;naturalHeight=1024;async decode(){decodes++;if(this.src.includes('red-embers'))throw Error('missing texture');}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}})})};
  const art=await import('../js/abilityRasterArt.js?partial-failure');assert.equal(await art.loadAbilityRaster(),false);assert.equal(art.abilityRasterStatus().loaded.length,7);assert.deepEqual(art.abilityRasterStatus().failed,['red-embers']);assert.deepEqual(art.abilityRasterStatus().pending,[]);
  const config={x:90,y:110,radius:200,direction:Math.PI/3},before=JSON.stringify(config),a=capture();
  resetRandom(88);const expected=random('ai');resetRandom(88);
  assert.equal(art.drawAbilityRaster(a.ctx,'cyan-sweep',{...config,width:200,height:340,clip:ctx=>{ctx.moveTo(config.x,config.y);ctx.arc(config.x,config.y,config.radius,config.direction-Math.PI/3,config.direction+Math.PI/3);ctx.closePath();}}),true);
  assert.equal(random('ai'),expected);assert.equal(JSON.stringify(config),before);
  assert.deepEqual(a.commands.find(([k])=>k==='arc').slice(1),[90,110,200,0,Math.PI*2/3]);
  assert.ok(a.commands.findIndex(([k])=>k==='clip')<a.commands.findIndex(([k])=>k==='translate'),'exact parent shape clips before texture transform');
  assert.deepEqual(a.commands.find(([k])=>k==='rotate'),['rotate',Math.PI/3]);
  const radial=capture();assert.equal(art.drawAbilityRaster(radial.ctx,'red-muster',{x:0,y:0,radius:100,direction:Math.PI/2}),true);assert.equal(radial.commands.some(([k])=>k==='rotate'),false,'coordination ornament never rotates with facing');
  const missing=capture();assert.equal(art.drawAbilityRaster(missing.ctx,'red-embers',{x:0,y:0,radius:100}),false);assert.deepEqual(missing.commands,[]);
  const invalid=capture();assert.equal(art.drawAbilityRaster(invalid.ctx,'new-ability',{x:0,y:0,radius:100}),false);assert.equal(art.drawAbilityRaster(invalid.ctx,'cyan-shield',{x:0,y:0,radius:-1}),false);assert.deepEqual(invalid.commands,[]);
  assert.equal(await art.loadAbilityRaster(),false);assert.equal(decodes,8,'settled failure and successful caches never decode per frame');
 }finally{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
