// Approved T3-r2: healthy landmarks persist; readiness only changes transferable leaves/petals.
// Geometry is presentation-only, in screen pixels. No gameplay state or randomness is read/write.
// World dimensions before per-object visualScale. Renderer uses local coordinates at 2x.
// Radius is exported for catalog/default tuning; callers still own actual gameplay config.
export const LANDMARK_PRESENTATION=Object.freeze({
 'grass-garland':{width:104,height:78,radius:65,tint:'#65794a',tintAlpha:.08},
 'grass-wind-stack':{width:90,height:112,radius:65,tint:'#727e6d',tintAlpha:.08},
 'forest-berry-grove':{width:132,height:92,radius:78,tint:'#365b44',tintAlpha:.10},
 'forest-tree':{width:186,height:160,radius:108,tint:'#315a42',tintAlpha:.06},
 'lake-garland':{width:112,height:76,radius:68,tint:'#417d83',tintAlpha:.06},
 'snow-flowers':{width:126,height:100,radius:76,tint:'#a7c5d0',tintAlpha:.04},
 'snow-shelter':{width:182,height:128,radius:112,tint:'#839da9',tintAlpha:.06},
 'desert-oasis':{width:228,height:154,radius:140,tint:'#827b56',tintAlpha:.07},
 'desert-obelisk':{width:96,height:136,radius:72,tint:'#a88d5c',tintAlpha:.08},
 'volcano-obsidian-stack':{width:128,height:116,radius:80,tint:'#66596f',tintAlpha:.08},
});
// Ignore near-transparent export halos; preserve every opaque part and its shadow.
export function alphaContentBounds(data,width,height,threshold=12){
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=threshold){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 return right<left?{x:0,y:0,width,height}:{x:left,y:top,width:right-left+1,height:bottom-top+1};
}
function cacheLandmarkImage(image,id,source){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
 if(source)ctx.drawImage(image,...source,0,0,256,256);else ctx.drawImage(image,0,0,256,256);
 const profile=LANDMARK_PRESENTATION[id];
 if(profile&&typeof ctx.getImageData==='function'){
  const b=alphaContentBounds(ctx.getImageData(0,0,256,256).data,256,256);
  const cropped=document.createElement('canvas');cropped.width=b.width;cropped.height=b.height;
  const out=cropped.getContext('2d');out.drawImage(c,b.x,b.y,b.width,b.height,0,0,b.width,b.height);
  out.globalCompositeOperation='source-atop';out.globalAlpha=profile.tintAlpha;out.fillStyle=profile.tint;out.fillRect(0,0,b.width,b.height);
  out.globalAlpha=1;out.globalCompositeOperation='source-over';return cropped;
 }return c;
}
function drawLandmarkBody(ctx,image,id){
 const p=LANDMARK_PRESENTATION[id];const width=(p?.width??140)/2,height=(p?.height??140)/2;
 ctx.drawImage(image,-width/2,-height/2,width,height);
}

const landmarkImages=new Map();
const batchIds=['grass-garland','grass-wind-stack','forest-berry-grove','lake-garland','desert-obelisk','volcano-obsidian-stack'];
let forestLoading=null;
export function loadLandmarkImages(){
 if(forestLoading)return forestLoading;
 if(typeof document==='undefined'||typeof Image==='undefined')return Promise.resolve(false);
 forestLoading=Promise.all([
  ...batchIds.map(id=>[id,`../assets/art-batches/scene-coherent-v1/${id}/asset.png`]),
  ['forest-tree','../assets/art-packs/forest-raster-v1/guardian-002-extracted.png'],
  ['snow-shelter','../assets/art-batches/scene-coherent-v1/snow-shelter/asset.png'],
  ['desert-oasis','../assets/art-batches/scene-coherent-v1/desert-oasis/asset.png'],
  ['snow-flowers','../assets/art-batches/scene-coherent-v1/snow-flowers/overhead-states-002.png'],
 ].map(async([id,url])=>{
  try{
   const image=new Image();image.crossOrigin='anonymous';image.src=new URL(url,import.meta.url).href;await image.decode();
   if(id==='snow-flowers'){
    // Generated sheet: matched healthy bases, collectible petals on the left only.
    for(const [state,index]of [['ready',0],['post',1]]){
     const c=cacheLandmarkImage(image,id,[index*image.naturalWidth/2,0,image.naturalWidth/2,image.naturalHeight]);
     landmarkImages.set(id+':'+state,c);
    }
   }else{
    const c=cacheLandmarkImage(image,id);landmarkImages.set(id,c);
   }return true;
  }catch{return false;}
 })).then(results=>results.every(Boolean));return forestLoading;
}
export function drawRevisedLandmark(ctx,o,ready=true){
 const id=o.candidate;
 if(![...batchIds,'forest-tree','snow-flowers','snow-shelter','desert-oasis'].includes(id))return false;
 loadLandmarkImages();
 const image=landmarkImages.get(id==='snow-flowers'?id+':'+(ready?'ready':'post'):id);
 // Continuous shelters keep the same healthy body; benefit effects are drawn separately.
 if(image&&id!=='forest-tree'){
  drawLandmarkBody(ctx,image,id);return true;
 }
 if(batchIds.includes(id))return false;
 const oval=(x,y,rx,ry,color)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 const path=(points,color)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 if(id==='forest-tree'){
  if(image)drawLandmarkBody(ctx,image,id);
  else{oval(0,18,27,7,'#102e29');path([[-8,17],[-5,-17],[5,-17],[9,17],[17,21],[3,19],[-16,21]],'#8c7152');
   oval(-13,-10,16,14,'#225c45');oval(12,-13,18,15,'#2e7051');oval(-1,-24,20,16,'#3b7e5b');}
  for(const [x,y]of [[-15,-12],[11,-16],[0,-26]]){
   const s=ready?1:.45;
   // Separate transferable leaves, matching the original concept's pointed pairs.
   for(const [side,color]of [[-1,'#c7f3bb'],[1,'#a7e8b3']]){
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+side*7*s,y-1*s,x+side*6*s,y-8*s);
    ctx.quadraticCurveTo(x+side*.5*s,y-7*s,x,y);ctx.fillStyle=ready?color:'#729b65';ctx.fill();
   }
  }
 }else if(id==='snow-flowers'){
  oval(0,17,25,6,'#384c66');
  for(const [x,y]of [[-15,4],[0,-8],[15,7]]){
   ctx.strokeStyle='#87aebc';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,15);ctx.lineTo(x,y);ctx.stroke();
   path([[x-5,y+3],[x,y-3],[x+5,y+3],[x,y+7]],'#739dab');
   if(ready){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;path([[x,y],[x+Math.cos(a-.4)*5,y+Math.sin(a-.4)*5],[x+Math.cos(a)*10,y+Math.sin(a)*10],[x+Math.cos(a+.4)*5,y+Math.sin(a+.4)*5]],'#c7e4ec');}oval(x,y,2.5,2.5,'#83c4db');}
   else{path([[x,y],[x-2,y-5],[x+2,y-3]],'#b2d6df');oval(x+5,16,3,1.5,'#a8c7d1');}
  }
 }else if(id==='snow-shelter'){
  oval(0,20,31,7,'#35495e');path([[-28,18],[-20,-7],[-8,-19],[10,-18],[23,-3],[29,19]],'#778a9c');
  path([[-20,-7],[-8,-19],[10,-18],[18,-8],[2,-5]],'#b4c8d5');
  path([[-13,19],[-11,2],[-3,-6],[6,-5],[13,4],[15,19]],'#2f4257');oval(1,16,12,3,'#81aab8');
 }else{
  oval(0,11,32,16,'#ab8b58');oval(0,9,26,12,'#286b75');oval(-2,7,19,7,'#55a3a8');
  ctx.strokeStyle='#96c8c4';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(-2,7,13,4,0,.2,2.9);ctx.stroke();
  path([[19,11],[17,-11],[21,-12],[23,10]],'#886a42');
  for(const [x,y]of [[3,-16],[17,-27],[33,-17]])path([[19,-11],[x,y],[x+3,y+7]],'#59834f');
 }
 return true;
}

