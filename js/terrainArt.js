// R-VIS-001: presentation-only SVG cache; no gameplay RNG, classification or physics.
import {DECALS,decalAt} from './decalCatalog.js';
export function terrainVariant(x,y){return ((Math.imul(Math.floor(x/400),73856093)^Math.imul(Math.floor(y/400),19349663))>>>0)%3;}
export function forestGroundVariant(x,y){return ((Math.imul(Math.floor(x/800),73856093)^Math.imul(Math.floor(y/800),19349663))>>>0)%3;}
const biomeKey=id=>id==='grassland'?'grass':id;
const modulo=(x,n)=>(x%n+n)%n;
// A continuous partition of unity: shared edges meet at 1/2, corners at 1/4.
// Performance (playtest 2026-10-08): the tile caches were first-in-first-out and barely larger than one
// screen of tiles, so walking rebuilt blends every frame (25 ms spikes). They are now least-recently-used,
// sized for about two screens, and blend masks are stored at half resolution (smooth gradients upscale cleanly).
export const LAYER_CACHE=192;const MASK_CACHE=128,MASK_SIZE=100;
export const SEAMED_GROUNDS=new Set(['snow']),SEAM_OVERLAP=120;
function cacheGet(cache,key){const v=cache.get(key);if(v!==undefined){cache.delete(key);cache.set(key,v);}return v;}
function cacheSet(cache,key,value,cap){if(cache.size>=cap)cache.delete(cache.keys().next().value);cache.set(key,value);}
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
 return {size,x:x+100+(((h>>>14)%101)/50-1)*margin,y:y+100+(((h>>>21)%101)/50-1)*margin,variant:(h>>>6)%3};
}
// Rendering cache only: crossfade overlapping edge samples without mirroring baked light.
export function periodicForestGround(image,size=800,overlap=60,tone='none'){
 const source=document.createElement('canvas');source.width=source.height=size+2*overlap;
 const sc=source.getContext('2d');sc.filter=tone;sc.drawImage(image,0,0,source.width,source.height);
 if(typeof sc.createLinearGradient!=='function'){source.width=source.height=size;sc.drawImage(image,0,0,size,size);return source;}
 function axis(input,horizontal){
  const out=document.createElement('canvas');out.width=horizontal?size:input.width;out.height=horizontal?input.height:size;
  const oc=out.getContext('2d');
  for(const mode of ['center','before','after']){
   const layer=document.createElement('canvas');layer.width=out.width;layer.height=out.height;const lc=layer.getContext('2d');
   const g=lc.createLinearGradient(0,0,horizontal?size:0,horizontal?0:size),a=overlap/size;
   const stops=mode==='center'?[[0,.5],[a,1],[1-a,1],[1,.5]]:mode==='before'?[[0,.5],[a,0],[1,0]]:[[0,0],[1-a,0],[1,.5]];
   for(const [p,alpha]of stops)g.addColorStop(p,`rgba(255,255,255,${alpha})`);
   lc.fillStyle=g;lc.fillRect(0,0,out.width,out.height);lc.globalCompositeOperation='source-in';
   const shift=mode==='center'?-overlap:mode==='before'?-(size+overlap):size-overlap;
   lc.drawImage(input,horizontal?shift:0,horizontal?0:shift);
   oc.globalCompositeOperation='lighter';oc.drawImage(layer,0,0);
  }return out;
 }
 return axis(axis(source,true),false);
}
// World-space density, continuous across chunk borders and the 8000-world wrap.
export function forestLayout(x,y){
 const tau=Math.PI*2,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 x=modulo(x,8000);y=modulo(y,8000);
 const center=1000+260*Math.sin(tau*x/8000);
 const distance=Math.abs(modulo(y-center+1000,2000)-1000);
 const path=smooth((distance-26)/54);
 // Small genuinely empty clearings sit inside a predominantly shrub-covered forest.
 let clearing=1,nearest=Infinity;
 const gx=Math.floor(x/1600),gy=Math.floor(y/2000);
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
  const ix=modulo(gx+i,5),iy=modulo(gy+j,4),h=(Math.imul(ix,73856093)^Math.imul(iy,19349663))>>>0;
  const cx=(gx+i)*1600+800+((h>>>8)%401-200),cy=(gy+j)*2000+1000+260*Math.sin(tau*modulo(cx,8000)/8000);
  const r=Math.hypot((x-cx)/180,(y-cy)/135);nearest=Math.min(nearest,r);clearing=Math.min(clearing,smooth((r-1)/.65));
 }
 const dense=.92+.08*Math.sin(tau*x/1600)*Math.cos(tau*y/2000);
 const density=path*clearing*dense;
 return {density,kind:nearest<=1?'clearing':distance<=26?'path':nearest<1.65||distance<120?'transition':'shrubs'};
}
export function forestDensity(x,y){return forestLayout(x,y).density;}
// Smooth deterministic variation prevents different tiles from making block seams.
export function forestVegetationWeights(x,y){
 const tau=Math.PI*2,a=tau*modulo(x,8000)/2000+.65*Math.sin(tau*modulo(y,8000)/1600);
 const weights=[0,1,2].map(i=>Math.pow(1+Math.cos(a+i*tau/3),10)),sum=weights.reduce((a,b)=>a+b,0);
 return weights.map(w=>w/sum);
}
export class TerrainArt {
 constructor(){this.enabled=true;this.ready=false;this.error=null;this.tiles=new Map();this.masks=new Map();this.layers=new Map();this.blendMasks=new Map();this.rasterBiomes=new Set();this.forestChunks=new Map();this.objectGrounds=new Map();
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
    const ground=new Image(),tree=new Image(),floor=new Image();floor.src=new URL('floor-002.png',pack).href;ground.src=new URL('ground-005.png',pack).href;tree.src=new URL('tree-003.png',pack).href;
    await Promise.all([ground.decode(),tree.decode(),floor.decode()]);
    this.forestFloor=periodicForestGround(floor);const cachedGround=periodicForestGround(ground);this.tiles.set('forest',[cachedGround,cachedGround,cachedGround]);this.forestRaster=true;
    this.forestTrees=await Promise.all([4,5,7].map(async n=>{
     let sprite=tree;try{const candidate=new Image();candidate.src=new URL(`tree-${String(n).padStart(3,'0')}.png`,pack).href;await candidate.decode();sprite=candidate;}catch(error){this.treePackError=String(error);}
     const tc=document.createElement('canvas');tc.width=tc.height=256;const ctx=tc.getContext('2d');
     // Correct only this cached sprite, never apply a per-frame world filter.
     ctx.filter='saturate(0.86) contrast(0.88) brightness(0.94) blur(0.35px)';
     const width=sprite.width||256,height=sprite.height||256,scale=256/Math.max(width,height);
     ctx.drawImage(sprite,(256-width*scale)/2,(256-height*scale)/2,width*scale,height*scale);return tc;
    }));
   }catch(error){this.imagePackError=String(error);}
   try{
    const pack=new URL('../assets/art-packs/forest-raster-v1/',import.meta.url),variants=await Promise.all([7,8,9].map(async n=>{
     let image=new Image();image.src=new URL(`canopy-${String(n).padStart(3,'0')}.png`,pack).href;
     try{await image.decode();}catch(error){this.canopyVariantError=String(error);image=new Image();image.src=new URL('canopy-001.png',pack).href;await image.decode();}
     return periodicForestGround(image,800,60,'saturate(0.90) contrast(0.90) brightness(0.96)');
    }));
    this.forestUnderstory=this.tiles.get('forest')?.[0];this.tiles.set('forest',variants);this.forestCanopy=true;
    try{const low=new Image();low.src=new URL('understory-003.png',pack).href;await low.decode();this.forestUnderstory=periodicForestGround(low,800,60,'saturate(0.90) contrast(0.90) brightness(0.96)');}catch(error){this.understoryPackError=String(error);}
    const edge=new Image();edge.src=new URL('edge-003.png',pack).href;await edge.decode();this.forestEdge=edge;
   }catch(error){this.canopyPackError=String(error);}
   // Decals come from js/decalCatalog.js (planning 데칼 마스터); each image may fail on its own.
   this.decalImages=new Map();await Promise.all(Object.entries(DECALS).filter(([,d])=>d.src).map(async([id,d])=>{try{const i=new Image();i.src=new URL('../assets/art-packs/'+d.src,import.meta.url).href;await i.decode();this.decalImages.set(id,i);}catch(error){this.decalPackError=String(error);}}));
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
     let c;
     // pt1-01: the snow image does not wrap (edge colour step ~65 vs ~10 for the other grounds), so its 800 px
     // repeat showed as grid seams. Crossfade its edges like the forest ground; the source art is unchanged.
     if(SEAMED_GROUNDS.has(id))c=periodicForestGround(ground,800,SEAM_OVERLAP);
     else{c=document.createElement('canvas');c.width=c.height=800;c.getContext('2d').drawImage(ground,0,0,800,800);}
     this.tiles.set(biomeKey(id),[c,c,c]);this.rasterBiomes.add(id);
    }catch(error){this.rasterPackErrors.set(id,String(error));if(id==='grassland')this.grassPackError=String(error);}
   }));
   this.ready=['grass','forest','lake','snow','volcano','desert'].every(id=>this.tiles.has(id));
  }catch(error){this.error=String(error);this.ready=false;this.tiles.clear();this.masks.clear();this.layers.clear();this.blendMasks.clear();}
 }
 variant(id,x,y){return (id==='forest'&&this.forestRaster)||this.rasterBiomes.has(id)?forestGroundVariant(x,y):terrainVariant(x,y);}
 texture(id,x,y){
 const dense=this.tiles.get(biomeKey(id))?.[this.variant(id,x,y)];
 if(id!=='forest'||!this.forestFloor)return dense;
 const bx=Math.floor(modulo(x,8000)/800)*800,by=Math.floor(modulo(y,8000)/800)*800,key=`${bx}:${by}`;
 const hit=cacheGet(this.forestChunks,key);if(hit)return hit;
 const c=document.createElement('canvas');c.width=c.height=800;const ctx=c.getContext('2d');ctx.drawImage(this.forestFloor,0,0);
 const mask=document.createElement('canvas');mask.width=mask.height=80;const mc=mask.getContext('2d'),pixels=mc.createImageData(80,80),variantWeights=this.forestCanopy?new Float32Array(80*80*3):null;
 for(let py=0;py<80;py++)for(let px=0;px<80;px++){
  const n=(py*80+px)*4,x=bx+(px+.5)*10,y=by+(py+.5)*10;
  pixels.data[n]=pixels.data[n+1]=pixels.data[n+2]=255;pixels.data[n+3]=Math.round(255*forestDensity(x,y));
  if(variantWeights)variantWeights.set(forestVegetationWeights(x,y),(py*80+px)*3);
 }
 if(this.forestUnderstory){
  const edgeMask=document.createElement('canvas');edgeMask.width=edgeMask.height=80;const em=edgeMask.getContext('2d'),ep=em.createImageData(80,80);
  for(let i=0;i<80*80;i++){const density=pixels.data[i*4+3]/255;ep.data[i*4]=ep.data[i*4+1]=ep.data[i*4+2]=255;ep.data[i*4+3]=Math.round(255*4*density*(1-density)*.7);}
  em.putImageData(ep,0,0);const under=document.createElement('canvas');under.width=under.height=800;const uc=under.getContext('2d');uc.drawImage(edgeMask,0,0,800,800);uc.globalCompositeOperation='source-in';uc.drawImage(this.forestUnderstory,0,0);ctx.drawImage(under,0,0);
 }
 const canopy=document.createElement('canvas');canopy.width=canopy.height=800;const cc=canopy.getContext('2d');
 const variants=this.forestCanopy?this.tiles.get('forest'):[dense];
 for(let v=0;v<variants.length;v++){
  const cm=document.createElement('canvas');cm.width=cm.height=80;const cmc=cm.getContext('2d'),cp=cmc.createImageData(80,80);
  for(let py=0;py<80;py++)for(let px=0;px<80;px++){
   const n=(py*80+px)*4,w=variants.length===1?1:variantWeights[(py*80+px)*3+v];
   cp.data[n]=cp.data[n+1]=cp.data[n+2]=255;cp.data[n+3]=Math.round(pixels.data[n+3]*w);
  }
  cmc.putImageData(cp,0,0);const foliage=document.createElement('canvas');foliage.width=foliage.height=800;const fc=foliage.getContext('2d');fc.drawImage(cm,0,0,800,800);fc.globalCompositeOperation='source-in';fc.drawImage(variants[v],0,0);cc.globalCompositeOperation='lighter';cc.drawImage(foliage,0,0);
 }
 ctx.drawImage(canopy,0,0);
 cacheSet(this.forestChunks,key,c,24);return c;
 }
 layer(id,x,y,direction){
  const texture=this.texture(id,x,y),mask=this.masks.get(direction);if(!texture||!mask)return null;
  // Cache the actual neighbor crop, including its 800-world raster phase.
  const tx=modulo(x,texture.width||400),ty=modulo(y,texture.height||400);
  const key=`${id}:${id==='forest'&&this.forestFloor?Math.floor(modulo(x,8000)/800)+','+Math.floor(modulo(y,8000)/800):''}:${this.variant(id,x,y)}:${tx}:${ty}:${direction}`;
  const hit=cacheGet(this.layers,key);if(hit)return hit;
  const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');
  // Meet at a shared 50/50 mixture instead of swapping both colors at the seam.
  ctx.globalAlpha=.5;ctx.drawImage(texture,tx,ty,200,200,0,0,200,200);ctx.globalAlpha=1;
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,200,200);
  cacheSet(this.layers,key,c,LAYER_CACHE);return c;
 }
 drawForestDetails(ctx,x,y){
  // Full canopy tiles already contain complete crowns. Old standalone trees are
  // fallback-only, avoiding a second, differently painted canopy on top.
  const d=forestDecoration(x,y);if(d&&!this.forestCanopy&&this.forestTrees&&[[-1,-1],[1,-1],[-1,1],[1,1]].every(([dx,dy])=>forestDensity(d.x+dx*d.size/2,d.y+dy*d.size/2)>.75))ctx.drawImage(this.forestTrees[d.variant],d.x-d.size/2,d.y-d.size/2,d.size,d.size);
  const edgeDensity=forestDensity(x+100,y+100);if(this.forestEdge&&edgeDensity>.35&&edgeDensity<.75){const e=this.forestEdge,s=110/Math.max(e.width,e.height),w=e.width*s,h=e.height*s;ctx.drawImage(e,x+100-w/2,y+100-h/2,w,h);}
  this.drawDecals(ctx,'forest',x,y);
 }
 drawDecals(ctx,region,x,y){
  const d=this.decalImages?.size?decalAt(region,x,y):null,image=d&&this.decalImages.get(d.id);if(image)ctx.drawImage(image,d.x-d.size/2,d.y-d.size/2,d.size,d.size);
 }
 // Quiet ground around functional vegetation separates it from passive canopy.
 // The feathered clearing is not a range indicator; callers draw the real radius.
 drawObjectGround(ctx,o){
  const footprint={'forest-berry-grove':[176,136],'forest-tree':[230,194]}[o.candidate];
  if(!this.enabled||this.objectGroundEnabled===false||!this.forestFloor||!footprint||typeof document==='undefined')return false;
  const scale=o.visualScale??1,w=Math.ceil(footprint[0]*scale*(o.aspect??1)),h=Math.ceil(footprint[1]*scale);
  const floor=this.forestFloor,sx=modulo(o.x-w/2,floor.width),sy=modulo(o.y-h/2,floor.height),key=`${o.candidate}:${w}:${h}:${sx}:${sy}`;
  let patch=this.objectGrounds.get(key);
  if(!patch){
   patch=document.createElement('canvas');patch.width=w;patch.height=h;const pc=patch.getContext('2d');
   for(const dx of [0,floor.width])for(const dy of [0,floor.height])pc.drawImage(floor,dx-sx,dy-sy);
   const mask=document.createElement('canvas');mask.width=w;mask.height=h;const mc=mask.getContext('2d');
   mc.translate(w/2,h/2);mc.scale(w/2,h/2);const g=mc.createRadialGradient(0,0,0,0,0,1);
   for(const [stop,alpha]of [[0,.97],[.55,.97],[.8,.65],[1,0]])g.addColorStop(stop,`rgba(255,255,255,${alpha})`);
   mc.fillStyle=g;mc.fillRect(-1,-1,2,2);pc.globalCompositeOperation='destination-in';pc.drawImage(mask,0,0);
   if(this.objectGrounds.size>=40)this.objectGrounds.delete(this.objectGrounds.keys().next().value);this.objectGrounds.set(key,patch);
  }
  ctx.drawImage(patch,o.x-w/2,o.y-h/2);return true;
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
   if(region.id==='forest')this.drawForestDetails(ctx,x,y);else this.drawDecals(ctx,region.id,x,y);
   return true;
  }
  const key='blend:'+ids.map(id=>{const t=this.texture(id,x,y);return `${id}:${id==='forest'&&this.forestFloor?Math.floor(modulo(x,8000)/800)+','+Math.floor(modulo(y,8000)/800):''}:${this.variant(id,x,y)}:${modulo(x,t?.width||400)}:${modulo(y,t?.height||400)}`;}).join(',');
  let composed=cacheGet(this.layers,key);
  if(!composed){
   composed=document.createElement('canvas');composed.width=composed.height=200;
   const output=composed.getContext('2d');
   const topology=ids.join(',');
   let masks=cacheGet(this.blendMasks,topology);
   if(!masks){
    masks=new Map();const weights=Array.from({length:MASK_SIZE},(_,p)=>terrainBlendWeights((p+.5)*200/MASK_SIZE));
    for(const id of new Set(ids)){
     const mask=document.createElement('canvas');mask.width=mask.height=MASK_SIZE;
     const mc=mask.getContext('2d'),pixels=mc.createImageData(MASK_SIZE,MASK_SIZE);
     for(let py=0;py<MASK_SIZE;py++)for(let px=0;px<MASK_SIZE;px++){
      const wx=weights[px],wy=weights[py];let weight=0;
      for(let j=0;j<3;j++)for(let i=0;i<3;i++)if(ids[j*3+i]===id)weight+=wx[i]*wy[j];
      const n=(py*MASK_SIZE+px)*4;pixels.data[n]=pixels.data[n+1]=pixels.data[n+2]=255;pixels.data[n+3]=Math.round(weight*255);
     }
     mc.putImageData(pixels,0,0);masks.set(id,mask);
    }
    cacheSet(this.blendMasks,topology,masks,MASK_CACHE);
   }
   for(const [id,alpha]of masks){
    const image=this.texture(id,x,y);if(!image)continue;
    const mask=document.createElement('canvas');mask.width=mask.height=200;
    const mc=mask.getContext('2d');mc.drawImage(alpha,0,0,200,200);
    mc.globalCompositeOperation='source-in';
    // Sample every biome at the destination world position, never the neighbor position.
    mc.drawImage(image,modulo(x,image.width||400),modulo(y,image.height||400),200,200,0,0,200,200);
    output.globalCompositeOperation='lighter';output.drawImage(mask,0,0);
   }
   cacheSet(this.layers,key,composed,LAYER_CACHE);
  }
  ctx.drawImage(composed,x,y);
  if(region.id==='forest')this.drawForestDetails(ctx,x,y);else this.drawDecals(ctx,region.id,x,y);

  return true;
 }
}
