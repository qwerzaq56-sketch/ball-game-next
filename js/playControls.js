// Pause/help own no gameplay rules. Modal dismissal restores the previous pause state.
export class PlayControls {
  constructor(game,input) {
    this.game=game;this.input=input;
    this.help=document.getElementById('play-help');this.menu=document.getElementById('hud-menu');this.menuRestored=true;
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
    // R-VIS-010: the menu pauses like help and restores the earlier state; items that open something else close it first (capture runs before their own handlers).
    document.getElementById('menu-btn').addEventListener('click',()=>this.openMenu());
    document.getElementById('menu-close').addEventListener('click',()=>this.closeMenu());
    this.menu.addEventListener('click',e=>{
      const r=this.menu.getBoundingClientRect(),backdrop=e.target===this.menu&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);
      if(backdrop||e.target.closest('[data-menu-close]'))this.closeMenu();
    },true);
    this.menu.addEventListener('close',()=>{this.restoreMenu();this.focusCanvas();});
    window.addEventListener('keydown',e=>{
      if(e.repeat||e.target.closest?.('input,textarea,select')||document.getElementById('player-setup').open)return;
      if(e.key.toLowerCase()==='m'&&!this.help.open){e.preventDefault();if(this.menu.open)this.closeMenu();else this.openMenu();}
      if(this.menu.open)return;// Esc closes the menu dialog natively
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
    if(this.menu.open){this.menuWasPaused=true;this.menuWasReason='창 전환으로 일시정지';this.pause(this.menuWasReason);return;}
    if(!this.game.paused)this.pause('창 전환으로 일시정지');
  }
  togglePause(){if(this.blocked()||this.help.open||this.menu.open)return;if(this.game.paused){this.game.paused=false;this.pauseReason='';this.clearInput();}else this.pause();this.focusCanvas();}
  // R-CTRL-005: the tutorial cards render into the same dialog; opts pick the first-run deck or a card.
  openMenu(){if(this.blocked()||this.help.open||this.menu.open)return;this.menuWasPaused=this.game.paused;this.menuWasReason=this.pauseReason;this.menuRestored=false;this.pause('메뉴');this.menu.showModal();}
  restoreMenu(){if(this.menuRestored)return;this.menuRestored=true;this.game.paused=this.menuWasPaused;this.pauseReason=this.menuWasPaused?this.menuWasReason:'';this.clearInput();}
  // restore synchronously: the dialog's close event arrives a task later, after the item's own handler has run
  closeMenu(){if(!this.menu.open)return;this.restoreMenu();this.menu.close();}
  openHelp(opts={}){if(this.blocked()||this.help.open||this.menu.open)return;this.helpWasPaused=this.game.paused;this.helpWasReason=this.pauseReason;this.pause();this.onOpenHelp?.(opts);this.help.showModal();}
  update(){
    if(this.lastHistory!==this.game.apexHistory){this.lastHistory=this.game.apexHistory;this.pauseReason='';}
    const blocked=this.blocked();
    this.pauseButton.disabled=blocked||this.help.open||this.menu.open;
    const label=this.game.paused?'계속하기 (P)':'일시정지 (P)';
    if(this.pauseButton.getAttribute('aria-label')!==label){this.pauseButton.setAttribute('aria-label',label);this.pauseButton.title=label;}
    this.pauseButton.setAttribute('aria-pressed',String(this.game.paused));
    this.pauseIndicator.hidden=!this.game.paused||blocked||this.help.open||this.menu.open;
    this.pauseIndicator.firstChild.nodeValue=`${this.pauseReason||'일시정지'} `;
  }
}
