// Presentation only. Fixed world lighting: never rotate/flip the body with facing.
// Parent keeps species marks, direction, attack/state effects and all gameplay rules.
const SPRITES={base:[130,106,502,509],growth:[834,105,502,510],apex:[1530,100,513,519]};
const sheets=new Map(),colors=new Map();let loading=null;
const CACHE_LIMIT=32,RESOLUTION=192;
export function characterRasterStatus(){return {ready:sheets.size===3,colorCache:colors.size,cacheLimit:CACHE_LIMIT};}
export function recolorCharacterPixels(data,hex){
 if(!/^#[0-9a-f]{6}$/i.test(hex))return null;
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const bins=new Uint32Array(256);let count=0;
 for(let i=0;i<data.length;i+=4)if(data[i+3]>220){bins[Math.round((data[i]+data[i+1]+data[i+2])/3)]++;count++;}
 let median=128,sum=0;for(let i=0;i<256;i++){sum+=bins[i];if(sum>=count/2){median=i;break;}}
 const result=new Uint8ClampedArray(data.length);
 for(let i=0;i<data.length;i+=4){
  const gray=(data[i]+data[i+1]+data[i+2])/3;
  // Only the broad matte shading is borrowed; species hue remains the live game hue.
  const factor=1+Math.max(-.12,Math.min(.08,(gray-median)/255*.55));
  for(let c=0;c<3;c++)result[i+c]=Math.round(rgb[c]*factor);
  result[i+3]=data[i+3];
 }return result;
}
export function loadCharacterRaster(){
 if(loading)return loading;
 if(typeof Image==='undefined'||typeof document==='undefined')return Promise.resolve(false);
 loading=(async()=>{try{
  const image=new Image();image.crossOrigin='anonymous';image.src=new URL('../assets/art-packs/characters-raster-v1/body-sheet-001.png',import.meta.url).href;await image.decode();
  for(const [stage,box]of Object.entries(SPRITES)){
   const c=document.createElement('canvas');c.width=c.height=RESOLUTION;
   const ctx=c.getContext('2d');ctx.drawImage(image,...box,0,0,RESOLUTION,RESOLUTION);
   sheets.set(stage,ctx.getImageData(0,0,RESOLUTION,RESOLUTION));
  }return true;
 }catch{sheets.clear();return false;}})();return loading;
}
function coloredBody(stage,hex){
 const key=stage+':'+hex;if(colors.has(key))return colors.get(key);
 const source=sheets.get(stage);if(!source)return null;
 const pixels=recolorCharacterPixels(source.data,hex);if(!pixels)return null;
 const c=document.createElement('canvas');c.width=c.height=RESOLUTION;const ctx=c.getContext('2d');
 const image=ctx.createImageData(RESOLUTION,RESOLUTION);image.data.set(pixels);ctx.putImageData(image,0,0);
 if(colors.size>=CACHE_LIMIT)colors.delete(colors.keys().next().value);colors.set(key,c);return c;
}
// Returns false until available or for unsupported hue; caller invokes existing vector fallback.
// stage must be supplied from existing parent state; this module invents no growth threshold.
export function drawCharacterRasterBody(ctx,e,r,zoom=1,flash=false,stage='base'){
 if(!(r>0)||!(zoom>0)||e.behavior==='orb')return false;
 loadCharacterRaster();const image=coloredBody(Object.hasOwn(SPRITES,stage)?stage:'base',flash?'#ffffff':e.colorHex);
 if(!image)return false;
 ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,r+1.5/zoom,0,Math.PI*2);ctx.fillStyle='rgba(5,18,22,.55)';ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.clip();ctx.drawImage(image,e.x-r,e.y-r,r*2,r*2);ctx.restore();
 if(e.attackState==='CHARGING'||e.beingAbsorbedByRef){ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.lineWidth=Math.min(2/zoom,Math.max(.8/zoom,r*.025));ctx.strokeStyle='#ffffff';ctx.stroke();}
 ctx.restore();return true;
}
