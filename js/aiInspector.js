// Debug-only AI state inspector (F2). Read-only: it never changes simulation state or consumes
// RNG, so enabling it cannot alter a run. Lists live AI with role / personality / relationship /
// current state and counts recent state changes so back-and-forth behaviour is measurable.
import { dist } from './collision.js';

const WINDOW = 10; // seconds of state-change history shown as "chg/10s"
const SORTS = {
  nearest: (a, b, p) => dist(a, p) - dist(b, p),
  score: (a, b) => b.score - a.score,
  size: (a, b) => b.size - a.size,
  changes: (a, b, p, ins) => ins.recent(b) - ins.recent(a),
};

export class AIInspector {
  constructor(game, canvas, ui) {
    this.game = game;
    this.canvas = canvas;
    this.ui = ui;
    this.visible = false;
    this.sort = 'nearest';
    this.selectedId = null;
    this.track = new Map(); // id -> { last, times: [], hist: [] }
    this.lastRender = 0;
    this.lastHistory = game.apexHistory;

    this.root = document.createElement('div');
    this.root.id = 'ai-inspector';
    this.root.innerHTML =
      '<div class="ai-head"><b>AI INSPECTOR</b> <span class="hint">(F2) · Shift+클릭 또는 행 클릭으로 선택</span>' +
      '<select id="ai-sort"><option value="nearest">가까운 순</option><option value="score">점수 순</option>' +
      '<option value="size">크기 순</option><option value="changes">상태변경 많은 순</option></select></div>' +
      '<div id="ai-detail"></div><div id="ai-rows"></div>';
    document.body.appendChild(this.root);
    this.ring = document.createElement('div');
    this.ring.id = 'ai-select-ring';
    document.body.appendChild(this.ring);

    this.root.querySelector('#ai-sort').addEventListener('change', (e) => { this.sort = e.target.value; this.lastRender = 0; });
    this.root.querySelector('#ai-rows').addEventListener('click', (e) => {
      const row = e.target.closest('[data-id]');
      if (row) { this.selectedId = Number(row.dataset.id); this.lastRender = 0; }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2' && !e.repeat) { e.preventDefault(); this.toggle(); }
    });
    // Capture phase so a Shift+click selects without also starting a player attack.
    canvas.addEventListener('mousedown', (e) => {
      if (!this.visible || !e.shiftKey || e.button !== 0) return;
      e.stopImmediatePropagation();
      this.pick(e);
    }, true);
    const loop = () => { this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  select(id) {
    if (!this.ais().some(e => e.id === id)) return;
    this.selectedId = id;
    if (!this.visible) this.toggle();
    this.lastRender = 0;
  }

  toggle() {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? 'block' : 'none';
    if (!this.visible) this.ring.style.display = 'none';
    this.lastRender = 0;
  }

  ais() { return this.game.entities.filter((e) => e.alive && e.behavior === 'ai'); }

  recent(e) {
    const t = this.track.get(e.id);
    if (!t) return 0;
    const now = this.game.gameTime;
    return t.times.filter((x) => now - x <= WINDOW).length;
  }

  sample() {
    const now = this.game.gameTime, live = new Set();
    for (const e of this.ais()) {
      live.add(e.id);
      let t = this.track.get(e.id);
      if (!t) { t = { last: e.state, times: [], hist: [] }; this.track.set(e.id, t); }
      if (e.state !== t.last) {
        t.times.push(now);
        t.hist.push(t.last + ' → ' + e.state);
        if (t.hist.length > 8) t.hist.shift();
        t.last = e.state;
      }
      while (t.times.length && now - t.times[0] > WINDOW) t.times.shift();
    }
    for (const id of this.track.keys()) if (!live.has(id)) this.track.delete(id);
  }

  pick(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const w = this.game.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    let best = null, bd = Infinity;
    for (const e of this.ais()) {
      const d = Math.hypot(e.x - w.x, e.y - w.y);
      if (d <= e.size / 2 + 12 / this.game.camera.zoom && d < bd) { best = e; bd = d; }
    }
    this.selectedId = best ? best.id : null;
    this.lastRender = 0;
  }

  frame() {
    if (this.lastHistory !== this.game.apexHistory) {
      this.lastHistory = this.game.apexHistory; this.track.clear(); this.selectedId = null;
    }
    if (!this.visible) return;
    this.sample();
    this.placeRing();
    const nowMs = performance.now();
    if (nowMs - this.lastRender < 250) return;
    this.lastRender = nowMs;
    this.root.style.right = this.ui && this.ui.debugVisible ? '316px' : '12px';
    this.render();
  }

  placeRing() {
    const sel = this.game.entities.find((e) => e.id === this.selectedId && e.alive);
    if (!sel) { this.ring.style.display = 'none'; return; }
    const rect = this.canvas.getBoundingClientRect(), g = this.game;
    const s = g.worldToScreen(sel.x, sel.y), r = (sel.size / 2 + 8) * g.camera.zoom;
    Object.assign(this.ring.style, {
      display: 'block', left: rect.left + s.x - r + 'px', top: rect.top + s.y - r + 'px',
      width: r * 2 + 'px', height: r * 2 + 'px',
    });
  }

  describeTarget(e) {
    const t = e.target;
    if (!t) return '-';
    const kind = t.behavior === 'orb' ? 'orb' : t.id != null ? `#${t.id} ${t.color ?? ''} ${t.role ?? ''}`.trim() : 'point';
    return `${kind} (d=${Math.round(dist(e, t))})`;
  }

  detail(e) {
    const g = this.game, eco = g.ecology, t = this.track.get(e.id);
    const sr = eco.scoreOrder.indexOf(e.id) + 1, zr = eco.sizeOrder.indexOf(e.id) + 1;
    const f = (v) => (v == null ? '-' : v);
    const rows = [
      ['이름 / id', `${e.displayName} · #${e.id}`], ['색', e.color], ['역할 / 성격', `${f(e.role)} / ${f(e.personality)}`],
      ['관계', f(e.relationship)], ['state', e.state], ['target', this.describeTarget(e)],
      ['HP / size', `${Math.round(e.hp / e.maxHp * 100)}% / ${Math.round(e.size)}`],
      ['score (순위)', `${Math.round(e.score)} (${sr || '-'}위, size ${zr || '-'}위)`],
      ['최상위', e.apex ? 'YES' : 'no'],
      ['공격/회피 스택', `${e.attackStack ?? 0}/${e.attackMaxStack ?? 0} · ${e.dodgeStack ?? 0}/${e.dodgeMaxStack ?? 0}`],
      ['위험감수 / 회복', `${e.riskTaking ? 'ON' : 'off'} / ${e.recovering ? 'ON' : 'off'}`],
      ['도전 대상 / 반격 대상', `${e.challengeTarget ? '#' + e.challengeTarget.id : '-'} / ${e.counterattacker ? '#' + e.counterattacker.id : '-'}`],
      ['명령 / 능력쿨', `${e.command ? e.command.kind : '-'} / ${(e.specialCooldown ?? 0).toFixed(1)}s`],
      ['상태변경 (10s)', `${t ? t.times.length : 0}회`],
      ['최근 전환', t && t.hist.length ? t.hist.slice(-4).join(' | ') : '-'],
    ];
    return '<table class="ai-detail">' + rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') + '</table>';
  }

  render() {
    const p = this.game.player;
    const list = this.ais().sort((a, b) => SORTS[this.sort](a, b, p, this)).slice(0, 20);
    const sel = this.game.entities.find((e) => e.id === this.selectedId && e.alive);
    this.root.querySelector('#ai-detail').innerHTML = sel
      ? this.detail(sel)
      : '<div class="hint">선택된 AI 없음 — 아래 행을 클릭하거나 화면의 AI를 Shift+클릭</div>';
    const head = '<div class="ai-row ai-th"><span>#</span><span>색</span><span>역할</span><span>성격</span><span>관계</span><span>state</span><span>HP</span><span>size</span><span>점수</span><span>chg</span></div>';
    this.root.querySelector('#ai-rows').innerHTML = head + list.map((e) => {
      const chg = this.recent(e);
      return `<div class="ai-row${e.id === this.selectedId ? ' sel' : ''}${chg >= 4 ? ' hot' : ''}" data-id="${e.id}">` +
        `<span>${e.id}${e.apex ? '★' : ''}</span><span><i class="dot" style="background:${e.colorHex}"></i></span>` +
        `<span>${e.role ?? '-'}</span><span>${e.personality ?? '-'}</span><span>${e.relationship ?? '-'}</span>` +
        `<span>${e.state}</span><span>${Math.round(e.hp / e.maxHp * 100)}</span><span>${Math.round(e.size)}</span>` +
        `<span>${Math.round(e.score)}</span><span>${chg}</span></div>`;
    }).join('');
  }
}
