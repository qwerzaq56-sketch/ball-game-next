// Optional texture ornaments only. Existing vector geometry remains authoritative.
// No entity writes, timers, combat math, radius decisions or gameplay RNG here.
const definitions={
 charge:{pack:'combat-raster-v2',file:'charge-001.png',pivot:[.5,.4985],crop:[318,294,660,660],rotate:false},
 impact:{pack:'combat-raster-v2',file:'impact-001.png',pivot:[696/1254,614/1254],crop:[516,434,360,360],rotate:false},
 dodge:{pack:'combat-raster-v2',file:'dodge-002.png',pivot:[.75,.5],crop:[500,385,750,255],rotate:true},
 shield:{pack:'benefits-raster-v2',file:'leaf-shield-002.png',pivot:[.4,.65],crop:[250,210,840,620],footprintScale:.8,rotate:false},
 strength:{pack:'benefits-raster-v2',file:'empowerment-002.png',pivot:[.495,.53],crop:[550,350,300,420],footprintScale:1,rotate:false},
 'frost-clear':{pack:'benefits-raster-v2',file:'frost-clear-001.png',pivot:[.5,.7],crop:[380,250,540,650],footprintScale:1.1,rotate:false},
 heal:{pack:'benefits-raster-v2',file:'heal-001.png',pivot:[.49,.62],crop:[170,710,930,400],footprintScale:1.25,rotate:false},
};
const images=new Map(),pending=new Map(),failed=new Set();
const CACHE_SIZE=256;
// Display-only tone curve. Raw generated PNGs and RGB colors are preserved.
// It reduces wide faint glow while retaining the original opaque fine shapes.
export function restrainEffectAlpha(pixels){
 const result=new Uint8ClampedArray(pixels);
 for(let i=3;i<result.length;i+=4)result[i]=Math.round(255*Math.pow(result[i]/255,1.8));
 return result;
}
export function effectRasterStatus(){return {loaded:[...images.keys()],failed:[...failed],requested:[...pending.keys()].filter(id=>!images.has(id)&&!failed.has(id)),cacheLimit:Object.keys(definitions).length};}
export function loadEffectRaster(ids=Object.keys(definitions)){
 if(typeof document==='undefined'||typeof Image==='undefined')return Promise.resolve(false);
 return Promise.all(ids.map(id=>{
  if(!Object.hasOwn(definitions,id))return Promise.resolve(false);
  if(images.has(id))return Promise.resolve(true);
  if(pending.has(id))return pending.get(id);
  const promise=(async()=>{try{
   const image=new Image();image.crossOrigin='anonymous';image.src=new URL('../assets/art-packs/'+(definitions[id].pack??'effects-raster-v1')+'/'+definitions[id].file,import.meta.url).href;await image.decode();
   // Trim export padding at cache creation only, preserving original actor pivot.
   const spec=definitions[id],nw=image.naturalWidth||CACHE_SIZE,nh=image.naturalHeight||CACHE_SIZE;
   const box=spec.crop??[0,0,nw,nh],scale=CACHE_SIZE/Math.max(box[2],box[3]),c=document.createElement('canvas');c.width=Math.max(1,Math.round(box[2]*scale));c.height=Math.max(1,Math.round(box[3]*scale));
   const pivot=[(nw*spec.pivot[0]-box[0])/box[2],(nh*spec.pivot[1]-box[1])/box[3]];
   const ctx=c.getContext('2d');ctx.drawImage(image,...box,0,0,c.width,c.height);
   if(definitions[id].restrainBloom&&ctx.getImageData&&ctx.putImageData){const pixels=ctx.getImageData(0,0,c.width,c.height);pixels.data.set(restrainEffectAlpha(pixels.data));ctx.putImageData(pixels,0,0);}
   images.set(id,{canvas:c,pivot});failed.delete(id);return true;
  }catch{failed.add(id);return false;}})();pending.set(id,promise);return promise;
 })).then(results=>results.every(Boolean));
}
// radius is a visual footprint supplied by the parent, never an effect range.
// Only the deliberately unlit directional dodge texture may rotate.
export function drawEffectRaster(ctx,id,{x,y,radius,alpha=.45,direction=0}={}){
 if(!Object.hasOwn(definitions,id)||![x,y,radius,alpha].every(Number.isFinite)||radius<=0||alpha<=0)return false;
 const cached=images.get(id);if(!cached){loadEffectRaster([id]);return false;}
 const image=cached.canvas,spec=definitions[id],width=radius*2*(spec.footprintScale??1),height=width*image.height/image.width;
 ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,alpha));ctx.translate(x,y);
 if(spec.rotate&&Number.isFinite(direction))ctx.rotate(direction);
 ctx.drawImage(image,-width*cached.pivot[0],-height*cached.pivot[1],width,height);ctx.restore();return true;
}
// Read-only convenience integration. Explicit recovery flags must come from
// actual successful healing/cure, not an object proximity or same-color guess.
export function drawEntityEffectRaster(ctx,e,game,r,zoom=1,{healing=false,frostCured=false,charge=true,impact=false,dodge=true,status=true,shield=true}={}){
 if(!e.alive||e.behavior==='orb'||!(r>0)||!(zoom>0))return [];
 const now=game.gameTime??0,painted=[];
 const paint=(id,radius,alpha,direction=0)=>{if(drawEffectRaster(ctx,id,{x:e.x,y:e.y,radius,alpha,direction}))painted.push(id);};
 if(charge&&e.attackUnlocked&&(e.attackHoldProgress??0)>0){const q=Math.min(1,Math.max(0,e.attackHoldProgress));paint('charge',r+14/zoom,.12+.3*q);}
 if(impact&&(e.hitVisualUntil??0)>now)paint('impact',Math.max(8/zoom,r*.7),Math.min(.65,(e.hitVisualUntil-now)/.18*.65));
 if(dodge&&e.dodgeState==='DODGING')paint('dodge',r+10/zoom,.35,e.dodgeDir??e.facing??0);
 if(status){
  if(shield&&((e.shieldHp??0)>0&&(e.shieldRemaining??0)>0||(e.obsidianShieldHp??0)>0&&(e.obsidianShieldUntil??0)>now))paint('shield',r+10/zoom,.36);
  const power=game.abilities?.rallyPower?.(e,'buffDamage',0)??0;
  if((e.vigorUntil??0)>now||power>0)paint('strength',r+12/zoom,.35);
  if(healing)paint('heal',r+12/zoom,.4);
  if(frostCured)paint('frost-clear',r+12/zoom,.4);
 }
 return painted;
}
