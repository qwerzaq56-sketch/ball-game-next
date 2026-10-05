import {delta} from './topology.js';
// Decorative only. Parent retains actual progress arcs and absorption direction cues.
const sprites=new Map(),cache=new Map();let loading=null;
const BOXES={growth:[82,83,724,719],absorption:[1034,392,631,143]};
export function loadProgressionRaster(){
 if(loading)return loading;if(typeof Image==='undefined'||typeof document==='undefined')return Promise.resolve(false);
 loading=(async()=>{try{
  const image=new Image();image.crossOrigin='anonymous';image.src=new URL('../assets/art-packs/progression-raster-v1/progression-sheet-002.png',import.meta.url).href;await image.decode();
  for(const [name,b]of Object.entries(BOXES)){const c=document.createElement('canvas');c.width=name==='growth'?256:512;c.height=name==='growth'?256:116;c.getContext('2d').drawImage(image,...b,0,0,c.width,c.height);sprites.set(name,c);}return true;
 }catch{sprites.clear();return false;}})();return loading;
}
function tinted(name,color){
 const source=sprites.get(name);if(!source)return null;const key=name+':'+color;if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);
 if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(key,c);return c;
}
export function growthTextureGeometry(e,zoom){
 if(e.behavior==='orb'||!(e.scalePulseTimer>0)||!(zoom>0))return null;
 const t=Math.min(1,e.scalePulseTimer/.3),radius=e.size/2+(1-t)*22/zoom;
 return {radius,alpha:t*.32};
}
export function drawGrowthRasterTexture(ctx,e,zoom){
 const g=growthTextureGeometry(e,zoom);if(!g)return false;loadProgressionRaster();const image=tinted('growth',e.colorHex??'#86efac');if(!image)return false;
 ctx.save();ctx.globalAlpha*=g.alpha;ctx.drawImage(image,e.x-g.radius,e.y-g.radius,g.radius*2,g.radius*2);ctx.restore();return true;
}
export function absorptionTextureGeometry(target,eater,progress,zoom,world){
 if(!eater||target.beingAbsorbedByRef!==eater||!(progress>0)||!(zoom>0))return null;
 const {x:dx,y:dy}=delta(target,eater,world),length=Math.hypot(dx,dy);if(length<1)return null;
 return {angle:Math.atan2(dy,dx),length,width:Math.min(6/zoom,length*.12),alpha:.08+.06*Math.min(1,progress)};
}
// This optional texture is deliberately subdued; never call without the existing state.
export function drawAbsorptionRasterTexture(ctx,target,eater,progress,zoom,color='#fca5a5',world){
 const g=absorptionTextureGeometry(target,eater,progress,zoom,world);if(!g)return false;loadProgressionRaster();const image=tinted('absorption',color);if(!image)return false;
 ctx.save();ctx.translate(target.x,target.y);ctx.rotate(g.angle);ctx.globalAlpha*=g.alpha;ctx.drawImage(image,0,-g.width/2,g.length,g.width);ctx.restore();return true;
}
