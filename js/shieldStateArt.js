// Required shield state rim remains visible independently of image loading.
// Parent decides whether rich artwork is enabled; no game state is changed.
export function drawShieldState(ctx,e,r,zoom=1,{rich=false}={}){
 if(!((e.shieldHp??0)>0))return false;
 ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,r+7/zoom,0,Math.PI*2);
 ctx.strokeStyle=rich?'rgba(165,243,252,.65)':'#a5f3fc';
 ctx.lineWidth=(rich?1.5:3)/zoom;ctx.stroke();ctx.restore();
 return true;
}
export const drawShieldStateArt=drawShieldState;
