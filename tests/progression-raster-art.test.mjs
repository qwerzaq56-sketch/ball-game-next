import test from 'node:test';
import assert from 'node:assert/strict';
import {growthTextureGeometry,absorptionTextureGeometry,drawGrowthRasterTexture,drawAbsorptionRasterTexture} from '../js/progressionRasterArt.js';
import {random,resetRandom} from '../js/random.js';
test('growth decoration is driven solely by real pulse and keeps world radius scale',()=>{
 const e={size:100,scalePulseTimer:.15,colorHex:'#40a0e0',behavior:'player'};
 assert.deepEqual(growthTextureGeometry(e,.5),{radius:72,alpha:.16});
 assert.equal(growthTextureGeometry({...e,scalePulseTimer:0},1),null);assert.equal(growthTextureGeometry({...e,behavior:'orb'},1),null);
});
test('absorption decoration requires actual relationship and never invents direction or progress',()=>{
 const eater={x:100,y:0},target={x:0,y:0,beingAbsorbedByRef:eater};
 assert.deepEqual(absorptionTextureGeometry(target,eater,.5,1),{angle:0,length:100,width:6,alpha:.11});
 assert.equal(absorptionTextureGeometry(target,{...eater},.5,1),null);assert.equal(absorptionTextureGeometry(target,eater,0,1),null);
});
test('progression fallback leaves state and game randomness unchanged',()=>{
 const eater={x:100,y:0},e={x:0,y:0,size:100,scalePulseTimer:.15,colorHex:'#40a0e0',beingAbsorbedByRef:eater},before=JSON.stringify(e);
 resetRandom(61);const next=random('ai');resetRandom(61);
 assert.equal(drawGrowthRasterTexture({},e,1),false);assert.equal(drawAbsorptionRasterTexture({},e,eater,.2,1),false);
 assert.equal(JSON.stringify(e),before);assert.equal(random('ai'),next);
});

test('absorption texture follows short torus seam path with actual relationship',()=>{
 const world={wrap:true,worldWidth:1000,worldHeight:800},eater={x:10,y:15},target={x:990,y:795,beingAbsorbedByRef:eater};
 const g=absorptionTextureGeometry(target,eater,.4,1,world);
 assert.equal(g.length,Math.hypot(20,20));assert.equal(g.angle,Math.PI/4);
 assert.equal(absorptionTextureGeometry(target,{...eater},.4,1,world),null);
 assert.ok(absorptionTextureGeometry(target,eater,.4,1,{...world,wrap:false}).length>1000);
});

test('a missing growth sprite does not prevent absorption; source points toward the actual eater',async()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;
 try{
  globalThis.Image=class{async decode(){if(this.src.includes('growth-001'))throw Error('missing growth');}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},fillRect(){}})})};
  const art=await import('../js/progressionRasterArt.js?partial-failure-v2');
  assert.equal(await art.loadProgressionRaster(),false);
  const commands=[],ctx=new Proxy({globalAlpha:1},{get:(t,k)=>k in t?t[k]:(...args)=>commands.push([k,...args])});
  const eater={x:100,y:0},target={x:0,y:0,beingAbsorbedByRef:eater};
  assert.equal(art.drawAbsorptionRasterTexture(ctx,target,eater,.5,1),true);
  assert.ok(commands.some(([name,x,y])=>name==='scale'&&x===-1&&y===1),'leftward source is mirrored into target-to-eater axis');
  const draw=commands.find(([name])=>name==='drawImage');assert.equal(draw[2],-100);assert.equal(draw[4],100,'mirrored image covers target-to-eater span');
 }finally{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
