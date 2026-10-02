// Pause/help own no gameplay rules. Modal dismissal restores the previous pause state.
export class PlayControls {
  constructor(game,input) {
    this.game=game;this.input=input;
    this.help=document.getElementById('play-help');
    this.pauseButton=document.getElementById('pause-btn');
    this.pauseIndicator=document.getElementById('pause-indicator');
    document.getElementById('help-btn').addEventListener('click',()=>this.openHelp());
    document.getElementById('help-close').addEventListener('click',()=>this.help.close());
    this.help.addEventListener('close',()=>{game.paused=this.helpWasPaused;this.clearInput();this.focusCanvas();});
    this.pauseButton.addEventListener('click',()=>this.togglePause());
    window.addEventListener('keydown',e=>{
      if(e.repeat||e.target.closest?.('input,textarea,select')||document.getElementById('player-setup').open)return;
      if(e.key.toLowerCase()==='h'){e.preventDefault();if(this.help.open)this.help.close();else this.openHelp();}
      if(e.key.toLowerCase()==='p'&&!this.help.open){e.preventDefault();this.togglePause();}
    });
  }
  clearInput(){this.input.keys.clear();this.input.mouseDown=false;this.input._dodgeQueued=false;this.input._specialQueued=false;}
  focusCanvas(){document.getElementById('game-canvas').focus({preventScroll:true});}
  blocked(){return this.game.gameOver||document.getElementById('player-setup').open||document.getElementById('reset-confirm-overlay').style.display==='flex';}
  togglePause(){if(this.blocked()||this.help.open)return;this.game.paused=!this.game.paused;this.clearInput();this.focusCanvas();}
  openHelp(){if(this.blocked()||this.help.open)return;this.helpWasPaused=this.game.paused;this.game.paused=true;this.clearInput();this.help.showModal();}
  update(){
    const blocked=this.blocked();
    this.pauseButton.disabled=blocked||this.help.open;
    this.pauseButton.textContent=this.game.paused?'계속하기 (P)':'일시정지 (P)';
    this.pauseButton.setAttribute('aria-pressed',String(this.game.paused));
    this.pauseIndicator.hidden=!this.game.paused||blocked||this.help.open;
  }
}
