import {attachBalanceFeedback} from './balanceFeedback.js';
import {evaluationSummary} from './gameplayEvaluation.js';
import { observationCSV } from './observationCSV.js';
import { perfLine } from './perfMeter.js';
export class DiagnosticsUI {
 constructor(game,ui,{requestSeedReset,perfMeter}={}){
  this.game=game;this.ui=ui;this.last=0;this.perfMeter=perfMeter;this.root=document.createElement('section');this.root.className='debug-section';this.root.id='observation-tools';
  this.root.innerHTML='<h3>자동 플레이 · 관찰</h3><p id="perf-summary" class="hint">성능 측정 중…</p><button id="perf-copy" class="hud-btn" type="button">성능 기록 복사</button><span id="perf-copy-status" class="hint" aria-live="polite"></span><label class="debug-row"><span>자동 플레이 (실험)</span><input id="autoplay-toggle" type="checkbox"></label><p id="autoplay-status" class="hint"></p><p class="hint">직접 이동/공격/터치하면 수동으로 돌아옵니다. Life와 피해는 일반 플레이 규칙을 따릅니다.</p><p id="run-metrics-summary"></p><p id="evaluation-summary" class="hint"></p><p id="opportunity-channels" class="hint"></p><canvas id="run-metrics-chart" width="280" height="90" aria-label="최근 플레이어와 가장 큰 AI의 크기 변화"></canvas><p class="hint">파랑: 내 크기 · 초록: 가장 큰 AI</p><button id="metrics-export" class="hud-btn" type="button">관찰 JSON 저장</button><p id="run-seed" class="hint"></p>';
  attachBalanceFeedback(game,this.root);
  const skillTable=document.createElement('details');skillTable.innerHTML='<summary>종족별 E/R 사용과 결과</summary><p class="hint">피해는 스킬의 직접 타격만 집계합니다. 버프를 받은 일반 공격은 포함하지 않습니다.</p><div id="skill-observation"></div>';this.root.append(skillTable);
  const phaseTable=document.createElement('div');phaseTable.id='phase-observation';this.root.insertBefore(phaseTable,this.root.querySelector('#metrics-export'));
  this.csvButton=document.createElement('button');this.csvButton.id='metrics-csv-export';this.csvButton.className='hud-btn';this.csvButton.type='button';this.csvButton.textContent='최근 샘플 CSV 저장';this.csvButton.disabled=true;this.root.querySelector('#metrics-export').after(this.csvButton);
  const seedControls=document.createElement('div');seedControls.innerHTML='<label class="debug-row"><span>재시작 시드</span><input id="run-seed-input" type="number" min="0" max="9007199254740991" step="1"></label><button id="seed-restart" class="hud-btn" type="button">이 시드로 재시작</button><p id="seed-reset-hint" class="hint" aria-live="polite">같은 시드로 시작 배치를 다시 살펴볼 수 있습니다.</p>';this.root.append(seedControls);
  this.seedInput=seedControls.querySelector('input');this.seedInput.value=String(game.seed);this.lastMetrics=game.runMetrics;
  const restart=seedControls.querySelector('button');restart.disabled=!requestSeedReset;
  restart.addEventListener('click',()=>{
   const seed=Number(this.seedInput.value),valid=this.seedInput.value.trim()!==''&&Number.isSafeInteger(seed)&&seed>=0;
   seedControls.querySelector('#seed-reset-hint').textContent=valid?'같은 시드로 시작 배치를 다시 살펴볼 수 있습니다.':'0 이상의 정수를 입력하세요.';
   if(valid)requestSeedReset?.(seed);
  });
  ui.debugPanel.firstElementChild.insertBefore(this.root,ui.debugPanel.firstElementChild.children[1]);this.toggle=this.root.querySelector('#autoplay-toggle');this.toggle.addEventListener('change',()=>{game.autoplay.setEnabled(this.toggle.checked);game.canvas.focus?.();});
  this.root.querySelector('#metrics-export').addEventListener('click',()=>this.download(JSON.stringify(game.runMetrics.export(game),null,2),'json','application/json'));
  this.csvButton.addEventListener('click',()=>{if(game.runMetrics.samples.length)this.download(observationCSV(game),'csv','text/csv;charset=utf-8');});
  // pt1-09: paste this JSON with a lag report (performance master doc, P-xx cards).
  this.root.querySelector('#perf-copy').addEventListener('click',async()=>{
   const status=this.root.querySelector('#perf-copy-status'),text=JSON.stringify({...this.perfMeter?.summary(game),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight]},null,1);
   try{await navigator.clipboard.writeText(text);status.textContent=' 복사됨';}catch{status.textContent=' 복사 실패 — 콘솔에 출력';console.log(text);}
  });
 }
 download(text,extension,type){const g=this.game,url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=`ball-next-${g.seed}-${Math.floor(g.gameTime)}s.${extension}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 update(){
  if(!this.ui.debugVisible)return;const now=performance.now();if(now-this.last<250)return;this.last=now;const g=this.game,m=g.runMetrics;
  if(this.perfMeter)this.root.querySelector('#perf-summary').textContent=perfLine(this.perfMeter.summary(g));
  if(this.lastMetrics!==m){this.lastMetrics=m;this.seedInput.value=String(g.seed);this.root.querySelector('#seed-reset-hint').textContent='같은 시드로 시작 배치를 다시 살펴볼 수 있습니다.';}
  this.csvButton.disabled=!m.samples.length;
  this.toggle.checked=g.autoplay.enabled;this.root.querySelector('#autoplay-status').textContent=g.autoplay.enabled?`ON · ${g.gameOver?'게임 종료':g.paused?'일시정지':g.autoplay.reason}`:'OFF · 수동 플레이';
  const assessment=evaluationSummary(m.samples,g.balance.evaluation);this.root.querySelector('#evaluation-summary').textContent=`평가 기준 ${assessment.targetSeconds}s · 목적 탐색 ${assessment.qualifiedSeconds}s · 성장/위기 대기 평균 ${assessment.growth.meanSeconds?.toFixed(1)??'-'} / ${assessment.crisis.meanSeconds?.toFixed(1)??'-'}s · ${assessment.targetSeconds}초 구간 충족 ${assessment.growth.coverage===null?'-':Math.round(assessment.growth.coverage*100)+'%'} / ${assessment.crisis.coverage===null?'-':Math.round(assessment.crisis.coverage*100)+'%'} · 최장 공백 ${assessment.growth.longestDrySeconds.toFixed(1)} / ${assessment.crisis.longestDrySeconds.toFixed(1)}s`;
  const s=m.samples.at(-1);this.root.querySelector('#run-metrics-summary').textContent=`관찰 ${Math.floor(m.seconds)}s · 공격 시작 ${m.attackStarts} · ${s?.liveAI??g.entities.filter(e=>e.alive&&e.behavior==='ai').length} AI · 내 크기 ${Math.floor(g.player.size)} / 점수 ${g.player.score}`;
  this.root.querySelector('#run-seed').textContent=`시드 ${g.seed} · 최근 ${m.samples.length}개 샘플 · 자동 ${Math.floor(m.autoSeconds)}s`;
  const channels=s?.opportunityChannels,actual=s?.realizedGrowth;this.root.querySelector('#opportunity-channels').textContent=channels?`최근 잠재 기회: 먹이 ${channels.food?'있음':'없음'} · 흡수 ${channels.absorption?'있음':'없음'} · 사냥 ${channels.hunt?'있음':'없음'} / 전량 성공·회수 가정 최대 +${channels.potentialGain.toFixed(1)} Size · 최근 실제 성장 ${actual?.measured?`${actual.seconds.toFixed(0)}s +${actual.gain.toFixed(1)} (${actual.sufficient?'기준 충족':'기준 미달'})`:'관찰 구간 부족'}`:'아직 성장 기회 관찰이 없습니다.';
  const table=this.root.querySelector('#phase-observation');table.replaceChildren();
  const note=document.createElement('p');note.className='hint';note.textContent='시기별 직위 시간: 0명 / 1명 / 2명 이상 · 상실 횟수';table.append(note);
  for(const [key,label]of [['abundance','영양기'],['competition','경쟁기'],['war','전쟁기'],['decline','쇠퇴기'],['off','시기 OFF']]){
   const stats=m.byPhase[key];if(!stats)continue;const row=document.createElement('p');row.className='hint';
   const percent=n=>stats.seconds?Math.round(n/stats.seconds*100):0;
   row.textContent=`${label} ${Math.floor(stats.seconds+1e-8)}s · ${['absent','solo','coexist'].map(k=>percent(stats.secondsByCount[k])+'%').join(' / ')} · 상실 ${stats.titleLosses}`;table.append(row);
  }
  const skills=this.root.querySelector('#skill-observation');if(skills.parentElement.open){skills.replaceChildren();const totals=new Map();for(const row of g.abilities.metrics.export().rows){const key=`${row.type} ${row.color} ${row.slot} ${row.skill}`,total=totals.get(key)??{...row,starts:0,fires:0,cancelled:0,damage:0,hpRatio:0,recruits:0,summons:0,buffs:0,marks:0,instantFires:0,emptyInstantFires:0,escapedTargets:0,invalidatedTargets:0,invulnerableTargets:0,originTravel:0};for(const field of ['starts','fires','cancelled','damage','hpRatio','recruits','summons','buffs','marks','instantFires','emptyInstantFires','escapedTargets','invalidatedTargets','invulnerableTargets','originTravel'])total[field]+=row[field]??0;total.instantMeasured||=row.instantMeasured;totals.set(key,total);}for(const row of totals.values()){const p=document.createElement('p');p.className='hint';p.textContent=`${row.type==='player'?'나':'AI'} ${row.color} ${row.slot} · ${row.skill} · 시작/완료/취소 ${row.starts}/${row.fires}/${row.cancelled} · 피해 ${Math.round(row.damage)} (${(row.hpRatio*100).toFixed(1)}% 누적) · 모집 ${row.recruits} · 소환 ${row.summons} · 강화 ${row.buffs} · 표적 ${row.marks}`;if(row.instantMeasured)p.textContent+=` · 순간 범위 ${row.instantFires}회 중 대상 없음 ${row.emptyInstantFires} · 이탈 ${row.escapedTargets} · 상태변화 ${row.invalidatedTargets} · 무적 ${row.invulnerableTargets} · 원점 이동 평균 ${row.instantFires?(row.originTravel/row.instantFires).toFixed(1):'—'}`;skills.append(p);}if(!skills.children.length)skills.textContent='아직 스킬 사용 기록이 없습니다.';}

  this.drawChart(m.samples.slice(-60));
 }
 drawChart(samples){
  const canvas=this.root.querySelector('canvas'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#101827';ctx.fillRect(0,0,w,h);if(!samples.length)return;
  const maximum=Math.max(50,...samples.map(s=>Math.max(s.size,s.maxAISize))),first=samples[0].time,last=samples.at(-1).time;
  ctx.strokeStyle='#334155';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(30,8);ctx.lineTo(30,h-16);ctx.lineTo(w-6,h-16);ctx.stroke();ctx.font='10px system-ui';ctx.fillStyle='#94a3b8';ctx.fillText(String(Math.ceil(maximum)),2,12);ctx.fillText(`${Math.floor(last-first)}s`,w-30,h-3);
  for(const [key,color]of [['size','#60a5fa'],['maxAISize','#4ade80']]){ctx.beginPath();samples.forEach((s,i)=>{const x=30+(s.time-first)/Math.max(1,last-first)*(w-36),y=h-16-s[key]/maximum*(h-24);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();}
 }
}
