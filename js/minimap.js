import {delta,wrappedIntervals} from './topology.js';
import {overlaps} from './presentation.js';

export class Minimap {
  constructor(ui) {
    this.ui=ui;this.root=document.getElementById('minimap-panel');this.canvas=document.getElementById('minimap-canvas');this.ctx=this.canvas.getContext('2d');
    // Portrait phones (R-CTRL-003): the map is a thumbnail under the HUD; a tap expands it over a backdrop that swallows game input.
    this.expanded=false;this.phoneQuery=typeof matchMedia==='function'?matchMedia('(pointer:coarse) and (orientation:portrait)'):null;
    this.backdrop=document.createElement('div');this.backdrop.id='minimap-backdrop';this.backdrop.hidden=true;document.body.append(this.backdrop);
    this.backdrop.addEventListener('click',()=>this.expand(false));
    this.canvas.addEventListener('click',e=>{
      if(this.root.classList.contains('thumb')){this.expand(true);return;}
      const game=ui.game;if(!game||!ui.inspector?.visible)return;
      const r=this.canvas.getBoundingClientRect(),w=game.balance.world;
      const x=(e.clientX-r.left)/r.width*w.worldWidth,y=(e.clientY-r.top)/r.height*w.worldHeight;
      const candidates=game.entities.filter(t=>t.alive&&t.behavior==='ai'&&game.biomes.playerCanSee(t)).map(t=>({t,d:Math.hypot(delta({x,y},t,w).x/w.worldWidth*r.width,delta({x,y},t,w).y/w.worldHeight*r.height)})).filter(v=>v.d<=7).sort((a,b)=>a.d-b.d||a.t.id-b.t.id);
      if(candidates.length)ui.inspector.select(candidates[0].t.id);
    });
  }
  phone(){return !!this.phoneQuery?.matches;}
  expand(on){
    if(this.expanded===on)return;
    this.expanded=on;this.backdrop.hidden=!on;this.root.classList.toggle('expanded',on);this.root.classList.toggle('thumb',!on&&this.phone());
    const res=on?320:160;this.canvas.width=this.canvas.height=res;
  }
  layout() {
    const phone=this.phone();if(this.expanded&&!phone)this.expand(false);
    this.root.classList.toggle('thumb',phone&&!this.expanded);
    if(this.expanded)return;// CSS centres the expanded map
    const w=window.innerWidth,h=window.innerHeight,r=this.root.getBoundingClientRect();
    const obstacles=['hud','minimal-tools','live-ranking','ecology-panel','touch-stick','touch-actions','player-info'].map(id=>document.getElementById(id)).filter(n=>n?.getClientRects().length).map(n=>n.getBoundingClientRect());
    const hud=document.getElementById('hud').getBoundingClientRect(),ranking=document.getElementById('live-ranking').getBoundingClientRect();
    const corners=[[w-r.width-14,h-r.height-28],[14,h-r.height-28],[w-r.width-14,ranking.bottom+12],[14,hud.bottom+12]];
    const positions=[...(phone?corners.reverse():corners),[(w-r.width)/2,h-r.height-16]];// phone thumbnail prefers the slot under the HUD
    const fit=positions.find(([x,y])=>x>=8&&y>=8&&x+r.width<=w-8&&y+r.height<=h-8&&!obstacles.some(b=>overlaps({left:x-4,top:y-4,right:x+r.width+4,bottom:y+r.height+4},b)));
    const [x,y]=fit??[Math.max(8,(w-r.width)/2),Math.max(8,h-r.height-16)];
    this.root.style.left=`${x}px`;this.root.style.top=`${y}px`;this.root.style.right='auto';
  }
  render(game) {
    this.layout();const ctx=this.ctx,w=game.balance.world,scaleX=this.canvas.width/w.worldWidth,scaleY=this.canvas.height/w.worldHeight;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.fillStyle='#0b1422';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    for(const t of game.biomes.tiles){ctx.fillStyle=t.region.color;ctx.fillRect(t.x*scaleX,t.y*scaleY,game.biomes.tile*scaleX+.5,game.biomes.tile*scaleY+.5);}
    for(const h of game.biomes.rivers){ctx.beginPath();ctx.ellipse(h.x*scaleX,h.y*scaleY,h.hotRadius*scaleX,h.hotRadius*scaleY,0,0,Math.PI*2);ctx.fillStyle='#f97316';ctx.fill();}
    for(const item of game.relics.items){if(!game.biomes.playerCanSee(item))continue;ctx.fillStyle='#fde68a';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('★',item.x*scaleX,item.y*scaleY+3);}
    const field=game.era.apocalypse;if(field){ctx.beginPath();ctx.ellipse(field.x*scaleX,field.y*scaleY,field.radius*scaleX,field.radius*scaleY,0,0,Math.PI*2);ctx.strokeStyle=field.active?'#ef4444':'#fbbf24';ctx.lineWidth=2;ctx.stroke();}
    for(const p of game.era.fronts()){ctx.strokeStyle=p.color;ctx.lineWidth=1.5;ctx.strokeRect(p.x*scaleX-3,p.y*scaleY-3,6,6);}
    document.getElementById('minimap-era').textContent=game.era.phase.name+(game.era.fronts().length?' · □ 전선':'');
    for(const e of game.entities){if(!e.alive||!game.biomes.playerCanSee(e))continue;const x=e.x*scaleX,y=e.y*scaleY;
      ctx.beginPath();ctx.arc(x,y,e.behavior==='orb'?.7:e.behavior==='player'?3:Math.min(3,1.2+e.size/100),0,Math.PI*2);ctx.fillStyle=e.behavior==='orb'?'rgba(148,163,184,.35)':e.colorHex;ctx.fill();
      if(e.apex){ctx.beginPath();ctx.arc(x,y,4.5,0,Math.PI*2);ctx.strokeStyle='#facc15';ctx.lineWidth=1;ctx.stroke();}
      if(e===game.player){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(e.facing)*7,y+Math.sin(e.facing)*7);ctx.stroke();}
    }
    const a=game.screenToWorld(0,0),b=game.screenToWorld(game.canvas.width,game.canvas.height);
    ctx.strokeStyle='rgba(226,232,240,.55)';ctx.lineWidth=1;
    if(w.wrap){for(const [left,right]of wrappedIntervals(a.x,b.x,w.worldWidth))for(const [top,bottom]of wrappedIntervals(a.y,b.y,w.worldHeight))ctx.strokeRect(left*scaleX,top*scaleY,(right-left)*scaleX,(bottom-top)*scaleY);}
    else ctx.strokeRect(Math.max(0,a.x*scaleX),Math.max(0,a.y*scaleY),Math.min(w.worldWidth,b.x)*scaleX-Math.max(0,a.x*scaleX),Math.min(w.worldHeight,b.y)*scaleY-Math.max(0,a.y*scaleY));
  }
}
