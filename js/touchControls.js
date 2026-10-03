import {canStartDodge} from './combat.js';
// Pointer Events allow independent movement and attack fingers; cancellation never sticks.
export class TouchControls {
  constructor(game,input,canvas) {
    this.game=game;this.input=input;this.canvas=canvas;this.pointers=new Map();this.gestures=new Map();
    this.preview=document.createElement('div');this.preview.id='touch-aim-preview';document.body.append(this.preview);
    const toggle=document.getElementById('mobile-ui-toggle');
    let minimal=true;try{minimal=localStorage.getItem('ball-mobile-minimal')!=='false';}catch{}
    const apply=()=>{document.body.classList.toggle('mobile-minimal',minimal);toggle.textContent=minimal?'전체 UI':'최소 UI';toggle.setAttribute('aria-pressed',String(minimal));};
    apply();toggle.addEventListener('click',()=>{minimal=!minimal;apply();try{localStorage.setItem('ball-mobile-minimal',String(minimal));}catch{}});
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
        if(e.pointerType==='mouse'||this.blocked()||button.disabled||(kind!=='special'&&this.gestures.size))return;
        e.preventDefault();button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,kind);
        if(kind==='attack'||kind==='dodge'){this.gestures.set(e.pointerId,{x:e.clientX,y:e.clientY,angle:game.player.facing});this.aim(e);}
        if(kind==='special')input._specialQueued=true;
      });
    }
    for(const button of [this.attack,this.dodge,canvas])button.addEventListener('pointermove',e=>{
      if(!this.gestures.has(e.pointerId)||this.blocked())return;e.preventDefault();this.aim(e);
    });
    window.addEventListener('pointerup',e=>{if(this.gestures.has(e.pointerId))this.aim(e);this.release(e.pointerId,true);});
    for(const event of ['pointercancel','lostpointercapture'])window.addEventListener(event,e=>this.release(e.pointerId));
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||this.blocked()||!game.player.attackUnlocked||game.player.companionGroup||this.gestures.size)return;
      e.preventDefault();canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,'attack');
      this.gestures.set(e.pointerId,{x:e.clientX,y:e.clientY,angle:game.player.facing,canvas:true});this.aim(e);
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
  aim(e){
    const gesture=this.gestures.get(e.pointerId);if(!gesture)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(Math.hypot(dx,dy)>=8){gesture.angle=Math.atan2(dy,dx);gesture.dragged=true;}
    this.showAim(gesture.angle);
  }
  showAim(angle){
    const p=this.game.worldToScreen(this.game.player.x,this.game.player.y);
    this.input.mouseX=p.x+Math.cos(angle)*180;this.input.mouseY=p.y+Math.sin(angle)*180;
    this.preview.style.cssText=`display:block;left:${p.x}px;top:${p.y}px;transform:rotate(${angle}rad);`;
    this.preview.dataset.kind=[...this.pointers.values()].find(kind=>kind==='attack'||kind==='dodge');
  }
  release(id,fire=false){
    const kind=this.pointers.get(id);if(!kind)return;this.pointers.delete(id);
    const gesture=this.gestures.get(id);this.gestures.delete(id);
    if(gesture&&fire&&!this.blocked()&&(!gesture.canvas||gesture.dragged)){
      if(kind==='attack')this.input._attackQueued=gesture.angle;
      if(kind==='dodge'){this.input._dodgeAngle=gesture.angle;this.input._dodgeQueued=true;}
    }
    if(!this.gestures.size)this.preview.style.display='none';
    if(kind==='move'){this.input.touchMove={x:0,y:0};this.knob.style.transform='';}
    if(kind==='attack'&&![...this.pointers.values()].includes('attack'))this.input.mouseDown=false;
  }
  clear(){
    for(const id of [...this.pointers.keys()])this.release(id);
    this.input.touchMove={x:0,y:0};this.input.mouseDown=false;this.input._dodgeQueued=false;this.input._dodgeAngle=null;this.input._attackQueued=null;this.input._specialQueued=false;
  }
  update(){
    const fresh=this.lastHistory!==this.game.apexHistory;
    if(fresh||(!this.wasPaused&&this.game.paused))this.clear();
    this.lastHistory=this.game.apexHistory;this.wasPaused=this.game.paused;
    const gesture=this.gestures.values().next().value;if(gesture)this.showAim(gesture.angle);
    const p=this.game.player,blocked=this.blocked();
    this.attack.disabled=blocked||!p.attackUnlocked||!!p.companionGroup;
    this.dodge.disabled=blocked||!p.dodgeUnlocked||!canStartDodge(p);
    this.special.disabled=blocked||!this.game.abilities.canCast(p);
    const attackAt=this.game.balance.skills.attackStackThresholds.find(t=>t.maxStack>0)?.size??40;
    const dodgeAt=this.game.balance.skills.dodgeStackThresholds.find(t=>t.maxStack>0)?.size??50;
    const labels=[
      [this.attack,p.companionGroup?'동행 중\n공격 불가':!p.attackUnlocked?`크기 ${attackAt}\n공격 해금`:p.frozen>0?'빙결 중\n공격':p.attackStack<=0?'충전 중\n공격':'조준\n공격'],
      [this.dodge,!p.dodgeUnlocked?`크기 ${dodgeAt}\n회피 해금`:p.frozen>0?'빙결 중':p.dodgeStack<=0?'회피 충전':'조준\n회피'],
      [this.special,!p.apex?'최상위\nE 해금':p.companionGroup?'동행 중\nE 불가':p.specialCast?'E 시전 중':(p.specialCooldown??0)>0?`E ${Math.ceil(p.specialCooldown)}s`:p.frozen>0?'빙결 중':p.attackState!=='READY'||p.dodgeState==='DODGING'?'행동 중':'E 스킬']
    ];
    for(const [button,label]of labels)if(button.textContent!==label)button.textContent=label;
    this.stick.setAttribute('aria-disabled',String(blocked));
  }
}
