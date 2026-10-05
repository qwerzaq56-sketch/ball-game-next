import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TerrainArt,terrainVariant,forestDecoration,forestGroundVariant,terrainBlendWeights,forestDensity,forestLayout,forestVegetationWeights} from '../js/terrainArt.js';
import {resetRandom,random} from '../js/random.js';
test('functional forest ground preserves gameplay, wraps with the floor and skips passive vegetation',()=>{
 const art=new TerrainArt(),previous=globalThis.document,draws=[];
 const context=()=>({drawImage(){},translate(){},scale(){},fillRect(){},createRadialGradient(){return {addColorStop(){}};}});
 globalThis.document={createElement(){return {getContext:context};}};
 art.forestFloor={width:800,height:800};
 const o={candidate:'forest-berry-grove',x:790,y:790,visualScale:1,config:{radius:78,cooldown:14}},before=JSON.stringify(o);
 const ctx={drawImage(...args){draws.push(args);}};
 resetRandom(82);const expected=random('world');resetRandom(82);
 try{
  assert.equal(art.drawObjectGround(ctx,o),true);assert.equal(art.objectGrounds.size,1);
  assert.equal(art.drawObjectGround(ctx,{...o,x:o.x+8000,y:o.y-8000}),true);
  assert.equal(draws[0][0],draws[1][0]);assert.equal(art.objectGrounds.size,1);
  assert.equal(art.drawObjectGround(ctx,{...o,candidate:'passive-bush'}),false);
  art.enabled=false;assert.equal(art.drawObjectGround(ctx,o),false);
  assert.equal(random('world'),expected);assert.equal(JSON.stringify(o),before);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('missing canopy variant uses the previous canopy without disabling other forest assets',async()=>{
 const old={document:globalThis.document,Image:globalThis.Image,fetch:globalThis.fetch},sources=[];
 const manifest=JSON.parse(fs.readFileSync(new URL('../assets/terrain/manifest.json',import.meta.url)));
 globalThis.document={createElement(){return {getContext(){return {drawImage(image){if(image.src)sources.push(image.src);}};}};}};
 globalThis.Image=class{width=100;height=100;async decode(){if(this.src.endsWith('/canopy-007.png'))throw new Error('missing canopy fixture');}};
 globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
 try{
  const art=new TerrainArt();await art.loading;
  assert.equal(art.ready,true);assert.equal(art.forestCanopy,true);assert.equal(art.tiles.get('forest').length,3);
  assert.match(art.canopyVariantError,/missing canopy fixture/);
  for(const file of ['canopy-001.png','canopy-008.png','canopy-009.png','understory-003.png'])assert(sources.some(src=>src.endsWith('/'+file)));
 }finally{for(const [key,value]of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
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
 assert.equal(variants.size,3);assert(occupied/total>.15&&occupied/total<.25);
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

 test('terrain boundary weights remain continuous across straight edges and four-biome corners',()=>{
  for(let p=0;p<=200;p+=.5){const w=terrainBlendWeights(p);assert(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-12);assert(w.every(v=>v>=0&&v<=1));}
  assert.deepEqual(terrainBlendWeights(0),[.5,.5,0]);assert.deepEqual(terrainBlendWeights(200),[0,.5,.5]);
  for(const y of [0,30,100,170,200]){const wy=terrainBlendWeights(y);for(let j=0;j<3;j++)assert.equal(terrainBlendWeights(200)[2]*wy[j],terrainBlendWeights(0)[1]*wy[j]);}
 });
 test('neighbor artwork uses destination texture coordinates and merges repeated biome contributions',()=>{
  const art=new TerrainArt();art.ready=true;art.tiles.set('grass',[{width:800,height:800}]);art.tiles.set('desert',[{width:800,height:800}]);art.rasterBiomes=new Set(['grassland','desert']);
  const previous=globalThis.document,crops=[];
  globalThis.document={createElement(){return {getContext(){return {createImageData(){return {data:new Uint8ClampedArray(200*200*4)};},putImageData(){},drawImage(...a){if(a.length===9)crops.push(a.slice(1,3));}};}};}};
  try{art.drawTile({drawImage(){}},{x:400,y:600,region:{id:'grassland'}},{game:{balance:{world:{worldWidth:8000,worldHeight:8000}}},regionAt(p){return {id:p.x>=600?'desert':'grassland'};}});assert.deepEqual(crops,[[400,600],[400,600]]);}
  finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
 });

test('revisiting a boundary layout at a different texture phase reuses its bounded alpha masks',()=>{
 const art=new TerrainArt();art.ready=true;art.tiles.set('grass',Array.from({length:3},()=>({width:800,height:800})));art.tiles.set('desert',Array.from({length:3},()=>({width:800,height:800})));art.rasterBiomes=new Set(['grassland','desert']);
 const previous=globalThis.document;let generated=0;
 globalThis.document={createElement(){return {getContext(){return {createImageData(){generated++;return {data:new Uint8ClampedArray(200*200*4)};},putImageData(){},drawImage(){}};}};}};
 try{
  const biomes={game:{balance:{world:{worldWidth:8000,worldHeight:8000}}},regionAt(p){return {id:p.x>=600?'desert':'grassland'};}};
  for(const y of [200,400,600])art.drawTile({drawImage(){}},{x:400,y,region:{id:'grassland'}},biomes);
  assert.equal(generated,2);assert.equal(art.blendMasks.size,1);assert.equal(art.layers.size,3);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('expanded forest ground does not alias boundary crops 800 world units apart',()=>{
 const art=new TerrainArt();art.ready=true;art.forestRaster=true;art.tiles.set('forest',Array.from({length:3},()=>({width:1600,height:1600})));art.tiles.set('desert',Array.from({length:3},()=>({width:800,height:800})));
 const old=globalThis.document,crops=[];globalThis.document={createElement(){return {getContext(){return {createImageData(){return {data:new Uint8ClampedArray(200*200*4)};},putImageData(){},drawImage(...a){if(a.length===9&&a[0].width===1600)crops.push(a.slice(1,3));}};}};}};
 try{const b={game:{balance:{world:{worldWidth:8000,worldHeight:8000}}},regionAt(p){return {id:p.x%800>=600?'desert':'forest'};}};for(const x of [400,1200])art.drawTile({drawImage(){}},{x,y:200,region:{id:'forest'}},b);assert.deepEqual(crops,[[400,200],[1200,200]]);assert.equal(art.layers.size,2);}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});

test('forest density is continuous across chunk edges and world wrap with clear paths',()=>{
 for(const p of [0,800,1600,7999]){assert(Math.abs(forestDensity(p,500)-forestDensity(p+8000,500))<1e-10);assert(Math.abs(forestDensity(300,p)-forestDensity(300,p+8000))<1e-10);}
 assert.equal(forestDensity(0,1000),0);
 for(let x=0;x<8000;x+=200){for(let y=0;y<8000;y+=200){const d=forestDensity(x,y);assert(d>=0&&d<=1);assert(Math.abs(d-forestDensity(x+.01,y))<.001);}}
});

test('tree variants load distinct sprites and one missing variant preserves the forest pack',async()=>{
 const old={document:globalThis.document,Image:globalThis.Image,fetch:globalThis.fetch};
 const manifest=JSON.parse(fs.readFileSync(new URL('../assets/terrain/manifest.json',import.meta.url)));
 globalThis.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(image){canvas.source=image.src;}});return canvas;}};
 globalThis.Image=class{async decode(){if(this.src.endsWith('tree-005.png'))throw new Error('missing variant');}};
 globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
 try{const art=new TerrainArt();await art.loading;assert.equal(art.ready,true);assert.equal(art.forestRaster,true);assert.equal(art.forestTrees.length,3);assert.match(art.forestTrees[0].source,/tree-004.png$/);assert.match(art.forestTrees[1].source,/tree-003.png$/);assert.match(art.forestTrees[2].source,/tree-007.png$/);assert.match(art.treePackError,/missing variant/);}
 finally{for(const [key,value]of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('forest layout keeps shrubs dominant and separates empty cores from transition belts',()=>{
 const kinds={};let covered=0,total=0;
 for(let x=0;x<8000;x+=40)for(let y=0;y<8000;y+=40){const v=forestLayout(x,y);kinds[v.kind]=(kinds[v.kind]||0)+1;covered+=v.density>.75?1:0;total++;if(v.kind==='clearing'||v.kind==='path')assert.equal(v.density,0);}
 assert(covered/total>.75);for(const k of ['clearing','path','transition','shrubs'])assert(kinds[k]>0);
});

test('forest vegetation variants blend continuously without consuming gameplay RNG',()=>{
 resetRandom(31);const expected=random('world');resetRandom(31);const seen=new Set();
 for(let x=0;x<8000;x+=20){const w=forestVegetationWeights(x,500);assert(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-12);assert(w.every(v=>v>=0&&v<=1));seen.add(w.indexOf(Math.max(...w)));for(let i=0;i<3;i++){assert(Math.abs(w[i]-forestVegetationWeights(x+8000,500)[i])<1e-10);assert(Math.abs(w[i]-forestVegetationWeights(x,8500)[i])<1e-10);}}
 assert.equal(seen.size,3);assert.equal(random('world'),expected);
});
