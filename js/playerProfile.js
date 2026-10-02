const COLOR_NAMES = {cyan:'하늘',blue:'파랑',green:'초록',red:'빨강',yellow:'노랑'};
export const PROFILE_KEY = 'ballgamenext_player_profile_v1';

export function normalizeProfile(profile, colors) {
  const name = typeof profile?.name === 'string' ? profile.name.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim() : '';
  return {name:[...name].slice(0,16).join('') || '나',
    color:colors.some(c=>c.id===profile?.color) ? profile.color : (colors.find(c=>c.id==='blue') ?? colors[0]).id};
}
export function loadPlayerProfile(colors) {
  try {return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY)),colors);} catch {return normalizeProfile(null,colors);}
}
export function savePlayerProfile(profile) {
  try {localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));} catch { /* playing does not require storage */ }
}

export class PlayerSetup {
  constructor(game, input) {
    this.game=game;this.input=input;
    this.dialog=document.getElementById('player-setup');
    this.form=document.getElementById('player-setup-form');
    this.name=document.getElementById('player-name');
    this.preview=document.getElementById('player-preview');
    const colors=document.getElementById('player-colors');
    for(const color of game.balance.colors) {
      const label=document.createElement('label');label.className='player-color';
      const radio=document.createElement('input');radio.type='radio';radio.name='player-color';radio.value=color.id;
      const swatch=document.createElement('span');swatch.className='color-swatch';swatch.style.backgroundColor=color.color;
      const text=document.createElement('span');text.textContent=COLOR_NAMES[color.id]??color.id;
      label.append(radio,swatch,text);colors.append(label);
    }
    this.form.addEventListener('input',()=>this.updatePreview());
    this.form.addEventListener('submit',e=>{
      e.preventDefault();
      const profile=normalizeProfile({name:this.name.value,color:this.form.elements['player-color'].value},game.balance.colors);
      savePlayerProfile(profile);game.options.profile=profile;game.reset();this.clearInput();
      this.dialog.close();document.getElementById('game-canvas').focus({preventScroll:true});
    });
    this.dialog.addEventListener('cancel',e=>e.preventDefault()); // Choosing a player starts the run.
  }
  clearInput() {this.input.keys.clear();this.input.touchMove={x:0,y:0};this.input.mouseDown=false;this.input._dodgeQueued=false;this.input._specialQueued=false;}
  open() {
    this.game.paused=true;this.clearInput();
    const profile=normalizeProfile(this.game.options.profile,this.game.balance.colors);
    this.name.value=profile.name==='나'?'':profile.name;
    this.form.elements['player-color'].value=profile.color;this.updatePreview();
    if(!this.dialog.open)this.dialog.showModal();
    this.name.focus();
  }
  updatePreview() {
    const color=this.game.balance.colors.find(c=>c.id===this.form.elements['player-color'].value);
    this.preview.style.backgroundColor=color?.color??'#3b82f6';
    document.getElementById('player-name-preview').textContent=normalizeProfile({name:this.name.value},this.game.balance.colors).name;
  }
}
