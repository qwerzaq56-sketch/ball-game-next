import test from 'node:test';
import assert from 'node:assert/strict';
import {recolorCharacterPixels,drawCharacterRasterBody,characterRasterStatus,loadCharacterRaster} from '../js/characterRasterArt.js';
import {resetRandom,random} from '../js/random.js';
test('character raster keeps species hue and alpha, limits shade rather than 3D shading',()=>{
 const source=new Uint8ClampedArray([160,160,160,255,160,160,160,255,0,0,0,200,255,255,255,50]);
 const before=source.slice(),out=recolorCharacterPixels(source,'#40a0e0');
 assert.deepEqual([...out.slice(0,4)],[64,160,224,255]);assert.equal(out[7],255);assert.equal(out[11],200);assert.equal(out[15],50);
 assert.ok(out[8]>=64*.87&&out[12]<=64*1.09);assert.deepEqual(source,before);
 assert.equal(recolorCharacterPixels(source,'red'),null);
});
test('unavailable raster returns fallback without touching character or consuming game RNG',async()=>{
 const e={x:4,y:8,size:40,colorHex:'#40a0e0',facing:2,behavior:'player'},before=JSON.stringify(e);
 resetRandom(44);const next=random('ai');resetRandom(44);
 assert.equal(await loadCharacterRaster(),false);assert.equal(drawCharacterRasterBody({},e,20,.5,false,'growth'),false);
 assert.equal(JSON.stringify(e),before);assert.equal(random('ai'),next);assert.equal(characterRasterStatus().ready,false);
});

test('ready raster uses exact diameter and fixed lighting even when facing changes',async()=>{
 const priorImage=globalThis.Image,priorDocument=globalThis.document;
 try{
  globalThis.Image=class{async decode(){}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData(){const data=new Uint8ClampedArray(192*192*4);data.fill(160);return {data};},createImageData(){return {data:new Uint8ClampedArray(192*192*4)};},putImageData(){}})})};
  const art=await import('../js/characterRasterArt.js?ready-test');assert.equal(await art.loadCharacterRaster(),true);
  const calls=[],ctx=new Proxy({}, {get:(_,k)=>(...args)=>calls.push([k,...args]),set:()=>true});
  const e={x:15,y:21,colorHex:'#40a0e0',facing:0,behavior:'player'};
  assert.equal(art.drawCharacterRasterBody(ctx,e,50,.5,false,'apex'),true);
  assert.deepEqual(calls.find(c=>c[0]==='drawImage').slice(2),[-35,-29,100,100]);
  const first=calls.find(c=>c[0]==='drawImage')[1];e.facing=2.6;calls.length=0;
  art.drawCharacterRasterBody(ctx,e,50,.5,false,'apex');assert.equal(calls.find(c=>c[0]==='drawImage')[1],first);
  assert.equal(calls.some(c=>['rotate','scale'].includes(c[0])),false);
  const shadow=calls.find(c=>c[0]==='ellipse');
  assert.deepEqual(shadow,['ellipse',15,30,49,49,0,0,Math.PI*2]);
  assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
  calls.length=0;art.drawCharacterRasterBody(ctx,e,50,1,false,'apex');
  assert.equal(calls.find(c=>c[0]==='ellipse')[2],28.5,'contact offset includes screen-space separator at zoom1');
  calls.length=0;art.drawCharacterRasterBody(ctx,e,100,1,false,'apex');
  assert.equal(calls.find(c=>c[0]==='ellipse')[2],28.5,'large-body contact offset capped at6screenpx plus separator');

  for(let i=0;i<40;i++)art.drawCharacterRasterBody(ctx,{...e,colorHex:'#'+i.toString(16).padStart(6,'0')},20,1);
  assert.equal(art.characterRasterStatus().colorCache,32);
 }finally{if(priorImage===undefined)delete globalThis.Image;else globalThis.Image=priorImage;if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}
});
