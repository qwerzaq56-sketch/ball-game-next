// Pause/help own no gameplay rules. Modal dismissal restores the previous pause state.
export class PlayControls {
  constructor(game,input) {
    this.game=game;this.input=input;
    this.help=document.getElementById('play-help');
    this.pauseButton=document.getElementById('pause-btn');
    this.pauseIndicator=document.getElementById('pause-indicator');
    this.pauseReason='';this.lastHistory=game.apexHistory;this.resumePointers=new Set();
    const canvas=document.getElementById('game-canvas');
    // Shift+left click while the F2 inspector is open is an observation input (R-CTRL-003): it selects and never resumes.
    canvas.addEventListener('pointerdown',e=>{if(game.paused&&!this.blocked()&&!this.help.open&&(e.pointerType!=='mouse'||e.button===0)&&!this.inspecting(e)){this.resumePointers.add(e.pointerId);e.preventDefault();}});
    window.addEventListener('pointerup',e=>{
      if(!this.resumePointers.delete(e.pointerId))return;
      if(!game.paused||this.blocked()||this.help.open)return;
      e.preventDefault();e.stopImmediatePropagation();this.togglePause();
    },true);
    window.addEventListener('pointercancel',e=>this.resumePointers.delete(e.pointerId));
    document.getElementById('help-btn').addEventListener('click',()=>this.openHelp());
    document.getElementById('help-close').addEventListener('click',()=>this.help.close());
    this.help.addEventListener('close',()=>{game.paused=this.helpWasPaused;this.pauseReason=this.helpWasPaused?this.helpWasReason:'';this.clearInput();this.focusCanvas();});
    this.pauseButton.addEventListener('click',()=>this.togglePause());
    window.addEventListener('keydown',e=>{
      if(e.repeat||e.target.closest?.('input,textarea,select')||document.getElementById('player-setup').open)return;
      if(e.key.toLowerCase()==='h'){e.preventDefault();if(this.help.open)this.help.close();else this.openHelp();}
      if((e.key.toLowerCase()==='p'||e.key==='Escape')&&!this.help.open){e.preventDefault();this.togglePause();}
    });
    window.addEventListener('blur',()=>this.backgroundPause());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.backgroundPause();});
  }
  clearInput(){this.input.keys.clear();this.input.touchMove={x:0,y:0};this.input.mouseDown=false;this.input.absorbHeld=false;this.input.sprintHeld=false;this.input.attackChargeSeconds=0;this.input._dodgeQueued=false;this.input._dodgeAngle=null;this.input._attackQueued=null;this.input._specialQueued=false;this.input._ultimateQueued=false;}
  focusCanvas(){document.getElementById('game-canvas').focus({preventScroll:true});}
  inspecting(e){return e.pointerType==='mouse'&&e.shiftKey&&e.button===0&&!!this.game.ui?.inspector?.visible;}
  blocked(){return !!document.querySelector('#designer-review[open]')||this.game.gameOver||document.getElementById('player-setup').open||document.getElementById('reset-confirm-overlay').style.display==='flex';}
  pause(reason='일시정지'){this.resumePointers.clear();this.lastHistory=this.game.apexHistory;this.game.paused=true;this.pauseReason=reason;this.clearInput();this.game.stopContinuousAudio();}
  backgroundPause(){
    this.resumePointers.clear();
    if(this.blocked())return;
    if(this.help.open){this.helpWasPaused=true;this.helpWasReason='창 전환으로 일시정지';this.pause(this.helpWasReason);return;}
    if(!this.game.paused)this.pause('창 전환으로 일시정지');
  }
  togglePause(){if(this.blocked()||this.help.open)return;if(this.game.paused){this.game.paused=false;this.pauseReason='';this.clearInput();}else this.pause();this.focusCanvas();}
  openHelp(){if(this.blocked()||this.help.open)return;this.helpWasPaused=this.game.paused;this.helpWasReason=this.pauseReason;this.pause();this.help.showModal();}
  update(){
    if(this.lastHistory!==this.game.apexHistory){this.lastHistory=this.game.apexHistory;this.pauseReason='';}
    const blocked=this.blocked();
    this.pauseButton.disabled=blocked||this.help.open;
    this.pauseButton.textContent=this.game.paused?'계속하기 (P)':'일시정지 (P)';
    this.pauseButton.setAttribute('aria-pressed',String(this.game.paused));
    this.pauseIndicator.hidden=!this.game.paused||blocked||this.help.open;
    this.pauseIndicator.firstChild.nodeValue=`${this.pauseReason||'일시정지'} `;
  }
}
