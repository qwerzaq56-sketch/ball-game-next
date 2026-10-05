// Environmental art is independent of benefit landmarks. Raster light never rotates;
// only the unlit current surface follows its actual movement corridor.
const images=new Map();let loading=null;
const sources=[
 ['lake-current','lake-current/asset.png'],
 ['lake-vortex','lake-vortex/asset.png'],
 ['volcano-vent-cycle','volcano-vent-cycle/asset.png'],
 ['volcano-vent-cycle:rest','volcano-vent-cycle/rest-002.png'],
];
function prepareImage(image,trim=true){
 const scratch=document.createElement('canvas');scratch.width=image.naturalWidth||256;scratch.height=image.naturalHeight||256;
 const ctx=scratch.getContext('2d');ctx.drawImage(image,0,0);
 let left=0,top=0,right=scratch.width,bottom=scratch.height;
 if(trim&&ctx.getImageData){
  const data=ctx.getImageData(0,0,scratch.width,scratch.height).data;
  let l=scratch.width,t=scratch.height,r=-1,b=-1;
  for(let y=0;y<scratch.height;y++)for(let x=0;x<scratch.width;x++)if(data[(y*scratch.width+x)*4+3]>16){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  if(r>=l&&b>=t){left=Math.max(0,l-3);top=Math.max(0,t-3);right=Math.min(scratch.width,r+4);bottom=Math.min(scratch.height,b+4);}
 }
 const w=right-left,h=bottom-top,scale=Math.min(1,512/Math.max(w,h));
 const cached=document.createElement('canvas');cached.width=Math.max(1,Math.round(w*scale));cached.height=Math.max(1,Math.round(h*scale));
 const target=cached.getContext('2d');target.filter='saturate(.78)';target.drawImage(scratch,left,top,w,h,0,0,cached.width,cached.height);
 return cached;
}
export function loadEnvironmentImages(){
 if(loading)return loading;
 if(typeof document==='undefined'||typeof Image==='undefined')return Promise.resolve(false);
 loading=Promise.all(sources.map(async([id,url])=>{try{const image=new Image();image.src=new URL('../assets/art-batches/scene-coherent-v1/'+url,import.meta.url).href;await image.decode();images.set(id,prepareImage(image,!id.startsWith('volcano-vent-cycle')));return true;}catch{return false;}})).then(results=>results.every(Boolean));return loading;
}
export function drawEnvironmentalArt(ctx,o,{a,b,active=true}={}){
 if(!sources.some(([id])=>id===o.candidate))return false;
 loadEnvironmentImages();const image=images.get(o.candidate==='volcano-vent-cycle'&&!active?o.candidate+':rest':o.candidate);
 if(!image)return false;
 ctx.save();
 if(o.candidate==='lake-current'&&a&&b){
  const length=Math.hypot(b.x-a.x,b.y-a.y);if(!length){ctx.restore();return false;}
  ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));
  // Clip to the straight physical corridor: decorative wave fragments never
  // imply a second disconnected movement area. No bright per-segment arrows.
  ctx.beginPath();ctx.rect(-length/2,-o.width/2,length,o.width);ctx.clip();
  ctx.globalAlpha*=.62;ctx.drawImage(image,-length/2-8,-o.width/2,length+16,o.width);
 }else if(o.candidate==='lake-vortex'){
  const r=o.config.radius;ctx.globalAlpha*=.72;ctx.drawImage(image,o.x-r,o.y-r,r*2,r*2);
 }else if(o.candidate==='volcano-vent-cycle'){
  // The quiet state has no flame silhouette. Both states keep fixed lighting.
  const r=Math.min(o.config.radius,70*(o.visualScale??1)),aspect=image.height/image.width;ctx.drawImage(image,o.x-r,o.y-r*aspect,r*2,r*2*aspect);
 }else{ctx.restore();return false;}
 ctx.restore();return true;
}

