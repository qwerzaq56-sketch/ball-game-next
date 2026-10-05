import test from 'node:test';
import assert from 'node:assert/strict';
import {random,resetRandom} from '../js/random.js';
const capture=()=>{const commands=[];return {commands,ctx:new Proxy({globalAlpha:1},{get:(target,key)=>key in target?target[key]:(...args)=>commands.push([key,...args]),set:(target,key,value)=>{target[key]=value;commands.push(['set',key,value]);return true;}})};};
test('environment cache isolates failures and uses distinct resting vent without rotation',async()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;
 try{
  globalThis.Image=class{naturalWidth=120;naturalHeight=60;async decode(){if(this.src.includes('lake-vortex'))throw new Error('missing');}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}})})};
  const art=await import('../js/environmentArt.js?state-test');assert.equal(await art.loadEnvironmentImages(),false);
  const o={candidate:'volcano-vent-cycle',x:70,y:80,visualScale:1,config:{radius:110}},before=JSON.stringify(o),on=capture(),off=capture();
  resetRandom(94);const expected=random('ai');resetRandom(94);
  assert.equal(art.drawEnvironmentalArt(on.ctx,o,{active:true}),true);assert.equal(art.drawEnvironmentalArt(off.ctx,o,{active:false}),true);
  assert.notEqual(on.commands.find(([k])=>k==='drawImage')[1],off.commands.find(([k])=>k==='drawImage')[1]);
  assert.equal(off.commands.some(([k])=>k==='rotate'),false);assert.equal(JSON.stringify(o),before);assert.equal(random('ai'),expected);
  const current=capture();assert.equal(art.drawEnvironmentalArt(current.ctx,{candidate:'lake-current',width:100},{a:{x:0,y:0},b:{x:0,y:200}}),true);
  assert.deepEqual(current.commands.find(([k])=>k==='rotate'),['rotate',Math.PI/2]);
  assert.deepEqual(current.commands.find(([k])=>k==='rect'),['rect',-100,-50,200,100]);
  const absent=capture();assert.equal(art.drawEnvironmentalArt(absent.ctx,{candidate:'lake-vortex',x:0,y:0,config:{radius:180}}),false);assert.deepEqual(absent.commands,[]);
  const zero=capture();assert.equal(art.drawEnvironmentalArt(zero.ctx,{candidate:'lake-current',width:100},{a:{x:0,y:0},b:{x:0,y:0}}),false);
 }finally{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
