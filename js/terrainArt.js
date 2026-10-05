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
export class TerrainArt {
 constructor(){this.enabled=true;this.ready=false;this.error=null;this.tiles=new Map();this.masks=new Map();this.layers=new Map();this.blendMasks=new Map();this.rasterBiomes=new Set();this.forestChunks=new Map();
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
    const canopy=new Image();canopy.src=new URL('../assets/art-packs/forest-raster-v1/canopy-001.png',import.meta.url).href;await canopy.decode();
    this.forestUnderstory=this.tiles.get('forest')?.[0];const cached=periodicForestGround(canopy,800,60,'saturate(0.90) contrast(0.90) brightness(0.96)');
    this.tiles.set('forest',[cached,cached,cached]);this.forestCanopy=true;
    const edge=new Image();edge.src=new URL('../assets/art-packs/forest-raster-v1/edge-001.png',import.meta.url).href;await edge.decode();this.forestEdge=edge;
   }catch(error){this.canopyPackError=String(error);}
   try{this.forestDecals=await Promise.all([1,2,3].map(async n=>{const i=new Image();i.src=new URL(`../assets/art-packs/forest-raster-v1/decal-${String(n).padStart(3,'0')}.svg`,import.meta.url).href;await i.decode();return i;}));}catch(error){this.decalPackError=String(error);}
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
  }catch(error){this.error=String(error);this.ready=false;this.tiles.clear();this.masks.clear();this.layers.clear();this.blendMasks.clear();}
 }
 variant(id,x,y){return (id==='forest'&&this.forestRaster)||this.rasterBiomes.has(id)?forestGroundVariant(x,y):terrainVariant(x,y);}
 texture(id,x,y){
 const dense=this.tiles.get(biomeKey(id))?.[this.variant(id,x,y)];
 if(id!=='forest'||!this.forestFloor)return dense;
 const bx=Math.floor(modulo(x,8000)/800)*800,by=Math.floor(modulo(y,8000)/800)*800,key=`${bx}:${by}`;
 if(this.forestChunks.has(key))return this.forestChunks.get(key);
 const c=document.createElement('canvas');c.width=c.height=800;const ctx=c.getContext('2d');ctx.drawImage(this.forestFloor,0,0);
 const mask=document.createElement('canvas');mask.width=mask.height=80;const mc=mask.getContext('2d'),pixels=mc.createImageData(80,80);
 for(let py=0;py<80;py++)for(let px=0;px<80;px++){const n=(py*80+px)*4;pixels.data[n]=pixels.data[n+1]=pixels.data[n+2]=255;pixels.data[n+3]=Math.round(255*forestDensity(bx+(px+.5)*10,by+(py+.5)*10));}
 if(this.forestUnderstory){
  const edgeMask=document.createElement('canvas');edgeMask.width=edgeMask.height=80;const em=edgeMask.getContext('2d'),ep=em.createImageData(80,80);
  for(let i=0;i<80*80;i++){const density=pixels.data[i*4+3]/255;ep.data[i*4]=ep.data[i*4+1]=ep.data[i*4+2]=255;ep.data[i*4+3]=Math.round(255*4*density*(1-density)*.7);}
  em.putImageData(ep,0,0);const under=document.createElement('canvas');under.width=under.height=800;const uc=under.getContext('2d');uc.drawImage(edgeMask,0,0,800,800);uc.globalCompositeOperation='source-in';uc.drawImage(this.forestUnderstory,0,0);ctx.drawImage(under,0,0);
 }
 mc.putImageData(pixels,0,0);const foliage=document.createElement('canvas');foliage.width=foliage.height=800;const fc=foliage.getContext('2d');fc.drawImage(mask,0,0,800,800);fc.globalCompositeOperation='source-in';fc.drawImage(dense,0,0);ctx.drawImage(foliage,0,0);
 if(this.forestChunks.size>=12)this.forestChunks.delete(this.forestChunks.keys().next().value);this.forestChunks.set(key,c);return c;
 }
 layer(id,x,y,direction){
  const texture=this.texture(id,x,y),mask=this.masks.get(direction);if(!texture||!mask)return null;
  // Cache the actual neighbor crop, including its 800-world raster phase.
  const tx=modulo(x,texture.width||400),ty=modulo(y,texture.height||400);
  const key=`${id}:${id==='forest'&&this.forestFloor?Math.floor(modulo(x,8000)/800)+','+Math.floor(modulo(y,8000)/800):''}:${this.variant(id,x,y)}:${tx}:${ty}:${direction}`;
  if(this.layers.has(key))return this.layers.get(key);
  const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');
  // Meet at a shared 50/50 mixture instead of swapping both colors at the seam.
  ctx.globalAlpha=.5;ctx.drawImage(texture,tx,ty,200,200,0,0,200,200);ctx.globalAlpha=1;
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,200,200);
  if(this.layers.size>=96)this.layers.delete(this.layers.keys().next().value);
  this.layers.set(key,c);return c;
 }
 drawForestDetails(ctx,x,y){
  const d=forestDecoration(x,y);if(d&&this.forestTrees&&[[-1,-1],[1,-1],[-1,1],[1,1]].every(([dx,dy])=>forestDensity(d.x+dx*d.size/2,d.y+dy*d.size/2)>.75))ctx.drawImage(this.forestTrees[d.variant],d.x-d.size/2,d.y-d.size/2,d.size,d.size);
  const edgeDensity=forestDensity(x+100,y+100);if(this.forestEdge&&edgeDensity>.35&&edgeDensity<.75)ctx.drawImage(this.forestEdge,x+45,y+45,110,110);
  const h=(Math.imul(x/200,73856093)^Math.imul(y/200,19349663))>>>0;
  if(this.forestDecals&&h%3===0){const px=x+35+(h>>>8)%130,py=y+35+(h>>>16)%130,size=18+(h>>>24)%12;ctx.drawImage(this.forestDecals[(h>>>5)%3],px-size/2,py-size/2,size,size);}
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
   if(region.id==='forest')this.drawForestDetails(ctx,x,y);
   return true;
  }
  const key='blend:'+ids.map(id=>{const t=this.texture(id,x,y);return `${id}:${id==='forest'&&this.forestFloor?Math.floor(modulo(x,8000)/800)+','+Math.floor(modulo(y,8000)/800):''}:${this.variant(id,x,y)}:${modulo(x,t?.width||400)}:${modulo(y,t?.height||400)}`;}).join(',');
  let composed=this.layers.get(key);
  if(!composed){
   composed=document.createElement('canvas');composed.width=composed.height=200;
   const output=composed.getContext('2d');
   const topology=ids.join(',');
   let masks=this.blendMasks.get(topology);
   if(!masks){
    masks=new Map();const weights=Array.from({length:200},(_,p)=>terrainBlendWeights(p+.5));
    for(const id of new Set(ids)){
     const mask=document.createElement('canvas');mask.width=mask.height=200;
     const mc=mask.getContext('2d'),pixels=mc.createImageData(200,200);
     for(let py=0;py<200;py++)for(let px=0;px<200;px++){
      const wx=weights[px],wy=weights[py];let weight=0;
      for(let j=0;j<3;j++)for(let i=0;i<3;i++)if(ids[j*3+i]===id)weight+=wx[i]*wy[j];
      const n=(py*200+px)*4;pixels.data[n]=pixels.data[n+1]=pixels.data[n+2]=255;pixels.data[n+3]=Math.round(weight*255);
     }
     mc.putImageData(pixels,0,0);masks.set(id,mask);
    }
    if(this.blendMasks.size>=32)this.blendMasks.delete(this.blendMasks.keys().next().value);
    this.blendMasks.set(topology,masks);
   }
   for(const [id,alpha]of masks){
    const image=this.texture(id,x,y);if(!image)continue;
    const mask=document.createElement('canvas');mask.width=mask.height=200;
    const mc=mask.getContext('2d');mc.drawImage(alpha,0,0);
    mc.globalCompositeOperation='source-in';
    // Sample every biome at the destination world position, never the neighbor position.
    mc.drawImage(image,modulo(x,image.width||400),modulo(y,image.height||400),200,200,0,0,200,200);
    output.globalCompositeOperation='lighter';output.drawImage(mask,0,0);
   }
   if(this.layers.size>=96)this.layers.delete(this.layers.keys().next().value);
   this.layers.set(key,composed);
  }
  ctx.drawImage(composed,x,y);
  if(region.id==='forest')this.drawForestDetails(ctx,x,y);

  return true;
 }
}
