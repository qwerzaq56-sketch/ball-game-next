// R-VIS-001: presentation-only SVG cache; no gameplay RNG, classification or physics.
export function terrainVariant(x,y){return ((Math.imul(Math.floor(x/400),73856093)^Math.imul(Math.floor(y/400),19349663))>>>0)%3;}
export function forestGroundVariant(x,y){return ((Math.imul(Math.floor(x/800),73856093)^Math.imul(Math.floor(y/800),19349663))>>>0)%3;}
const biomeKey=id=>id==='grassland'?'grass':id;
const modulo=(x,n)=>(x%n+n)%n;
// A continuous partition of unity: shared edges meet at 1/2, corners at 1/4.
export function terrainBlendWeights(position){
 const smooth=t=>t*t*(3-2*t);
 const before=position<60?.5*(1-smooth(position/60)):0;
 const after=position>140?.5*smooth((position-140)/60):0;
 return [before,1-before-after,after];
}
export function forestDecoration(x,y){
 const h=(Math.imul(x/200,83492791)^Math.imul(y/200,19349663))>>>0;
 if(h%5!==0)return null;
 const size=140+(h>>>8)%45,margin=(200-size)/2;
 return {size,x:x+100+(((h>>>14)%101)/50-1)*margin,y:y+100+(((h>>>21)%101)/50-1)*margin,variant:(h>>>6)%4};
}
export class TerrainArt {
 constructor(){this.enabled=true;this.ready=false;this.error=null;this.tiles=new Map();this.masks=new Map();this.layers=new Map();this.rasterBiomes=new Set();
  if(typeof document!=='undefined'&&typeof Image!=='undefined')this.loading=this.load();
 }
 setEnabled(enabled){this.enabled=!!enabled;}
 async load(){
  try{
   const base=new URL('../assets/terrain/',import.meta.url);
   const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw new Error('Terrain manifest unavailable');
   const manifest=await response.json();
   const image=async file=>{const i=new Image();i.src=new URL(file,base).href;await i.decode();return i;};
   const raster=async file=>{const i=await image(file),c=document.createElement('canvas');c.width=c.height=400;c.getContext('2d').drawImage(i,0,0,400,400);return c;};
   await Promise.all(Object.entries(manifest.biomes).map(async([id,b])=>{
    if(b.files.length!==3)throw new Error('Terrain variants missing');this.tiles.set(id,await Promise.all(b.files.map(raster)));
   }));
   await Promise.all(Object.entries(manifest.transitionMasks).map(async([id,file])=>this.masks.set(id,await raster(file))));
   // Approved image-asset pilot. Optional loading keeps the original vector pack usable.
   try{
    const pack=new URL('../assets/art-packs/forest-raster-v1/',import.meta.url);
    const ground=new Image(),tree=new Image();ground.src=new URL('ground-002.png',pack).href;tree.src=new URL('tree-001.png',pack).href;
    await Promise.all([ground.decode(),tree.decode()]);
    this.tiles.set('forest',Array.from({length:3},(_,v)=>{
     const c=document.createElement('canvas');c.width=c.height=800;const ctx=c.getContext('2d');
     ctx.drawImage(ground,0,0,800,800);return c;
    }));this.forestRaster=true;
    this.forestTrees=Array.from({length:4},(_,v)=>{
     const tc=document.createElement('canvas');tc.width=tc.height=256;const ctx=tc.getContext('2d');
     ctx.drawImage(tree,0,0,256,256);return tc;
    });
   }catch(error){this.imagePackError=String(error);}
   // Each regional image is optional independently. Preserve loaded SVGs on failure.
   this.rasterPackErrors=new Map();
   await Promise.all([
    ['grassland','grass-raster-v1/ground-001.png'],
    ['lake','regions-raster-v1/lake-ground-001.png'],
    ['snow','regions-raster-v1/snow-ground-002.png'],
    ['volcano','regions-raster-v1/volcano-ground-001.png'],
    ['desert','regions-raster-v1/desert-ground-001.png'],
   ].map(async([id,file])=>{
    try{
     const ground=new Image();ground.src=new URL('../assets/art-packs/'+file,import.meta.url).href;await ground.decode();
     const c=document.createElement('canvas');c.width=c.height=800;c.getContext('2d').drawImage(ground,0,0,800,800);
     this.tiles.set(biomeKey(id),[c,c,c]);this.rasterBiomes.add(id);
    }catch(error){this.rasterPackErrors.set(id,String(error));if(id==='grassland')this.grassPackError=String(error);}
   }));
   this.ready=['grass','forest','lake','snow','volcano','desert'].every(id=>this.tiles.has(id));
  }catch(error){this.error=String(error);this.ready=false;this.tiles.clear();this.masks.clear();this.layers.clear();}
 }
 variant(id,x,y){return (id==='forest'&&this.forestRaster)||this.rasterBiomes.has(id)?forestGroundVariant(x,y):terrainVariant(x,y);}
 texture(id,x,y){return this.tiles.get(biomeKey(id))?.[this.variant(id,x,y)];}
 layer(id,x,y,direction){
  const texture=this.texture(id,x,y),mask=this.masks.get(direction);if(!texture||!mask)return null;
  // Cache the actual neighbor crop, including its 800-world raster phase.
  const tx=modulo(x,texture.width||400),ty=modulo(y,texture.height||400);
  const key=`${id}:${this.variant(id,x,y)}:${tx}:${ty}:${direction}`;
  if(this.layers.has(key))return this.layers.get(key);
  const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');
  // Meet at a shared 50/50 mixture instead of swapping both colors at the seam.
  ctx.globalAlpha=.5;ctx.drawImage(texture,tx,ty,200,200,0,0,200,200);ctx.globalAlpha=1;
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,200,200);
  if(this.layers.size>=96)this.layers.delete(this.layers.keys().next().value);
  this.layers.set(key,c);return c;
 }
 drawTile(ctx,tile,biomes){
  if(!this.enabled||!this.ready)return false;
  const {x,y,region}=tile,texture=this.texture(region.id,x,y);if(!texture)return false;
  const sx=modulo(x,texture.width||400),sy=modulo(y,texture.height||400);ctx.drawImage(texture,sx,sy,200,200,x,y,200,200);
  const world=biomes.game.balance.world,ids=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=modulo(x+dx*200,world.worldWidth),ny=modulo(y+dy*200,world.worldHeight);
   ids.push(biomes.regionAt({x:nx+100,y:ny+100})?.id||region.id);
  }
  if(ids.every(id=>id===region.id)){
   if(region.id==='forest'&&this.forestTrees){const d=forestDecoration(x,y);if(d)ctx.drawImage(this.forestTrees[d.variant],d.x-d.size/2,d.y-d.size/2,d.size,d.size);}
   return true;
  }
  const key='blend:'+ids.map(id=>`${id}:${this.variant(id,x,y)}`).join(',')+`:${modulo(x,800)}:${modulo(y,800)}`;
  let composed=this.layers.get(key);
  if(!composed){
   composed=document.createElement('canvas');composed.width=composed.height=200;
   const output=composed.getContext('2d');
   const weights=Array.from({length:200},(_,p)=>terrainBlendWeights(p+.5));
   for(const id of new Set(ids)){
    const image=this.texture(id,x,y);if(!image)continue;
    const mask=document.createElement('canvas');mask.width=mask.height=200;
    const mc=mask.getContext('2d'),pixels=mc.createImageData(200,200);
    for(let py=0;py<200;py++)for(let px=0;px<200;px++){
     const wx=weights[px],wy=weights[py];let weight=0;
     for(let j=0;j<3;j++)for(let i=0;i<3;i++)if(ids[j*3+i]===id)weight+=wx[i]*wy[j];
     const n=(py*200+px)*4;pixels.data[n]=pixels.data[n+1]=pixels.data[n+2]=255;pixels.data[n+3]=Math.round(weight*255);
    }
    mc.putImageData(pixels,0,0);
    mc.globalCompositeOperation='source-in';
    // Sample every biome at the destination world position, never the neighbor position.
    mc.drawImage(image,modulo(x,image.width||400),modulo(y,image.height||400),200,200,0,0,200,200);
    output.globalCompositeOperation='lighter';output.drawImage(mask,0,0);
   }
   if(this.layers.size>=96)this.layers.delete(this.layers.keys().next().value);
   this.layers.set(key,composed);
  }
  ctx.drawImage(composed,x,y);
  if(region.id==='forest'&&this.forestTrees){
   const d=forestDecoration(x,y);
   if(d)ctx.drawImage(this.forestTrees[d.variant],d.x-d.size/2,d.y-d.size/2,d.size,d.size);
  }

  return true;
 }
}
