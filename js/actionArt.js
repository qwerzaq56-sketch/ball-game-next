import {drawRevisedLandmark} from './landmarkArt.js?art-boundary-01';
// R-VIS-005: restrained vector art, no canvas blur or gameplay RNG.
export function drawActionArt(ctx,e,game,r,zoom){
 if(e.behavior==='orb')return;
 ctx.save();const now=game.gameTime;
 if(e.sprinting){const a=e.sprintDirection??e.facing??0;ctx.strokeStyle='#e0f2fe';ctx.lineWidth=2/zoom;ctx.globalAlpha=.7;for(const side of [-1,1]){const px=e.x-Math.cos(a)*r*.9+Math.cos(a+Math.PI/2)*r*.7*side,py=e.y-Math.sin(a)*r*.9+Math.sin(a+Math.PI/2)*r*.7*side;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-Math.cos(a)*(24+(now*30%12))/zoom,py-Math.sin(a)*(24+(now*30%12))/zoom);ctx.stroke();}ctx.globalAlpha=1;}
 if(e.absorptionRefund){ctx.strokeStyle='#86efac';ctx.lineWidth=3/zoom;ctx.beginPath();ctx.arc(e.x,e.y,r+19/zoom,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,e.absorptionProgress/Math.max(.001,e.absorptionRequired)));ctx.stroke();}
 const buff=(e.shieldRemaining??0)>0||(e.inviteBuffs??[]).some(b=>b.expires>now)||(e.vigorUntil??0)>now||game.abilities.rallyPower(e,'buffDamage',0)>0||(e.morale?.size??0)>0;
 if(buff){const x=e.x+26/zoom,y=e.y-r-26/zoom;ctx.fillStyle='#111827';ctx.strokeStyle='#a7f3d0';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.moveTo(x,y-9/zoom);ctx.lineTo(x+8/zoom,y-5/zoom);ctx.lineTo(x+6/zoom,y+5/zoom);ctx.lineTo(x,y+10/zoom);ctx.lineTo(x-6/zoom,y+5/zoom);ctx.lineTo(x-8/zoom,y-5/zoom);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-3/zoom,y);ctx.lineTo(x,y-3/zoom);ctx.lineTo(x+3/zoom,y);ctx.stroke();}
 if((e.frostExposure??0)>0){const fraction=Math.min(1,e.frostExposure/(game.balance.biomes.frostExposureSeconds??6)),y=e.y+r+26/zoom;ctx.lineWidth=4/zoom;ctx.strokeStyle='#334155';ctx.beginPath();ctx.moveTo(e.x-24/zoom,y);ctx.lineTo(e.x+24/zoom,y);ctx.stroke();ctx.strokeStyle=e.frostbiteRemaining>0?'#e0f2fe':'#38bdf8';ctx.beginPath();ctx.moveTo(e.x-24/zoom,y);ctx.lineTo(e.x+(-24+48*fraction)/zoom,y);ctx.stroke();}
 ctx.restore();
}
// R-VIS-005: landmark silhouettes distinguish resources without heavy animated filters.
export function drawObjectArt(ctx,o,zoom,ready=true){
 const c=o.config;ctx.save();ctx.translate(o.x,o.y);ctx.scale((o.visualScale??1)*2,(o.visualScale??1)*2);ctx.lineWidth=1.5;
 if(drawRevisedLandmark(ctx,o,ready)){ctx.restore();return;}
 const disc=(x,y,r,color)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 if(c.effect==='charm'&&o.candidate.includes('lake')){ctx.fillStyle='#fef3c7';ctx.strokeStyle='#f59e0b';ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(-17,-1);ctx.lineTo(-13,-12);ctx.lineTo(0,-17);ctx.lineTo(13,-12);ctx.lineTo(17,-1);ctx.closePath();ctx.fill();ctx.stroke();for(const x of [-9,0,9]){ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(x,-12);ctx.stroke();}disc(0,0,4,'#fff');}
 else if(c.effect==='charm'){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;disc(Math.cos(a)*10,Math.sin(a)*10,6,'#f9a8d4');}disc(0,0,5,'#fef08a');}
 else if(c.effect==='obsidian'){ctx.fillStyle='#4c1d95';ctx.strokeStyle='#c4b5fd';ctx.beginPath();for(const [i,[x,y]]of [[-14,10],[-9,-8],[0,-19],[12,-6],[16,12],[0,17]].entries()){if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(0,17);ctx.moveTo(-9,-8);ctx.lineTo(12,-6);ctx.moveTo(-14,10);ctx.lineTo(12,-6);ctx.stroke();}
 else if(c.effect==='wind-stack'||c.effect==='speed'){ctx.strokeStyle='#bae6fd';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-16,-9+i*9);ctx.lineTo(7,-9+i*9);ctx.arc(7,-13+i*9,4,Math.PI/2,-Math.PI*.8,true);ctx.stroke();}}
 else if(c.effect==='berry-spawner'||c.effect==='food'){disc(-8,2,10,'#166534');disc(8,2,10,'#15803d');disc(0,-7,12,'#22c55e');for(const [x,y]of [[-8,0],[4,-8],[10,5],[-2,10]])disc(x,y,3.5,'#fb7185');}
 else if(c.effect==='frost'){ctx.fillStyle='#334155';ctx.strokeStyle='#bae6fd';ctx.beginPath();ctx.moveTo(-19,14);ctx.lineTo(-12,-7);ctx.lineTo(0,-17);ctx.lineTo(12,-7);ctx.lineTo(19,14);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,12,7,Math.PI,Math.PI*2);ctx.lineTo(7,14);ctx.lineTo(-7,14);ctx.closePath();ctx.fillStyle='#0f172a';ctx.fill();}
 else if(c.effect==='heal'){disc(0,0,17,'#0e7490');disc(0,0,11,'#67e8f9');ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();}
 else {ctx.fillStyle='#a7f3d0';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(14,5);ctx.lineTo(-14,5);ctx.closePath();ctx.fill();ctx.fillStyle='#a16207';ctx.fillRect(-3,5,6,12);}
 ctx.restore();
}
