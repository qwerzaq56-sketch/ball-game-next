import {canStartDodge} from './combat.js';
// Pointer Events allow independent movement and attack fingers; cancellation never sticks.
export class TouchControls {
  constructor(game,input,canvas) {
    this.game=game;this.input=input;this.canvas=canvas;this.pointers=new Map();
    this.root=document.getElementById('touch-controls');
    this.stick=document.getElementById('touch-stick');this.knob=document.getElementById('touch-knob');
    this.attack=document.getElementById('touch-attack');this.dodge=document.getElementById('touch-dodge');this.special=document.getElementById('touch-special');
    this.stick.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'||this.blocked()||[...this.pointers.values()].includes('move'))return;
      e.preventDefault();this.stick.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,'move');this.move(e);
    });
    this.stick.addEventListener('pointermove',e=>{if(this.pointers.get(e.pointerId)==='move'){e.preventDefault();this.move(e);}});
    for(const [button,kind] of [[this.attack,'attack'],[this.dodge,'dodge'],[this.special,'special']]){
      button.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse'||this.blocked()||button.disabled)return;
        e.preventDefault();button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,kind);
        if(kind==='attack')input.mouseDown=true;
        if(kind==='dodge')input._dodgeQueued=true;
        if(kind==='special')input._specialQueued=true;
      });
    }
    this.attack.addEventListener('pointermove',e=>{
      if(this.pointers.get(e.pointerId)!=='attack'||this.blocked())return;
      e.preventDefault();const r=this.attack.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy);
      if(length<8)return;
      const player=game.worldToScreen(game.player.x,game.player.y);
      input.mouseX=player.x+dx/length*180;input.mouseY=player.y+dy/length*180;
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(event,e=>this.release(e.pointerId));
    for(const event of ['pointerdown','pointermove'])canvas.addEventListener(event,e=>{
      if(e.pointerType!=='touch'||this.blocked())return;
      e.preventDefault();const rect=canvas.getBoundingClientRect();input.mouseX=e.clientX-rect.left;input.mouseY=e.clientY-rect.top;
    });
    window.addEventListener('blur',()=>this.clear());
    window.addEventListener('resize',()=>this.clear());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
    this.lastHistory=game.apexHistory;this.wasPaused=game.paused;
  }
  blocked(){return this.game.paused||this.game.gameOver;}
  move(e){
    const r=this.stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
    const length=Math.hypot(dx,dy),radius=36,scale=Math.max(radius,length);
    this.input.touchMove=length<5?{x:0,y:0}:{x:dx/scale,y:dy/scale};
    this.knob.style.transform=`translate(${this.input.touchMove.x*radius}px,${this.input.touchMove.y*radius}px)`;
  }
  release(id){
    const kind=this.pointers.get(id);if(!kind)return;this.pointers.delete(id);
    if(kind==='move'){this.input.touchMove={x:0,y:0};this.knob.style.transform='';}
    if(kind==='attack'&&![...this.pointers.values()].includes('attack'))this.input.mouseDown=false;
  }
  clear(){
    for(const id of [...this.pointers.keys()])this.release(id);
    this.input.touchMove={x:0,y:0};this.input.mouseDown=false;this.input._dodgeQueued=false;this.input._specialQueued=false;
  }
  update(){
    const fresh=this.lastHistory!==this.game.apexHistory;
    if(fresh||(!this.wasPaused&&this.game.paused))this.clear();
    this.lastHistory=this.game.apexHistory;this.wasPaused=this.game.paused;
    const p=this.game.player,blocked=this.blocked();
    this.attack.disabled=blocked||!p.attackUnlocked||!!p.companionGroup;
    this.dodge.disabled=blocked||!p.dodgeUnlocked||!canStartDodge(p);
    this.special.disabled=blocked||!this.game.abilities.canCast(p);
    const attackAt=this.game.balance.skills.attackStackThresholds.find(t=>t.maxStack>0)?.size??40;
    const dodgeAt=this.game.balance.skills.dodgeStackThresholds.find(t=>t.maxStack>0)?.size??50;
    const labels=[
      [this.attack,p.companionGroup?'동행 중\n공격 불가':!p.attackUnlocked?`크기 ${attackAt}\n공격 해금`:p.frozen>0?'빙결 중\n공격':p.attackStack<=0?'충전 중\n공격':'조준\n공격'],
      [this.dodge,!p.dodgeUnlocked?`크기 ${dodgeAt}\n회피 해금`:p.frozen>0?'빙결 중':p.dodgeStack<=0?'회피 충전':'회피'],
      [this.special,!p.apex?'최상위\nE 해금':p.companionGroup?'동행 중\nE 불가':p.specialCast?'E 시전 중':(p.specialCooldown??0)>0?`E ${Math.ceil(p.specialCooldown)}s`:p.frozen>0?'빙결 중':p.attackState!=='READY'||p.dodgeState==='DODGING'?'행동 중':'E 스킬']
    ];
    for(const [button,label]of labels)if(button.textContent!==label)button.textContent=label;
    this.stick.setAttribute('aria-disabled',String(blocked));
  }
}
