import {scoreRanking, sizeRanking, durationLabel} from './presentation.js';
import {loadPresentationPreferences, savePresentationPreferences} from './storage.js';
import {Minimap} from './minimap.js';

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
    this.minimap=new Minimap(ui);
    this.rows = [];
    const list = document.getElementById('live-ranking-list');
    for (let i=0;i<10;i++) {
      const li = element('li'), button = element('button','rank-row');
      button.type = 'button';
      const rank = element('span','rank-number',i+1);
      const dot = element('span','rank-dot');
      const name = element('span','rank-name'),apex=element('span','rank-apex');
      const score = element('span','rank-score');
      const secondary = element('span','rank-secondary');
      const values = element('span','rank-values'); values.append(score,secondary);
      button.append(rank,dot,apex,name,values); li.append(button); list.append(li);
      button.addEventListener('click', () => this.ui.inspector?.select(Number(button.dataset.id)));
      this.rows.push({li,button,rank,dot,apex,name,score,secondary});
    }
    for (const mode of ['score','size']) {
      document.getElementById(`ranking-mode-${mode}`).addEventListener('click', () => {
        this.preferences.rankingMode=mode; savePresentationPreferences(this.preferences); this.apply(); this.lastUpdate=-Infinity;
      });
    }
    for (const key of ['names','ranking','ecology','minimap','shake']) {
      document.getElementById(`${key}-toggle`).addEventListener('click', () => this.toggle(key));
    }
    document.getElementById('ally-links-toggle').addEventListener('click',()=>this.toggle('allyLinks'));
    document.getElementById('ecology-close').addEventListener('click', () => this.toggle('ecology',false));
    window.addEventListener('keydown', e => {
      if (document.getElementById('player-setup').open) return;
      if (e.key === 'F4') {e.preventDefault(); if (!e.repeat) this.toggle('ecology');}
      if (e.key === 'F5') {e.preventDefault(); if (!e.repeat) this.toggle('minimap');}
    });
    document.getElementById('ranking-layout').addEventListener('click',()=>{const modes=['bar','compact','full'];this.preferences.rankingLayout=modes[(modes.indexOf(this.preferences.rankingLayout)+1)%3];savePresentationPreferences(this.preferences);this.apply();});
    document.getElementById('quick-map').addEventListener('click',()=>this.toggle('minimap'));
    document.getElementById('quick-ecology').addEventListener('click',()=>this.toggle('ecology'));
    document.getElementById('quick-ranking').addEventListener('click',()=>{this.ranking.classList.toggle('minimal-open');this.toggle('ranking',true);});
    document.getElementById('quick-balance').addEventListener('click',()=>{ui.debugVisible=!ui.debugVisible;ui.debugPanel.style.display=ui.debugVisible?'block':'none';});
    this.apply();
    this.lastUpdate = -Infinity;
  }
  toggle(key, value = !this.preferences[key]) {
    this.preferences[key] = value;
    savePresentationPreferences(this.preferences); this.apply(); this.lastUpdate = -Infinity;
  }
  apply() {
    this.ranking.dataset.layout=this.preferences.rankingLayout;document.getElementById('ranking-layout').textContent={bar:'바',compact:'축약',full:'풀'}[this.preferences.rankingLayout];
    this.ranking.hidden = !this.preferences.ranking;
    this.ecology.hidden = !this.preferences.ecology;
    this.minimap.root.hidden=!this.preferences.minimap;if(!this.preferences.minimap)this.minimap.expand(false);
    for (const mode of ['score','size']) document.getElementById(`ranking-mode-${mode}`).setAttribute('aria-pressed',String(this.preferences.rankingMode===mode));
    const labels = {names:'이름',ranking:'순위',ecology:'생태계',minimap:'지도',shake:'흔들림'};
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
      this.renderRankBadge(game);
      if (this.preferences.ranking) this.renderRanking(game);
      if (this.preferences.ecology) this.renderEcology(game);
      if (this.preferences.minimap) this.minimap.render(game);
      // In screen pixels: name labels reserve occupied panels, including existing debug UI.
      this.ui.overlayRects = ['hud','hud-top','toggle-tray','ability-bar','era-status','live-ranking','ecology-panel','debug-panel','ai-inspector','controls-hint','build-id','touch-stick','touch-dodge','touch-special','touch-ultimate','minimap-panel']
        .map(id=>document.getElementById(id)).filter(n=>n && n.getClientRects().length)
        .map(n=>n.getBoundingClientRect()).filter(r=>r.width && r.height)
        .map(r=>({left:r.left-4,top:r.top-4,right:r.right+4,bottom:r.bottom+4}));
    }
  }
  // R-VIS-010: the rank number in the top-right corner, in the ranking's current order (score or size).
  renderRankBadge(game) {
    const bySize=this.preferences.rankingMode==='size';
    const all = bySize ? sizeRanking(game.entities,game.ecology.sizeOrder) : scoreRanking(game.entities,game.ecology.scoreOrder);
    const rank = all.findIndex(e=>e===game.player)+1, badge=document.getElementById('quick-ranking');
    document.getElementById('rank-now').textContent = rank ? rank : '–';
    document.getElementById('rank-total').textContent = rank ? `/${all.length}` : '';
    badge.setAttribute('aria-label', rank ? `${bySize?'크기':'점수'} 순위 ${rank} / ${all.length}, 순위 목록 펼치기` : '순위 목록 펼치기');
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
      row.apex.textContent=e.apex?'★':'';row.apex.setAttribute('aria-label',e.apex?'최상위 포식자':'');row.name.textContent=e.displayName;
      row.score.textContent=(bySize ? Math.floor(e.size) : Math.round(e.score)).toLocaleString('ko-KR');
      row.secondary.textContent=bySize ? `점수 ${Math.round(e.score)}` : `크기 ${Math.floor(e.size)}`;
      row.dot.style.backgroundColor=e.colorHex;
    });
    for(let i=Math.min(10,all.length);i<10;i++)this.rows[i].li.hidden=true;
  }
  renderEcology(game) {
    const s=game.apexHistory.summary(game.gameTime);
    document.getElementById('ecology-era').textContent=`${game.era.status()} · ${game.era.cycle+1}주기 · 파멸 완료 ${game.era.completedApocalypses}`;
    document.getElementById('ecology-duels').textContent=`전쟁 ${game.entities.filter(e=>e.alive&&game.era.activeWar(e)).length}명 · 전선 이동 ${game.entities.filter(e=>e.alive&&e.behavior==='ai'&&e.state==='war_move').length} · 결투 ${game.era.duels.size}쌍 · 시작 ${game.era.duelStarts} / 종료 ${game.era.duelEnds}`;
    const duels=document.getElementById('duel-events');duels.replaceChildren();for(const d of game.era.recentDuels.slice(0,3))duels.append(element('li','apex-event',`${d.type==='start'?'결투 시작':'결투 종료'} · ${d.challengerName} → ${d.targetName}`));
    const units=game.entities.filter(e=>e.alive&&e.behavior!=='orb');
    const roles=document.getElementById('ecology-roles');roles.replaceChildren();
    for(const [key,label] of [['prey','프레이'],['forager','포레이저'],['predator','프레데터']]) {
      const count=units.filter(e=>e.role===key).length;
      const cell=element('div',`ecology-role ${key}`);
      cell.append(element('span','',label),element('strong','',`${count} · ${units.length?Math.round(count/units.length*100):0}%`));roles.append(cell);
    }
    const members=units.filter(e=>e.companionGroup).length;
    document.getElementById('ecology-companions').textContent=`동행 ${members} / ${units.length}개체 · ${game.allyLinks.groups.size}개 대열 · 진입 ${game.allyLinks.stats.joins} / 이탈 ${game.allyLinks.stats.leaves}`;
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
