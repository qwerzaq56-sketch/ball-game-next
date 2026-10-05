import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TerrainArt,terrainVariant,forestDecoration,forestGroundVariant} from '../js/terrainArt.js';
import {resetRandom,random} from '../js/random.js';
test('R-VIS-006 terrain variant remains stable for a 2x2 block without gameplay RNG',()=>{
 resetRandom(34);const expected=random('world');resetRandom(34);
 for(const x of [-800,0,400,7600])for(const y of [-400,0,1200]){
  const v=terrainVariant(x,y);assert(v>=0&&v<3);
  assert.equal(terrainVariant(x+200,y+200),v);
 }
 assert.equal(random('world'),expected);
});
test('R-VIS-006 terrain loading/off states preserve original fallback and never mutate biome classification',()=>{
 const art=new TerrainArt(),tile={x:0,y:0,region:{id:'grassland'}},calls=[];
 const ctx={drawImage(...args){calls.push(args);}},biomes={game:{balance:{world:{worldWidth:8000,worldHeight:8000}}},regionAt(){return tile.region;}};
 assert.equal(art.drawTile(ctx,tile,biomes),false);assert.equal(calls.length,0);
 const textures=[{}, {}, {}];art.tiles.set('grass',textures);art.ready=true;
 assert.equal(art.drawTile(ctx,tile,biomes),true);assert.equal(calls.length,1);
 assert.deepEqual(calls[0].slice(1),[0,0,200,200,0,0,200,200]);
 art.setEnabled(false);assert.equal(art.drawTile(ctx,tile,biomes),false);
 assert.deepEqual(tile,{x:0,y:0,region:{id:'grassland'}});
});
test('R-VIS-006 terrain manifest resolves all six biome packs and 8 masks within 2MB',()=>{
 const root=new URL('../assets/terrain/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
 assert.equal(Object.keys(m.biomes).length,6);assert.equal(Object.keys(m.transitionMasks).length,8);
 let bytes=0;for(const file of [...Object.values(m.biomes).flatMap(b=>b.files),...Object.values(m.transitionMasks)]){
  const data=fs.readFileSync(new URL(file,root));bytes+=data.length;assert.match(data.toString(),/<svg /);
 }
 assert(bytes<2_000_000);
});
test('forest decorations stay within their cell, vary appearance and leave gameplay RNG untouched',()=>{
 resetRandom(91);const expected=random('world');resetRandom(91);
 const variants=new Set();let occupied=0,total=0;
 for(let x=0;x<8000;x+=200)for(let y=0;y<8000;y+=200){
  total++;const d=forestDecoration(x,y);assert.deepEqual(d,forestDecoration(x,y));if(!d)continue;
  occupied++;variants.add(d.variant);
  assert(d.x-d.size/2>=x&&d.x+d.size/2<=x+200);
  assert(d.y-d.size/2>=y&&d.y+d.size/2<=y+200);
 }
 assert.equal(variants.size,4);assert(occupied/total>.15&&occupied/total<.25);
 assert.equal(random('world'),expected);
});
test('forest ground keeps one image orientation across every 800-world block',()=>{
 for(const x of [-800,0,800,1600])for(const y of [-800,0,800,1600]){
  const v=forestGroundVariant(x,y);assert(v>=0&&v<3);
  for(const dx of [0,200,400,600])for(const dy of [0,200,400,600])assert.equal(forestGroundVariant(x+dx,y+dy),v);
 }
 const art=new TerrainArt(),textures=[{width:800},{width:800},{width:800}];art.tiles.set('forest',textures);art.forestRaster=true;
 assert.equal(art.texture('forest',600,600),textures[forestGroundVariant(600,600)]);
 art.forestRaster=false;assert.equal(art.texture('forest',600,600),textures[terrainVariant(600,600)]);
 art.tiles.set('grass',textures);art.rasterBiomes.add('grassland');
 assert.equal(art.texture('grassland',600,600),textures[forestGroundVariant(600,600)]);
 assert.equal(art.texture('grassland',-200,-200),textures[forestGroundVariant(-200,-200)]);
});
test('boundary cache distinguishes 800-world forest crops and remains bounded',()=>{
 const art=new TerrainArt(),previous=globalThis.document,crops=[];
 art.tiles.set('forest',Array.from({length:3},()=>({width:800,height:800})));art.forestRaster=true;art.masks.set('north',{});
 globalThis.document={createElement(){return {getContext(){return {drawImage(...args){if(args.length===9)crops.push(args.slice(1,3));}}}};}};
 try{
  const first=art.layer('forest',0,0,'north'),second=art.layer('forest',400,0,'north');
  assert.notEqual(first,second);assert.deepEqual(crops,[[0,0],[400,0]]);
  assert.equal(art.layer('forest',0,0,'north'),first);assert.equal(crops.length,2);
  art.layer('forest',-200,-200,'north');assert.deepEqual(crops.at(-1),[600,600]);
  for(let i=0;i<150;i++){art.masks.set('d'+i,{});art.layer('forest',0,0,'d'+i);}
  assert.equal(art.layers.size,96);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('regional raster failure leaves its SVG usable without blocking other region images',async()=>{
 const old={document:globalThis.document,Image:globalThis.Image,fetch:globalThis.fetch};
 const manifest=JSON.parse(fs.readFileSync(new URL('../assets/terrain/manifest.json',import.meta.url)));
 globalThis.document={createElement(){return {getContext(){return {drawImage(){}};}};}};
 globalThis.Image=class{async decode(){if(this.src.endsWith('/snow-ground-002.png'))throw new Error('fixture missing snow');}};
 globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
 try{
  const art=new TerrainArt();await art.loading;assert.equal(art.ready,true);
  assert.equal(art.tiles.get('snow')[0].width,400);assert.equal(art.rasterBiomes.has('snow'),false);
  assert.match(art.rasterPackErrors.get('snow'),/fixture missing snow/);
  for(const id of ['grassland','lake','volcano','desert']){
   assert.equal(art.rasterBiomes.has(id),true);assert.equal(art.texture(id,-200,-200).width,800);
  }
  assert.equal(art.forestRaster,true);assert.equal(art.masks.size,8);
 }finally{for(const [key,value]of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
