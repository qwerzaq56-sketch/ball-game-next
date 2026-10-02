import {scoreRanking, sizeRanking, durationLabel} from './presentation.js';
import {loadPresentationPreferences, savePresentationPreferences} from './storage.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export class EcologyUI {
  constructor(ui) {
    this.ui = ui;
    this.preferences = loadPresentationPreferences();
    ui.preferences = this.preferences;
    this.ranking = document.getElementById('live-ranking');
    this.ecology = document.getElementById('ecology-panel');
    this.rows = [];
    const list = document.getElementById('live-ranking-list');
    for (let i=0;i<10;i++) {
      const li = element('li'), button = element('button','rank-row');
      button.type = 'button';
      const rank = element('span','rank-number',i+1);
      const dot = element('span','rank-dot');
      const name = element('span','rank-name');
      const score = element('span','rank-score');
      const secondary = element('span','rank-secondary');
      const values = element('span','rank-values'); values.append(score,secondary);
      button.append(rank,dot,name,values); li.append(button); list.append(li);
      button.addEventListener('click', () => this.ui.inspector?.select(Number(button.dataset.id)));
      this.rows.push({li,button,rank,dot,name,score,secondary});
    }
    for (const mode of ['score','size']) {
      document.getElementById(`ranking-mode-${mode}`).addEventListener('click', () => {
        this.preferences.rankingMode=mode; savePresentationPreferences(this.preferences); this.apply(); this.lastUpdate=-Infinity;
      });
    }
    for (const key of ['names','ranking','ecology']) {
      document.getElementById(`${key}-toggle`).addEventListener('click', () => this.toggle(key));
    }
    document.getElementById('ally-links-toggle').addEventListener('click',()=>this.toggle('allyLinks'));
    document.getElementById('ecology-close').addEventListener('click', () => this.toggle('ecology',false));
    window.addEventListener('keydown', e => {
      if (document.getElementById('player-setup').open) return;
      if (e.key === 'F4') {e.preventDefault(); if (!e.repeat) this.toggle('ecology');}
    });
    this.apply();
    this.lastUpdate = -Infinity;
  }
  toggle(key, value = !this.preferences[key]) {
    this.preferences[key] = value;
    savePresentationPreferences(this.preferences); this.apply(); this.lastUpdate = -Infinity;
  }
  apply() {
    this.ranking.hidden = !this.preferences.ranking;
    this.ecology.hidden = !this.preferences.ecology;
    for (const mode of ['score','size']) document.getElementById(`ranking-mode-${mode}`).setAttribute('aria-pressed',String(this.preferences.rankingMode===mode));
    const labels = {names:'이름',ranking:'순위',ecology:'생태계'};
    for (const key of Object.keys(labels)) {
      const button = document.getElementById(`${key}-toggle`);
      button.textContent = `${labels[key]}: ${this.preferences[key] ? 'ON' : 'OFF'}`;
      button.setAttribute('aria-pressed', String(this.preferences[key]));
    }
    const links=document.getElementById('ally-links-toggle');
    links.textContent=`연결선: ${this.preferences.allyLinks?'ON':'OFF'}`;
    links.setAttribute('aria-pressed',String(this.preferences.allyLinks));
    if(this.ui.game)this.ui.game.showAllyLinks=this.preferences.allyLinks;
  }
  update(game) {
    game.showAllyLinks=this.preferences.allyLinks;
    const now = performance.now(), fresh = this.lastHistory !== game.apexHistory;
    const viewport = `${window.innerWidth}/${window.innerHeight}`;
    const resized = this.viewport !== viewport;
    this.viewport = viewport;
    if (fresh) {this.lastHistory=game.apexHistory;this.eventSignature='';}
    if (fresh || resized || now-this.lastUpdate>=250) {
      this.lastUpdate=now;
      if (this.preferences.ranking) this.renderRanking(game);
      if (this.preferences.ecology) this.renderEcology(game);
      // In screen pixels: name labels reserve occupied panels, including existing debug UI.
      this.ui.overlayRects = ['hud','live-ranking','ecology-panel','debug-panel','ai-inspector','controls-hint','build-id']
        .map(id=>document.getElementById(id)).filter(n=>n && n.getClientRects().length)
        .map(n=>n.getBoundingClientRect()).filter(r=>r.width && r.height)
        .map(r=>({left:r.left-4,top:r.top-4,right:r.right+4,bottom:r.bottom+4}));
    }
  }
  renderRanking(game) {
    const bySize=this.preferences.rankingMode==='size';
    const all = bySize ? sizeRanking(game.entities,game.ecology.sizeOrder) : scoreRanking(game.entities,game.ecology.scoreOrder);
    const playerRank = all.findIndex(e=>e===game.player)+1;
    document.getElementById('my-rank').textContent = playerRank ? `내 ${bySize?'크기':'점수'} 순위 ${playerRank} / ${all.length} · ${Math.floor(bySize ? game.player.size : game.score)}${bySize?'':'점'}` : '이번 런 종료';
    all.slice(0,10).forEach((e,i)=>{
      const row=this.rows[i]; row.li.hidden=false; row.button.dataset.id=e.id;
      row.button.classList.toggle('is-player',e===game.player);
      row.button.disabled=e.behavior!=='ai';
      row.button.title=e.behavior==='ai' ? `${e.displayName} · 크기 ${Math.round(e.size)} · F2 인스펙터가 열려 있을 때 클릭하여 살펴보기` : '플레이어';
      row.name.textContent=`${e.apex ? '★ ' : ''}${e.displayName}`;
      row.score.textContent=(bySize ? Math.floor(e.size) : Math.round(e.score)).toLocaleString('ko-KR');
      row.secondary.textContent=bySize ? `점수 ${Math.round(e.score)}` : `크기 ${Math.floor(e.size)}`;
      row.dot.style.backgroundColor=e.colorHex;
    });
    for(let i=Math.min(10,all.length);i<10;i++)this.rows[i].li.hidden=true;
  }
  renderEcology(game) {
    const s=game.apexHistory.summary(game.gameTime);
    document.getElementById('ecology-time').textContent=durationLabel(game.gameTime);
    document.getElementById('ecology-summary').textContent=`현재 ${s.current.length} · 획득 ${s.gains} · 상실 ${s.losses}`;
    const stats=document.getElementById('ecology-periods'); stats.replaceChildren();
    for(const [key,label] of [['absent','부재'],['solo','단독'],['coexist','공존']]) {
      const block=element('div','period'); block.append(element('span','',label),element('strong','',durationLabel(s.secondsByCount[key]))); stats.append(block);
    }
    document.getElementById('ecology-longest').textContent=`최장 보유 ${durationLabel(s.longestTenure)} · 최장 단독 ${durationLabel(s.longestSolo)}`;
    const current=document.getElementById('apex-current'); current.replaceChildren();
    for(const e of s.current.sort((a,b)=>a.since-b.since||a.id-b.id)) {
      const line=element('li','apex-holder'); const name=element('span','',`★ ${e.name}`); name.style.color=e.color;
      line.append(name,element('span','',durationLabel(e.seconds))); current.append(line);
    }
    if(!s.current.length)current.append(element('li','empty-note','아직 왕좌는 비어 있습니다.'));
    const signature=`${s.gains}/${s.losses}`;
    if(signature!==this.eventSignature) {
      this.eventSignature=signature;
      const events=document.getElementById('apex-events'); events.replaceChildren();
      for(const e of s.recent.slice(0,6)) {
        const line=element('li','apex-event');
        line.append(element('span','event-time',durationLabel(e.time)), element('span','',`${e.type==='gain'?'등장':'상실'} · ${e.name}${e.type==='loss'?' · '+durationLabel(e.seconds):''}`));
        events.append(line);
      }
      if(!s.recent.length)events.append(element('li','empty-note','새로운 포식자의 등장을 기다리는 중'));
    }
  }
}
