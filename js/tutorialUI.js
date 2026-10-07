// R-CTRL-005: tutorial cards inside the help dialog.
// First start shows the basic cards plus the player's species card; the help button (H) reopens every deck;
// the first visit to each terrain shows a short hint that opens that terrain's card. Nothing here changes the game.
import {DECKS, basicCards, speciesCards, terrainCards, firstRunDeck, terrainHint} from './tutorialCards.js';

export const TUTORIAL_KEY = 'ballgamenext_tutorial_v1';
const HINT_SECONDS = 7;

function loadSeen() {
  try { const v = JSON.parse(localStorage.getItem(TUTORIAL_KEY)); return {firstRun: !!v?.firstRun, regions: Array.isArray(v?.regions) ? v.regions : []}; }
  catch { return {firstRun: false, regions: []}; }
}
function saveSeen(seen) { try { localStorage.setItem(TUTORIAL_KEY, JSON.stringify(seen)); } catch { /* playing does not require storage */ } }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export class TutorialUI {
  constructor(game, playControls) {
    this.game = game; this.controls = playControls; this.help = playControls.help;
    this.seen = loadSeen(); this.mode = 'help'; this.deck = 'basic'; this.cards = []; this.index = 0;
    this.hint = document.getElementById('terrain-hint'); this.hintText = document.getElementById('terrain-hint-text');
    this.hintUntil = 0; this.hintCard = null; this.scanClock = 0;
    // Automated browsers start with empty storage; they opt in with ?tutorial so existing checks keep a clear screen.
    this.auto = !navigator.webdriver || new URLSearchParams(location.search).has('tutorial');
    this.tabs = this.help.querySelector('.tc-tabs');
    for (const d of DECKS) {
      const b = el('button', 'tc-tab', d.name); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.deck = d.id;
      b.addEventListener('click', () => this.showDeck(d.id)); this.tabs.append(b);
    }
    // The long-form guide is its own last tab: 기본 조작 · 종족 · 지형·오브젝트 · 전체 안내.
    const guide = el('button', 'tc-tab', '전체 안내'); guide.type = 'button'; guide.setAttribute('role', 'tab'); guide.dataset.deck = 'guide';
    guide.addEventListener('click', () => this.showDeck('guide')); this.tabs.append(guide);
    document.getElementById('tc-prev').addEventListener('click', () => this.step(-1));
    document.getElementById('tc-next').addEventListener('click', () => { if (this.mode === 'tutorial' && this.index === this.cards.length - 1) this.help.close(); else this.step(1); });
    this.help.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1); } });
    this.help.addEventListener('close', () => this.finish());
    document.getElementById('terrain-hint-open').addEventListener('click', () => { const id = this.hintCard; this.hideHint(); this.open({deck: 'terrain', cardId: id}); });
    document.getElementById('quick-help')?.addEventListener('click', () => this.open());
    playControls.onOpenHelp = (opts) => this.prepare(opts);
    document.getElementById('player-setup').addEventListener('close', () => { if (this.auto && !this.seen.firstRun) setTimeout(() => this.open({tutorial: true}), 0); });
  }
  open(opts = {}) { this.controls.openHelp(opts); }
  deckCards(id) {
    const g = this.game, b = g.balance;
    if (id === 'species') { const all = speciesCards(b), own = g.player.color; return [...all.filter((c) => c.species === own), ...all.filter((c) => c.species !== own)]; }
    if (id === 'terrain') return terrainCards(b, g.biomes?.regions);
    return basicCards(b);
  }
  prepare(opts = {}) {
    this.mode = opts.tutorial ? 'tutorial' : 'help';
    this.help.classList.toggle('tutorial-mode', this.mode === 'tutorial');
    document.getElementById('play-help-title').textContent = this.mode === 'tutorial' ? '처음 시작 안내' : '도움말';
    document.getElementById('help-close').textContent = this.mode === 'tutorial' ? '건너뛰기' : '닫기 · Esc';
    if (this.mode === 'tutorial') { this.deck = 'first-run'; this.cards = firstRunDeck(this.game.balance, this.game.player.color); this.index = 0; this.render(); return; }
    const deck = opts.deck ?? (this.deck === 'first-run' ? 'basic' : this.deck);
    this.showDeck(deck, opts.cardId);
  }
  showDeck(id, cardId) {
    if (id === 'guide') { this.deck = 'guide'; this.cards = []; this.index = 0; this.render(); return; }
    this.deck = id; this.cards = this.deckCards(id);
    let index = cardId ? this.cards.findIndex((c) => c.id === cardId) : -1;
    if (index < 0 && id === 'terrain' && this.game.biomes?.enabled) { const r = this.game.biomes.regionAt(this.game.player); index = this.cards.findIndex((c) => c.region === r?.id); }
    this.index = Math.max(0, index); this.render();
  }
  step(d) { if (!this.cards.length) return; this.index = Math.min(this.cards.length - 1, Math.max(0, this.index + d)); this.render(); }
  render() {
    for (const b of this.tabs.children) { const on = b.dataset.deck === this.deck; b.setAttribute('aria-selected', String(on)); b.classList.toggle('active', on); }
    const guide = this.deck === 'guide';
    document.getElementById('help-guide').hidden = !guide; document.getElementById('tc-card').hidden = guide; this.help.querySelector('.tc-nav').hidden = guide;
    if (guide) return;
    const card = this.cards[this.index], box = document.getElementById('tc-card');
    box.replaceChildren(); if (!card) return;
    box.dataset.card = card.id; box.style.setProperty('--tc-accent', card.accent);
    const head = el('header', 'tc-head'), dot = el('span', 'tc-dot'); dot.style.background = card.accent;
    head.append(dot, el('h3', null, card.title), el('span', 'tc-deck', DECKS.find((d) => d.id === card.deck)?.name ?? '')); box.append(head);
    if (card.keys) box.append(el('p', 'tc-keys', this.game.input?.touchMode ? card.keys.touch : card.keys.desktop));
    if (card.lines?.length) { const ul = el('ul', 'tc-lines'); for (const l of card.lines) ul.append(el('li', null, l)); box.append(ul); }
    if (card.skills) for (const s of card.skills) { const d = el('div', 'tc-skill'); d.append(el('b', null, s.slot), el('strong', null, s.name), el('span', null, s.note), el('p', null, s.text)); box.append(d); }
    if (card.ai) box.append(el('p', 'tc-ai', card.ai));
    if (card.objects?.length) {
      box.append(el('h4', null, '지형 오브젝트'));
      const ul = el('ul', 'tc-objects');
      for (const o of card.objects) { const li = el('li', o.danger ? 'danger' : null); li.append(el('strong', null, o.name), document.createTextNode(` ${o.text}`)); ul.append(li); }
      box.append(ul);
    }
    document.getElementById('tc-count').textContent = `${this.index + 1} / ${this.cards.length}`;
    document.getElementById('tc-prev').disabled = this.index === 0;
    const next = document.getElementById('tc-next'), last = this.index === this.cards.length - 1;
    next.textContent = this.mode === 'tutorial' && last ? '시작하기' : '다음'; next.disabled = this.mode !== 'tutorial' && last;
  }
  finish() {
    if (this.mode === 'tutorial') { this.seen.firstRun = true; saveSeen(this.seen); }
    this.mode = 'help'; this.help.classList.remove('tutorial-mode');
  }
  hideHint() { this.hint.hidden = true; this.hintUntil = 0; }
  // First visit to each terrain: a short, non-blocking hint. Waits while paused, in help or before the first-run cards close.
  update(dt) {
    const g = this.game;
    if (!this.hint.hidden && (g.gameTime >= this.hintUntil || g.gameOver)) this.hideHint();
    if (!this.auto || g.paused || g.gameOver || this.help.open || !this.seen.firstRun || !g.biomes?.enabled) return;
    if ((this.scanClock -= dt) > 0) return; this.scanClock = .5;
    const region = g.biomes.regionAt(g.player);
    if (!region || this.seen.regions.includes(region.id)) return;
    this.seen.regions.push(region.id); saveSeen(this.seen);
    const card = terrainCards(g.balance, g.biomes.regions).find((c) => c.region === region.id); if (!card) return;
    this.hintCard = card.id; this.hint.dataset.region = region.id; this.hint.style.setProperty('--tc-accent', card.accent);
    this.hintText.textContent = `새 지형 · ${terrainHint(card)}`; this.hint.hidden = false; this.hintUntil = g.gameTime + HINT_SECONDS;
  }
}
