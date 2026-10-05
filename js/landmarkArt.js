// Approved T3-r2: healthy landmarks persist; readiness only changes transferable leaves/petals.
// Geometry is presentation-only, in screen pixels. No gameplay state or randomness is read/write.
export function drawRevisedLandmark(ctx,o,ready=true){
 const id=o.candidate;
 if(!['forest-tree','snow-flowers','snow-shelter','desert-oasis'].includes(id))return false;
 const oval=(x,y,rx,ry,color)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 const path=(points,color)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 if(id==='forest-tree'){
  oval(0,18,27,7,'#102e29');path([[-8,17],[-5,-17],[5,-17],[9,17],[17,21],[3,19],[-16,21]],'#8c7152');
  oval(-13,-10,16,14,'#225c45');oval(12,-13,18,15,'#2e7051');oval(-1,-24,20,16,'#3b7e5b');
  for(const [x,y]of [[-15,-12],[11,-16],[0,-29]])oval(x,y,ready?5:2.5,ready?2.8:1.8,ready?'#badf91':'#729b65');
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
