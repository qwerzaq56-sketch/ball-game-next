// R-CTRL-007: renders the situational tip (logic in tips.js) above the ability bar without pausing.
import {Tips, loadTipState} from './tips.js';

const $ = (id) => document.getElementById(id);
export class TipsUI {
  constructor(game) {
    this.game = game;
    game.tips = new Tips(game, {...loadTipState(), persist: true});
    this.box = $('situational-tip'); this.title = $('situational-tip-title'); this.text = $('situational-tip-text');
    this.shown = null;
    this.box.addEventListener('click', (e) => { if (e.target.id !== 'situational-tip-off') game.tips.dismiss(); });
    $('situational-tip-off').addEventListener('click', () => game.tips.disable());
    $('tips-reset')?.addEventListener('click', () => { game.tips.reset(); $('tips-reset').textContent = '상황 팁을 다시 켰습니다'; });
  }
  // Waits while anything else is talking: dialogs, pause, results, autoplay, the start guide and the terrain hint.
  blocked() {
    const g = this.game;
    return !!(g.paused || g.gameOver || g.autoplay?.enabled || $('play-help')?.open || $('player-setup')?.open || !$('starter-guide')?.hidden || !$('terrain-hint')?.hidden);
  }
  update(dt) {
    const tips = this.game.tips, blocked = this.blocked(); tips.update(dt, blocked);
    const tip = blocked ? null : tips.current; // a visible tip hides (and its timer stops) while something else is up
    if ((tip?.id ?? null) !== this.shown) {
      this.shown = tip?.id ?? null;
      if (tip) { this.title.textContent = tip.title; this.text.textContent = this.game.input?.touchMode ? tip.text.touch : tip.text.desktop; this.box.dataset.tip = tip.id; }
      this.box.hidden = !tip;
    }
  }
}
