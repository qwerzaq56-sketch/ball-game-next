// R-VIS-001: presentation-only SVG cache; no gameplay RNG, classification or physics.
export function terrainVariant(x,y){return ((Math.imul(Math.floor(x/400),73856093)^Math.imul(Math.floor(y/400),19349663))>>>0)%3;}
const biomeKey=id=>id==='grassland'?'grass':id;
const modulo=(x,n)=>(x%n+n)%n;
export class TerrainArt {
 constructor(){this.enabled=true;this.ready=false;this.error=null;this.tiles=new Map();this.masks=new Map();this.layers=new Map();
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
    const ground=new Image(),tree=new Image();ground.src=new URL('ground-001.png',pack).href;tree.src=new URL('tree-001.png',pack).href;
    await Promise.all([ground.decode(),tree.decode()]);
    const c=document.createElement('canvas');c.width=c.height=800;c.getContext('2d').drawImage(ground,0,0,800,800);
    this.tiles.set('forest',[c,c,c]);
    const tc=document.createElement('canvas');tc.width=tc.height=256;tc.getContext('2d').drawImage(tree,0,0,256,256);this.forestTree=tc;
   }catch(error){this.imagePackError=String(error);}
   this.ready=['grass','forest','lake','snow','volcano','desert'].every(id=>this.tiles.has(id));
  }catch(error){this.error=String(error);this.ready=false;this.tiles.clear();this.masks.clear();this.layers.clear();}
 }
 texture(id,x,y){return this.tiles.get(biomeKey(id))?.[terrainVariant(x,y)];}
 layer(id,x,y,sx,sy,direction){
  const key=`${id}:${terrainVariant(x,y)}:${sx}:${sy}:${direction}`;
  if(this.layers.has(key))return this.layers.get(key);
  const texture=this.texture(id,x,y),mask=this.masks.get(direction);if(!texture||!mask)return null;
  const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');
  // Meet at a shared 50/50 mixture instead of swapping both colors at the seam.
  ctx.globalAlpha=.5;ctx.drawImage(texture,modulo(x,texture.width||400),modulo(y,texture.height||400),200,200,0,0,200,200);ctx.globalAlpha=1;
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,200,200);
  if(this.layers.size>=96)this.layers.delete(this.layers.keys().next().value);
  this.layers.set(key,c);return c;
 }
 drawTile(ctx,tile,biomes){
  if(!this.enabled||!this.ready)return false;
  const {x,y,region}=tile,texture=this.texture(region.id,x,y);if(!texture)return false;
  const sx=modulo(x,texture.width||400),sy=modulo(y,texture.height||400);ctx.drawImage(texture,sx,sy,200,200,x,y,200,200);
  if(region.id==='forest'&&this.forestTree){
   const h=(Math.imul(x/200,83492791)^Math.imul(y/200,19349663))>>>0;
   if(h%5===0){const size=150+h%35;ctx.drawImage(this.forestTree,x+100-size/2,y+100-size/2,size,size);}
  }
  const neighbors=[['north',0,-200],['east',200,0],['south',0,200],['west',-200,0],['nw',-200,-200],['ne',200,-200],['se',200,200],['sw',-200,200]];
  const world=biomes.game.balance.world;
  for(const [direction,dx,dy]of neighbors){
   const nx=modulo(x+dx,world.worldWidth),ny=modulo(y+dy,world.worldHeight),n=biomes.regionAt({x:nx+100,y:ny+100});
   if(!n||n.id===region.id)continue;
   const layer=this.layer(n.id,nx,ny,sx,sy,direction);if(layer)ctx.drawImage(layer,x,y);
  }
  return true;
 }
}
