import test from 'node:test';
import assert from 'node:assert/strict';
import {drawRevisedLandmark,alphaContentBounds,LANDMARK_PRESENTATION} from '../js/landmarkArt.js';
import {random,resetRandom} from '../js/random.js';

const capture=()=>{
 const commands=[];
 return {commands,ctx:new Proxy({}, {get:(_,key)=>(...args)=>commands.push([key,...args]),set:(_,key,value)=>{commands.push(['set',key,value]);return true;}})};
};
test('approved landmarks preserve gameplay and healthy shelter/oasis across cooldown',()=>{
 for(const candidate of ['forest-tree','snow-flowers','snow-shelter','desert-oasis']){
  const object={candidate,x:1,y:2,config:{power:.08,cooldown:12}},before=JSON.stringify(object),a=capture(),b=capture();
  resetRandom(92);const expected=random('ai');resetRandom(92);
  assert.equal(drawRevisedLandmark(a.ctx,object,true),true);assert.equal(drawRevisedLandmark(b.ctx,object,false),true);
  assert.equal(random('ai'),expected);assert.equal(JSON.stringify(object),before);
  if(['snow-shelter','desert-oasis'].includes(candidate))assert.deepEqual(a.commands,b.commands);
  else assert.notDeepEqual(a.commands,b.commands,'only transfer leaves or petals show readiness');
 }
 const unknown=capture();assert.equal(drawRevisedLandmark(unknown.ctx,{candidate:'lake-garland'}),false);assert.deepEqual(unknown.commands,[]);
});

test('one missing image does not disable continuous landmark images or change readiness',async()=>{
 const previousImage=globalThis.Image,previousDocument=globalThis.document;
 try{
  globalThis.Image=class{async decode(){if(this.src.includes('guardian-002'))throw new Error('missing asset');}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}})})};
  const art=await import('../js/landmarkArt.js?partial-image-failure');
  assert.equal(await art.loadLandmarkImages(),false);
  for(const candidate of ['snow-shelter','desert-oasis']){
   const a=capture(),b=capture();
   art.drawRevisedLandmark(a.ctx,{candidate},true);art.drawRevisedLandmark(b.ctx,{candidate},false);
   assert.equal(a.commands[0][0],'drawImage');assert.deepEqual(a.commands,b.commands);
  }
  const flowerReady=capture(),flowerPost=capture();
  art.drawRevisedLandmark(flowerReady.ctx,{candidate:'snow-flowers'},true);
  art.drawRevisedLandmark(flowerPost.ctx,{candidate:'snow-flowers'},false);
  assert.equal(flowerReady.commands[0][0],'drawImage');
  assert.notEqual(flowerReady.commands[0][1],flowerPost.commands[0][1],'harvest swaps cached petal state');
  for(const candidate of ['grass-garland','grass-wind-stack','forest-berry-grove','lake-garland','desert-obelisk','volcano-obsidian-stack']){
   const sample=capture();assert.equal(art.drawRevisedLandmark(sample.ctx,{candidate}),true);
   assert.equal(sample.commands[0][0],'drawImage');
  }
  const fallback=capture();art.drawRevisedLandmark(fallback.ctx,{candidate:'forest-tree'});
  assert.equal(fallback.commands.some(([name])=>name==='drawImage'),false);
 }finally{
  if(previousImage===undefined)delete globalThis.Image;else globalThis.Image=previousImage;
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
 }
});


test('alpha crop keeps opaque silhouette and excludes export halos',()=>{
 const data=new Uint8ClampedArray(6*5*4);
 data[(0*6+0)*4+3]=3;data[(1*6+2)*4+3]=255;data[(3*6+4)*4+3]=18;
 assert.deepEqual(alphaContentBounds(data,6,5),{x:2,y:1,width:3,height:3});
 assert.deepEqual(alphaContentBounds(new Uint8ClampedArray(24),3,2),{x:0,y:0,width:3,height:2});
});
test('landmark world footprint and recommended range have consistent scale',()=>{
 assert.equal(Object.keys(LANDMARK_PRESENTATION).length,10);
 for(const p of Object.values(LANDMARK_PRESENTATION)){
  assert.ok(p.width>0&&p.height>0);assert.ok(p.radius>=Math.max(p.width,p.height)/2);
  assert.ok(p.tintAlpha>=0&&p.tintAlpha<=.12,'matte palette correction remains subtle');
 }
 assert.ok(LANDMARK_PRESENTATION['forest-tree'].width>LANDMARK_PRESENTATION['forest-berry-grove'].width);
 assert.ok(LANDMARK_PRESENTATION['desert-oasis'].width>LANDMARK_PRESENTATION['snow-flowers'].width);
});
