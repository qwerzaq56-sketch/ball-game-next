// Ability ornaments only: exact range, shape, targets and commands belong to parent.
// The registry separates harmful fields from non-damaging coordination textures.
const specs={
 'cyan-sweep':{file:'cyan-sweep-002.png',pivot:[0,.5],crop:[268, 178, 1116, 556],directional:true,meaning:'Existing chill/freeze cone or frost burst texture'},
 'cyan-shield':{file:'cyan-shield-002.png',pivot:[.5,.5],crop:[333, 101, 873, 715],alphaExponent:2.5,directional:false,meaning:'Actual frost-shield recipient ornament'},
 'blue-wave':{file:'blue-wave-002.png',pivot:[.5,.5],crop:[446, 14, 342, 1495],alphaExponent:2.5,directional:true,meaning:'Existing swept moving wave front'},
 'blue-vortex':{file:'blue-vortex-003.png',pivot:[.5,.5],crop:[232,229,793,779],directional:false,meaning:'Existing suction field, not direct damage'},
 'green-call':{file:'green-call-002.png',pivot:[.5,.5],crop:[100, 263, 1626, 338],directional:false,meaning:'Actual summon/invite/morale cast or successful recipient'},
 'red-embers':{file:'red-embers-002.png',pivot:[.5,.5],crop:[224, 92, 1236, 816],alphaExponent:1.8,directional:false,meaning:'Existing damaging ember field'},
 'red-muster':{file:'red-muster-002.png',pivot:[.5,.5],crop:[173, 67, 1221, 812],directional:false,meaning:'Existing non-damaging muster/rally or actual recipient'},
 'yellow-dust':{file:'yellow-dust-002.png',pivot:[.5,.5],crop:[3, 160, 1469, 771],directional:false,meaning:'Existing dust veil or sand field'},
};
const cache=new Map(),pending=new Map(),failed=new Set(),RESOLUTION=256;
// Display correction for a generated soft halo; raw PNG and RGB stay unchanged.
export function restrainAbilityAlpha(pixels,exponent=2.2){const corrected=new Uint8ClampedArray(pixels);for(let i=3;i<corrected.length;i+=4)corrected[i]=Math.round(255*Math.pow(corrected[i]/255,exponent));return corrected;}
export function abilityRasterStatus(){return {loaded:[...cache.keys()],failed:[...failed],pending:[...pending.keys()].filter(id=>!cache.has(id)&&!failed.has(id)),cacheLimit:Object.keys(specs).length};}
export function loadAbilityRaster(ids=Object.keys(specs)){
 if(typeof Image==='undefined'||typeof document==='undefined')return Promise.resolve(false);
 return Promise.all(ids.map(id=>{
  if(!Object.hasOwn(specs,id))return Promise.resolve(false);
  if(cache.has(id))return Promise.resolve(true);
  if(pending.has(id))return pending.get(id);
  const promise=(async()=>{try{
   const image=new Image();image.crossOrigin='anonymous';image.src=new URL('../assets/art-packs/abilities-raster-v1/'+specs[id].file,import.meta.url).href;await image.decode();
   const width=image.naturalWidth||RESOLUTION,height=image.naturalHeight||RESOLUTION,box=specs[id].crop??[0,0,width,height],scale=RESOLUTION/Math.max(box[2],box[3]);
   const c=document.createElement('canvas');c.width=Math.max(1,Math.round(box[2]*scale));c.height=Math.max(1,Math.round(box[3]*scale));const ctx=c.getContext('2d');ctx.drawImage(image,...box,0,0,c.width,c.height);
   if(specs[id].alphaExponent&&ctx.getImageData&&ctx.putImageData){const pixels=ctx.getImageData(0,0,c.width,c.height);pixels.data.set(restrainAbilityAlpha(pixels.data,specs[id].alphaExponent));ctx.putImageData(pixels,0,0);}
   cache.set(id,{image:c,pivot:[(width*specs[id].pivot[0]-box[0])/box[2],(height*specs[id].pivot[1]-box[1])/box[3]]});failed.delete(id);return true;
  }catch{failed.add(id);return false;}})();pending.set(id,promise);return promise;
 })).then(results=>results.every(Boolean));
}
// Caller supplies actual state and display dimensions. For a field/cone/wave,
// clip(ctx) should replay the parent's existing authoritative shape before this
// texture is drawn; the module invents no new circle/cone/rectangle or hit test.
export function drawAbilityRaster(ctx,id,{x,y,width,height,radius,alpha=.22,direction=0,clip}={}){
 if(!Object.hasOwn(specs,id))return false;
 width??=radius*2;
 if(![x,y,width,alpha].every(Number.isFinite)||width<=0||alpha<=0)return false;
 const cached=cache.get(id);if(!cached){loadAbilityRaster([id]);return false;}
 // Preserve artwork aspect unless the parent explicitly supplies both dimensions
 // to fit the authoritative moving wave front or field geometry.
 height??=width*cached.image.height/cached.image.width;if(!Number.isFinite(height)||height<=0)return false;
 ctx.save();
 if(typeof clip==='function'){ctx.beginPath();clip(ctx);ctx.clip();}
 ctx.globalAlpha*=Math.max(0,Math.min(1,alpha));ctx.translate(x,y);
 // These two self-emissive patterns have no directional environment shadows.
 if(specs[id].directional&&Number.isFinite(direction))ctx.rotate(direction);
 ctx.drawImage(cached.image,-width*cached.pivot[0],-height*cached.pivot[1],width,height);ctx.restore();return true;
}
