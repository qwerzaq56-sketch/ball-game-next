import {touchActionFeedback} from './touchFeedback.js';
// Pointer Events allow independent movement and attack fingers; cancellation never sticks.
export class TouchControls {
  constructor(game,input,canvas) {
    this.game=game;this.input=input;this.canvas=canvas;this.pointers=new Map();this.gestures=new Map();
    const toggle=document.getElementById('mobile-ui-toggle');
    const coarse=window.matchMedia('(pointer:coarse)').matches,key=coarse?'ball-mobile-minimal':'ball-desktop-minimal';
    let minimal=coarse;try{const saved=localStorage.getItem(key);if(saved!==null)minimal=saved==='true';}catch{}
    const apply=()=>{document.body.classList.toggle('mobile-minimal',minimal);toggle.textContent=minimal?'전체 UI':'최소 UI';toggle.setAttribute('aria-pressed',String(minimal));};
    const switchUI=()=>{minimal=!minimal;apply();try{localStorage.setItem(key,String(minimal));}catch{}};
    apply();toggle.addEventListener('click',switchUI);
    window.addEventListener('keydown',e=>{if(e.code==='KeyU'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();switchUI();}});
    this.root=document.getElementById('touch-controls');
    this.stick=document.getElementById('touch-stick');this.knob=document.getElementById('touch-knob');
    this.attack=document.getElementById('touch-attack');this.dodge=document.getElementById('touch-dodge');this.special=document.getElementById('touch-special');this.ultimate=document.getElementById('touch-ultimate');
    this.stick.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'||this.blocked()||[...this.pointers.values()].includes('move'))return;
      e.preventDefault();this.stick.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,'move');this.move(e);
    });
    this.stick.addEventListener('pointermove',e=>{if(this.pointers.get(e.pointerId)==='move'){e.preventDefault();this.move(e);}});
    for(const [button,kind] of [[this.attack,'attack'],[this.dodge,'dodge'],[this.special,'special'],[this.ultimate,'ultimate']]){
      button.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse'||this.blocked()||button.disabled||(kind!=='special'&&this.gestures.size))return;
        e.preventDefault();button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,kind);
        if(kind==='attack'||kind==='dodge'){this.gestures.set(e.pointerId,{x:e.clientX,y:e.clientY,angle:game.player.facing,kind});this.aim(e);}
        if(kind==='special')input._specialQueued=true;
        if(kind==='ultimate')input._ultimateQueued=true;
      });
    }
    for(const button of [this.attack,this.dodge,canvas])button.addEventListener('pointermove',e=>{
      if(!this.gestures.has(e.pointerId)||this.blocked())return;e.preventDefault();this.aim(e);
    });
    window.addEventListener('pointerup',e=>{if(this.gestures.has(e.pointerId))this.aim(e);this.release(e.pointerId,true);});
    for(const event of ['pointercancel','lostpointercapture'])window.addEventListener(event,e=>this.release(e.pointerId));
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||this.blocked()||!game.player.attackUnlocked||this.gestures.size)return;
      e.preventDefault();canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,'attack');
      this.gestures.set(e.pointerId,{x:e.clientX,y:e.clientY,angle:game.player.facing,canvas:true,kind:"attack"});this.aim(e);
    });
    window.addEventListener('blur',()=>this.clear());
    window.addEventListener('resize',()=>this.clear());
    window.visualViewport?.addEventListener('resize',()=>this.clear());
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
    this.showAim(gesture.angle,gesture.kind);
  }
  showAim(angle,kind){
    const p=this.game.worldToScreen(this.game.player.x,this.game.player.y);
    this.input.mouseX=p.x+Math.cos(angle)*180;this.input.mouseY=p.y+Math.sin(angle)*180;
    this.game.touchAim={angle,kind};
  }
  release(id,fire=false){
    const kind=this.pointers.get(id);if(!kind)return;this.pointers.delete(id);
    const gesture=this.gestures.get(id);this.gestures.delete(id);
    if(gesture&&fire&&!this.blocked()&&(!gesture.canvas||gesture.dragged)){
      if(kind==='attack')this.input._attackQueued=gesture.angle;
      if(kind==='dodge'){this.input._dodgeAngle=gesture.angle;this.input._dodgeQueued=true;}
    }
    if(!this.gestures.size)this.game.touchAim=null;
    if(kind==='move'){this.input.touchMove={x:0,y:0};this.knob.style.transform='';}
    if(kind==='attack'&&![...this.pointers.values()].includes('attack'))this.input.mouseDown=false;
  }
  clear(){
    for(const id of [...this.pointers.keys()])this.release(id);
    this.input.touchMove={x:0,y:0};this.input.mouseDown=false;this.input._dodgeQueued=false;this.input._dodgeAngle=null;this.input._attackQueued=null;this.input._specialQueued=false;this.input._ultimateQueued=false;
  }
  update(){
    const fresh=this.lastHistory!==this.game.apexHistory;
    if(fresh||(!this.wasPaused&&this.game.paused))this.clear();
    this.lastHistory=this.game.apexHistory;this.wasPaused=this.game.paused;
    const gesture=this.gestures.values().next().value;if(gesture)this.showAim(gesture.angle,gesture.kind);
    const p=this.game.player,blocked=this.blocked();
    for(const [button,kind]of [[this.attack,'attack'],[this.dodge,'dodge'],[this.special,'special'],[this.ultimate,'ultimate']]){
      const feedback=touchActionFeedback(this.game,kind);
      button.disabled=feedback.disabled;
      if(button.textContent!==feedback.label)button.textContent=feedback.label;
      if(button.dataset.state!==feedback.state)button.dataset.state=feedback.state;
      if(button.dataset.charges!==feedback.charges)button.dataset.charges=feedback.charges;
      const progress=String(Math.round(feedback.progress*100));
      if(button.dataset.progress!==progress){button.dataset.progress=progress;button.style.setProperty('--recharge',`${progress}%`);}
      button.classList.toggle('aiming',[...this.pointers.values()].includes(kind));
      const label=`${feedback.label.replace('\n',' ')}${feedback.charges?' · 충전 '+feedback.charges:''}${!feedback.disabled&&kind!=='special'?' · 드래그 후 손을 떼면 실행':''}`;
      if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
    }
    this.stick.setAttribute('aria-disabled',String(blocked));
  }
}
