// Presentation only: exact body radius remains size / 2; no gameplay RNG is consumed.
export function drawSpeciesMark(ctx,e,zoom){
 if(e.behavior==='orb'||e.size*zoom<12)return;
 const r=Math.min(e.size*.24,12/zoom);ctx.save();ctx.translate(e.x,e.y);ctx.strokeStyle='rgba(255,255,255,.65)';ctx.fillStyle='rgba(255,255,255,.65)';ctx.lineWidth=Math.max(1/zoom,r*.13);ctx.lineCap='round';
 ctx.beginPath();
 if(e.color==='cyan'){for(let i=0;i<3;i++){const angle=i*Math.PI/3;ctx.moveTo(-Math.cos(angle)*r,-Math.sin(angle)*r);ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}}
 else if(e.color==='blue'){for(let i=-1;i<=1;i++){ctx.moveTo(-r,i*r*.6);ctx.quadraticCurveTo(-r*.3,i*r*.6-r*.35,0,i*r*.6);ctx.quadraticCurveTo(r*.3,i*r*.6+r*.35,r,i*r*.6);}}
 else if(e.color==='green'){ctx.moveTo(-r,r);ctx.quadraticCurveTo(-r,-r,r,-r);ctx.quadraticCurveTo(r,r,-r,r);ctx.moveTo(-r*.5,r*.5);ctx.lineTo(r*.5,-r*.5);}
 else if(e.color==='red'){ctx.moveTo(-r,r*.5);ctx.lineTo(0,-r*.6);ctx.lineTo(r,r*.5);ctx.moveTo(-r*.65,r);ctx.lineTo(0,r*.25);ctx.lineTo(r*.65,r);}
 else if(e.color==='yellow'){ctx.arc(0,0,r*.35,0,Math.PI*2);for(let i=0;i<4;i++){const angle=i*Math.PI/2;ctx.moveTo(Math.cos(angle)*r*.6,Math.sin(angle)*r*.6);ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}}
 ctx.stroke();ctx.restore();
}
export function drawGrowthPulse(ctx,e,zoom){
 if(!(e.scalePulseTimer>0)||e.behavior==='orb')return;
 const t=Math.min(1,e.scalePulseTimer/.3);ctx.save();ctx.beginPath();ctx.arc(e.x,e.y,e.size/2+(1-t)*22/zoom,0,Math.PI*2);ctx.strokeStyle=`rgba(134,239,172,${t*.7})`;ctx.lineWidth=2/zoom;ctx.stroke();ctx.restore();
}
export function drawPlayerDirection(ctx,e,zoom){
 if(e.behavior!=='player')return;
 const r=e.size/2+6/zoom,angle=e.facing;ctx.save();ctx.translate(e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(5/zoom,0);ctx.lineTo(-2/zoom,-3/zoom);ctx.lineTo(-2/zoom,3/zoom);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.restore();
}
