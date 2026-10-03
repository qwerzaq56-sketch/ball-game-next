export class DiagnosticsUI {
 constructor(game,ui,{requestSeedReset}={}){
  this.game=game;this.ui=ui;this.last=0;this.root=document.createElement('section');this.root.className='debug-section';this.root.id='observation-tools';
  this.root.innerHTML='<h3>자동 플레이 · 관찰</h3><label class="debug-row"><span>자동 플레이 (실험)</span><input id="autoplay-toggle" type="checkbox"></label><p id="autoplay-status" class="hint"></p><p class="hint">직접 이동/공격/터치하면 수동으로 돌아옵니다. Life와 피해는 일반 플레이 규칙을 따릅니다.</p><p id="run-metrics-summary"></p><canvas id="run-metrics-chart" width="280" height="90" aria-label="최근 플레이어와 가장 큰 AI의 크기 변화"></canvas><p class="hint">파랑: 내 크기 · 초록: 가장 큰 AI</p><button id="metrics-export" class="hud-btn" type="button">관찰 JSON 저장</button><p id="run-seed" class="hint"></p>';
  const phaseTable=document.createElement('div');phaseTable.id='phase-observation';this.root.insertBefore(phaseTable,this.root.querySelector('#metrics-export'));
  const seedControls=document.createElement('div');seedControls.innerHTML='<label class="debug-row"><span>재시작 시드</span><input id="run-seed-input" type="number" min="0" max="9007199254740991" step="1"></label><button id="seed-restart" class="hud-btn" type="button">이 시드로 재시작</button><p id="seed-reset-hint" class="hint" aria-live="polite">같은 시드로 시작 배치를 다시 살펴볼 수 있습니다.</p>';this.root.append(seedControls);
  this.seedInput=seedControls.querySelector('input');this.seedInput.value=String(game.seed);this.lastMetrics=game.runMetrics;
  const restart=seedControls.querySelector('button');restart.disabled=!requestSeedReset;
  restart.addEventListener('click',()=>{
   const seed=Number(this.seedInput.value),valid=this.seedInput.value.trim()!==''&&Number.isSafeInteger(seed)&&seed>=0;
   seedControls.querySelector('#seed-reset-hint').textContent=valid?'같은 시드로 시작 배치를 다시 살펴볼 수 있습니다.':'0 이상의 정수를 입력하세요.';
   if(valid)requestSeedReset?.(seed);
  });
  ui.debugPanel.firstElementChild.insertBefore(this.root,ui.debugPanel.firstElementChild.children[1]);this.toggle=this.root.querySelector('#autoplay-toggle');this.toggle.addEventListener('change',()=>{game.autoplay.setEnabled(this.toggle.checked);game.canvas.focus?.();});
  this.root.querySelector('#metrics-export').addEventListener('click',()=>{
   const json=JSON.stringify(game.runMetrics.export(game),null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`ball-next-${game.seed}-${Math.floor(game.gameTime)}s.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
 }
 update(){
  if(!this.ui.debugVisible)return;const now=performance.now();if(now-this.last<250)return;this.last=now;const g=this.game,m=g.runMetrics;
  if(this.lastMetrics!==m){this.lastMetrics=m;this.seedInput.value=String(g.seed);this.root.querySelector('#seed-reset-hint').textContent='같은 시드로 시작 배치를 다시 살펴볼 수 있습니다.';}
  this.toggle.checked=g.autoplay.enabled;this.root.querySelector('#autoplay-status').textContent=g.autoplay.enabled?`ON · ${g.gameOver?'게임 종료':g.paused?'일시정지':g.autoplay.reason}`:'OFF · 수동 플레이';
  const s=m.samples.at(-1);this.root.querySelector('#run-metrics-summary').textContent=`관찰 ${Math.floor(m.seconds)}s · 공격 시작 ${m.attackStarts} · ${s?.liveAI??g.entities.filter(e=>e.alive&&e.behavior==='ai').length} AI · 내 크기 ${Math.floor(g.player.size)} / 점수 ${g.player.score}`;
  this.root.querySelector('#run-seed').textContent=`시드 ${g.seed} · 최근 ${m.samples.length}개 샘플 · 자동 ${Math.floor(m.autoSeconds)}s`;
  const table=this.root.querySelector('#phase-observation');table.replaceChildren();
  const note=document.createElement('p');note.className='hint';note.textContent='시기별 직위 시간: 0명 / 1명 / 2–3명 · 상실 횟수';table.append(note);
  for(const [key,label]of [['abundance','영양기'],['competition','경쟁기'],['war','전쟁기'],['decline','쇠퇴기'],['off','시기 OFF']]){
   const stats=m.byPhase[key];if(!stats)continue;const row=document.createElement('p');row.className='hint';
   const percent=n=>stats.seconds?Math.round(n/stats.seconds*100):0;
   row.textContent=`${label} ${Math.floor(stats.seconds+1e-8)}s · ${['absent','solo','coexist'].map(k=>percent(stats.secondsByCount[k])+'%').join(' / ')} · 상실 ${stats.titleLosses}`;table.append(row);
  }
  this.drawChart(m.samples.slice(-60));
 }
 drawChart(samples){
  const canvas=this.root.querySelector('canvas'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#101827';ctx.fillRect(0,0,w,h);if(!samples.length)return;
  const maximum=Math.max(50,...samples.map(s=>Math.max(s.size,s.maxAISize))),first=samples[0].time,last=samples.at(-1).time;
  ctx.strokeStyle='#334155';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(30,8);ctx.lineTo(30,h-16);ctx.lineTo(w-6,h-16);ctx.stroke();ctx.font='10px system-ui';ctx.fillStyle='#94a3b8';ctx.fillText(String(Math.ceil(maximum)),2,12);ctx.fillText(`${Math.floor(last-first)}s`,w-30,h-3);
  for(const [key,color]of [['size','#60a5fa'],['maxAISize','#4ade80']]){ctx.beginPath();samples.forEach((s,i)=>{const x=30+(s.time-first)/Math.max(1,last-first)*(w-36),y=h-16-s[key]/maximum*(h-24);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();}
 }
}
