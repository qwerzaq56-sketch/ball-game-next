import {SkillInfluenceUI} from './skillInfluenceUI.js';
import {BiomeObjectUI} from './biomeObjectUI.js?forest-composition-01';
// HUD rendering (DOM overlay) + live-editable Debug/Balance panel.

import {SkillTuningUI} from './skillTuningUI.js';
import { ERA_PHASES } from './era.js';
import { submitScore } from './storage.js';
import { EcologyUI } from './ecologyUI.js';
import { eraEventKind, eraEventText, shieldAmount } from './statusLabels.js';
import { COLOR_NAMES } from './tutorialCards.js';
import {nextSkillGoal} from './progression.js';


export class UI {
  constructor(balance, onBalanceChange) {
    this.balance = balance;
    this.onBalanceChange = onBalanceChange || (() => {});
    this.game = null; // set on the first update(dt, game) call — the checkbox handler below needs it

    this.hpFill = document.getElementById('hp-fill');
    this.hpShield = document.getElementById('hp-shield');
    this.hpShieldText = document.getElementById('hp-shield-text');
    this.hpNow = document.getElementById('hp-now');this.hpMax = document.getElementById('hp-max');
    this.growthText = document.getElementById('growth-text');
    this.sizeText = document.getElementById('size-text');
    this.killsText = document.getElementById('kills-text');
    this.scoreText = document.getElementById('score-text');
    this.lifeText = document.getElementById('life-text');
    this.starterGuide=document.getElementById('starter-guide');this.guideDismissed=false;document.getElementById('starter-guide-close').addEventListener('click',()=>{this.guideDismissed=true;this.starterGuide.hidden=true;});
    this.autoCompanionButton=document.getElementById('auto-companion');this.autoCompanionButton.addEventListener('click',()=>{if(this.game)this.game.allyLinks.setAutoOffer(!this.game.player.autoCompanionOffer);});
    this.absorbButton=document.getElementById('quick-absorb');this.absorbButton.addEventListener('click',()=>{if(this.game&&!this.game.paused&&!this.game.gameOver)this.game.input.absorbToggle=!this.game.input.absorbToggle;});
    this.allyAbsorbText = document.getElementById('ally-absorb-text');
    this.attackPips = document.getElementById('attack-pips');

    this.unlockBanner = document.getElementById('unlock-banner');
    this.unlockTimer = 0;

    this.defeatBanner = document.getElementById('defeat-banner');
    this.defeatTimer = 0;

    this.gameOverOverlay = document.getElementById('gameover-overlay');
    this.gameOverScore = document.getElementById('gameover-score');
    this.scoreboardList = document.getElementById('scoreboard-list');

    this.debugPanel = document.getElementById('debug-panel');
    this.debugVisible = false;
    this.buildDebugPanel();
    this.skillTuning=new SkillTuningUI(balance,this.debugPanel);this.objectTuning=new BiomeObjectUI(balance,this.debugPanel);this.skillInfluence=new SkillInfluenceUI(this,this.debugPanel);
    this.ecologyUI = new EcologyUI(this);
    document.getElementById('companion-invite').addEventListener('click',()=>{if(this.game&&!this.game.paused&&!this.game.gameOver){this.game.autoplay.setEnabled(false);this.game.allyLinks.offer(this.game.player);}});
    document.getElementById('companion-leave').addEventListener('click',()=>{if(this.game&&!this.game.paused&&this.game.player.companionGroup){this.game.autoplay.setEnabled(false);this.game.allyLinks.leave(this.game.player,'player-choice');}});

    window.addEventListener('keydown', (e) => {
      if (document.getElementById('player-setup').open) return;
      if (e.key === 'F1' && !e.repeat) {
        e.preventDefault();
        this.debugVisible = !this.debugVisible;
        this.debugPanel.style.display = this.debugVisible ? 'block' : 'none';
      }
      if (e.key === 'F3' && !e.repeat && this.game) {
        e.preventDefault();
        this.game.showAILabels = !this.game.showAILabels;
        if (this.aiLabelCheckbox) this.aiLabelCheckbox.checked = this.game.showAILabels;
      }
    });
  }

  showUnlock(type) {
    this.unlockBanner.textContent = type === 'attack' ? 'ATTACK UNLOCKED' : 'DODGE UNLOCKED';
    this.unlockBanner.style.opacity = '1';
    this.unlockTimer = 2.2;
  }

  showDefeatMessage(reason = 'DEFEATED') {
    this.defeatBanner.textContent = reason === 'ABSORBED' ? 'ABSORBED — RESPAWNING...' : 'DEFEATED — RESPAWNING...';
    this.defeatBanner.style.opacity = '1';
    this.defeatTimer = 2.0;
  }

  // v0.6 spec §14-15: submits the run's score to the local Top 10 (storage.js/localStorage),
  // renders the resulting board, and shows the Game Over overlay. Called once by main.js via
  // Game#onGameOver — never called directly by game.js, which only owns simulation state.
  showGameOver(score) {
    const top10 = submitScore(score);
    this.gameOverScore.textContent = `SCORE: ${Math.round(score)}`;
    this.scoreboardList.innerHTML = '';
    if (top10.length === 0) {
      const li = document.createElement('li');
      li.textContent = '(기록 없음)';
      this.scoreboardList.appendChild(li);
    } else {
      for (const entry of top10) {
        const li = document.createElement('li');
        li.textContent = String(entry.score).padStart(6, '0');
        this.scoreboardList.appendChild(li);
      }
    }
    this.gameOverOverlay.style.display = 'flex';
  }

  hideGameOver() {
    this.gameOverOverlay.style.display = 'none';
  }

  // v0.5 spec §23: HUD shows filled/empty pips (●/○) per stack instead of a LOCKED/READY label
  // + cooldown bar. LOCKED (maxStack 0) still reads as plain text.
  renderPips(container, stack, maxStack, lockedLabel = 'LOCKED') {
    if (maxStack <= 0) {
      container.textContent = lockedLabel;
      container.className = 'pips locked';
      return;
    }
    container.className = 'pips';
    container.textContent = '';
    for (let i = 0; i < maxStack; i++) {
      const span = document.createElement('span');
      span.className = i < stack ? 'pip filled' : 'pip';
      span.textContent = i < stack ? '●' : '○';
      container.appendChild(span);
    }
  }

  // v0.6: takes the whole Game instance now (was just `player`) so it can also read
  // lives/score/ally-absorption state, all of which live on Game, not Player/HUD-local state.
  updateEraBadge(game){
    const era=game.era,badge=document.getElementById('era-status');
    if(this.observedEra!==era){this.observedEra=era;this.lastEraPhase=era.phase.id;this.eraChangedAt=-Infinity;}
    if(this.lastEraPhase!==era.phase.id){this.lastEraPhase=era.phase.id;this.eraChangedAt=game.gameTime;}
    const index=ERA_PHASES.indexOf(era.phase),duration=era.phase.end-(ERA_PHASES[index-1]?.end??0),remaining=Math.max(0,Math.ceil(era.remaining));
    const time=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
    document.getElementById('era-phase-name').textContent=era.enabled?era.phase.name:'Era OFF';
    document.getElementById('era-countdown').textContent=era.enabled?time:'';
    document.getElementById('era-progress-fill').style.width=`${era.enabled?Math.max(0,Math.min(100,(1-era.remaining/duration)*100)):0}%`;
    badge.dataset.phase=era.enabled?era.phase.id:'off';
    badge.dataset.transition=String(era.enabled&&game.gameTime-this.eraChangedAt<3);
    const next=ERA_PHASES[(index+1)%ERA_PHASES.length].name;
    badge.title=era.enabled?`${era.cycle+1}번째 주기 · 다음 ${next} · 전환까지 ${time}`:'시대 시스템 OFF';
    badge.setAttribute('aria-label',era.enabled?`${era.phase.name}, ${time} 후 ${next}`:'시대 시스템 OFF');
    const event=document.getElementById('era-event'),text=era.enabled?eraEventText(game,this.eraChangedAt):'';
    event.hidden=!text;event.textContent=text;badge.dataset.event=text?eraEventKind(game,this.eraChangedAt):'';
  }

  // R-VIS-010: name, species and size on one line; lives as dots beside the HP number.
  updateIdentity(game){
    const player=game.player;
    document.getElementById('hud-name').textContent=player.displayName;
    document.getElementById('hud-color').style.backgroundColor=player.colorHex;
    document.getElementById('hud-sub').textContent=`${COLOR_NAMES[player.color]??player.color} · 크기 ${Math.floor(player.size)}`;
    const lives=Math.max(0,game.lives),max=Math.max(lives,game.balance.lives?.maxLives??3),box=document.getElementById('hud-lives'),key=`${lives}/${max}`;
    if(box.dataset.key!==key){box.dataset.key=key;box.replaceChildren(...Array.from({length:max},(_,i)=>{const dot=document.createElement('i');if(i>=lives)dot.className='lost';return dot;}));box.setAttribute('aria-label',`남은 목숨 ${lives} / ${max}`);}
  }

  update(dt, game) {
    this.skillInfluence.update(dt,game);
    this.ecologyUI.update(game);
    this.game = game; // debug-panel checkbox handlers read this
    const player = game.player;
    if(this.guideRun!==game.apexHistory){this.guideRun=game.apexHistory;this.guideDismissed=false;}
    this.starterGuide.hidden=this.guideDismissed||game.gameTime>20||document.getElementById('player-setup').open;
    document.getElementById('starter-guide-text').textContent=game.input.touchMode?'왼쪽 드래그 이동 · 오른쪽 드래그→떼기 공격 · 회피 버튼 · 흡수 ON/OFF · E/R 스킬':'WASD 이동 · 클릭 충전→떼기 · Space 짧게 회피 / 꾹 달리기 · E/R 스킬 · 흡수 토글 · ESC 일시정지';
    this.absorbButton.textContent=game.input.absorbToggle?'흡수 ON':'흡수 OFF';this.absorbButton.setAttribute('aria-pressed',String(!!game.input.absorbToggle));this.absorbButton.disabled=game.paused||game.gameOver;
    document.getElementById('player-identity').textContent = player.displayName;
    document.getElementById('region-text').textContent=game.biomes.status(player);
    const field=game.era.apocalypse;document.getElementById('era-text').textContent=game.era.status()+(field?field.active?' · 운석구 위험':' · 운석 낙하 전조':'');
    this.updateEraBadge(game);
    this.autoCompanionButton.textContent=player.autoCompanionOffer?'자동 동행 ON':'자동 동행 OFF';this.autoCompanionButton.setAttribute('aria-pressed',String(!!player.autoCompanionOffer));
    // R-CTRL-006: the sprint gauge always sits right under the HP bar; before sprint unlocks it shows an empty locked track.
    const sprintCapacity=game.balance.sprint?.capacitySeconds??3,sprintGauge=document.getElementById('sprint-gauge'),sprintUnlock=game.balance.sprint?.unlockSize??150,sprintLocked=player.size<sprintUnlock;
    sprintGauge.hidden=false;sprintGauge.title=sprintLocked?`달리기 게이지 · 크기 ${sprintUnlock}에서 해금`:'달리기 게이지';
    document.getElementById('sprint-fill').style.width=sprintLocked?'0%':`${Math.round(100*Math.max(0,Math.min(1,(player.sprintGauge??sprintCapacity)/sprintCapacity)))}%`;
    sprintGauge.dataset.state=sprintLocked?'locked':player.sprinting?'active':player.sprintExhausted?'exhausted':'ready';
    document.getElementById('play-time').textContent=`플레이 ${Math.floor(game.gameTime/60)}:${String(Math.floor(game.gameTime%60)).padStart(2,'0')}`;
    const invitation=document.getElementById('companion-invite'),wait=Math.ceil(Math.max(0,(player.inviteReadyAt??0)-game.gameTime));
    invitation.textContent=game.allyLinks.truceUntil>game.gameTime?`동행 · 축제 ${Math.ceil(game.allyLinks.truceUntil-game.gameTime)}s`:wait?`동행 제안 ${wait}s`:'동행 제안';invitation.disabled=game.paused||game.gameOver||wait>0||player.frozen>0||!!player.specialCast||player.attackState!=='READY'||player.dodgeState==='DODGING'||!!player.beingAbsorbedByRef;
    const neighbors=game.allyLinks.neighbors(player).length;
    const group=game.allyLinks.groups.get(player.companionGroup);
    const invite=game.abilities.invitePower(player,'damage'),defense=game.abilities.invitePower(player,'defense');
    document.getElementById('ally-link-status').textContent=`아군 연결 ${neighbors} · 공격 +${Math.round(game.allyLinks.bonus(player)*100)}%${group?` · ${group.members.size}명 대열 · ${({challenge:"도전형",opportunity:"기회형",avoidance:"회피형"})[game.allyLinks.personality(group)]}`:''}${invite?` · 동행 강화 ${player.inviteBuffs.length}중첩 · 공격 +${Math.round(invite*100)}% / 방어 +${Math.round(defense*100)}% / 재생 ${(game.abilities.inviteRegen(player)*100).toFixed(1)}%/s`:''}`;
    const leave=document.getElementById('companion-leave');leave.disabled=game.paused||!player.companionGroup;leave.hidden=!player.companionGroup;
    document.getElementById('ally-links-toggle').textContent=`연결선: ${game.showAllyLinks===false?'OFF':'ON'}`;
    document.getElementById('ally-links-toggle').setAttribute('aria-pressed',String(game.showAllyLinks!==false));
    // Shield HP is a grey segment inside the HP bar; the bar rescales when HP + shield exceeds max HP.
    const shield = shieldAmount(player, game.gameTime), hpTotal = Math.max(player.maxHp, player.hp + shield);
    this.hpFill.style.width = `${Math.max(0, player.hp / hpTotal) * 100}%`;
    this.hpShield.style.width = `${shield / hpTotal * 100}%`;
    this.hpNow.textContent = Math.ceil(player.hp);this.hpMax.textContent = ` / ${Math.ceil(player.maxHp)}`;
    this.hpShieldText.textContent = shield > 0 ? ` +${Math.ceil(shield)}` : '';
    this.updateIdentity(game);
    this.growthText.textContent = Math.floor(player.growth);
    this.sizeText.textContent = Math.floor(player.size);
    this.killsText.textContent = player.kills;
    this.scoreText.textContent = Math.round(game.score);
    this.lifeText.textContent = Math.max(0, game.lives);
    const names={cyan:'냉기 휘두르기',blue:'삼중 파도',green:'사기 진작',red:'사냥 지휘',yellow:'모래바람'};
    const special=document.getElementById('special-text');
    if(special)special.textContent=['E','R'].filter(slot=>game.abilities.unlocked(player,slot)).map(slot=>`${slot} ${game.abilities.skill(player,slot).name} · ${player.specialCast?.slot===slot?'시전 중':game.abilities.cooldown(player,slot)>0?Math.ceil(game.abilities.cooldown(player,slot))+'s':game.abilities.canCast(player,slot)?'준비':'행동 후 사용'}`).join(' / ');
    const roleText=document.getElementById("role-text");
    if(roleText)roleText.textContent=player.apex?"최상위 포식자":({prey:"프레이",forager:"포레이저",predator:"프레데터"})[player.role] ?? "";

    this.allyAbsorbText.textContent = player.allyAbsorptionEnabled ? 'ON' : 'OFF';
    this.allyAbsorbText.className = player.allyAbsorptionEnabled ? 'ally-on' : 'ally-off';
    // keep the debug-panel checkbox in sync (e.g. after a Full Reset, which always resets the
    // flag back to its default of ON — see player.js)
    if(this.aiLabelCheckbox)this.aiLabelCheckbox.checked=game.showAILabels;
    if (this.allyAbsorbCheckbox) this.allyAbsorbCheckbox.checked = player.allyAbsorptionEnabled;

    this.renderPips(this.attackPips, player.attackStack, player.attackMaxStack, `크기 ${game.balance.skills.attackStackThresholds.find(t=>t.maxStack>0)?.size} 해금`);
    const goal=nextSkillGoal(player,game.balance);
    document.getElementById('growth-goal-text').textContent=goal.label;
    document.getElementById('growth-goal-fill').style.width=`${goal.fraction*100}%`;
    const relicText=document.getElementById('relic-text');relicText.textContent=game.relics.label(player);relicText.hidden=!relicText.textContent;

    if (this.unlockTimer > 0) {
      this.unlockTimer -= dt;
      if (this.unlockTimer <= 0) this.unlockBanner.style.opacity = '0';
    }
    if (this.defeatTimer > 0) {
      this.defeatTimer -= dt;
      if (this.defeatTimer <= 0) this.defeatBanner.style.opacity = '0';
    }
  }

  buildDebugPanel() {
    const schema = [
      { label: 'Player', key: 'player', fields: [
        ['startingSize', 1], ['startingGrowth', 1], ['startingHp', 1], ['moveSpeed', 1], ['hpPerGrowth', 0.01], ['hpPerSize', 0.5],
      ] },
      { label: 'Growth', key: 'growth', fields: [
        ['growthToSizeRatio', 0.05], ['lateThreshold',5], ['lateTransition',5], ['lateMultiplier',.1], ['minEatSizeDifference', 1],
      ] },
      { label: 'Absorption', key: 'absorption', fields: [
        ['baseResistanceTime', 0.02], ['resistancePerSize', 0.005],
        ['baseMaintainDistance', 2], ['maintainDistancePerSize', 0.05],
        ['maxAbsorptionSpeed', 0.05], ['pullForce', 0.01],
      ] },
      // v0.6 §2-1: Defense moved here from its own top-level section — it's Size-driven combat
      // scaling like everything else in this section, not a separate subsystem. Charge duration
      // (§4-2) and knockbackForce also live here now.
      { label: 'Combat Scaling (Size 기준 전투력)', key: 'combatScaling', fields: [
        ['referenceSize', 1],
        ['baseAttackDamage', 1], ['attackDamagePerSize', 0.05],
        ['baseAttackRange', 2], ['attackRangeGrowthExponent', 0.05], ['chargeDistanceMultiplier', 0.05],
        ['attackChargeDurationBase', 0.01], ['attackChargeDurationPerSize', 0.0005],
        ['attackTelegraphTimeBase', 0.01], ['attackTelegraphTimePerSize', 0.0005],
        ['baseDefense', 1], ['defensePerSize', 0.05], ['minimumDamage', 1],
        ['knockbackForce', 5],
      ] },
      { label: 'Combat (Hit FX)', key: 'combat', fields: [
        ['knockbackDuration', 0.02], ['knockbackResistance', 0.1],
        ['hitFlashDuration', 0.01], ['hitParticleLifetime', 0.02],
      ] },
      { label: 'Health Regen', key: 'healthRegen', fields: [
        ['delay', 0.1], ['baseRate', 0.1], ['regenPerSize', 0.005],
      ] },
      { label: 'Attack', key: 'attack', fields: [
        ['attackCooldown', 0.1], ['attackRecoveryTime', 0.05],
      ] },
      // v0.6 §6: baseDistance/distanceGrowth replace the old exponential dodge-distance curve.
      { label: 'Dodge', key: 'dodge', fields: [
        ['dodgeDuration', 0.02], ['dodgeInvincibleTime', 0.02], ['dodgeCooldown', 0.1], ['effectLifetime', 0.02],
        ['baseDistance', 2], ['distanceGrowth', 0.02],
      ] },
      { label: 'AI', key: 'ai', fields: [
        ['hpPerSize', 0.5], ['movementSpeed', 5], ['detectionRange', 10],
        ['aggression', 0.05], ['fleeThreshold', 0.05],
        ['absorptionDetectionRange', 10], ['absorptionPriorityRatio', 0.05], ['highPriorityAbsorptionRatio', 0.05],
        ['attackCooldown', 0.1], ['absorptionAttemptChance', 0.05], ['lowHealthAttackChance', 0.05],
      ] },
      { label: 'Spawning', key: 'spawning', fields: [
        ['maxOrbCount', 10], ['orbSpawnInterval', 0.05], ['minimumOrbDensity',1], ['maximumReplenishBatch',1], ['naturalFoodGrowthMultiplier',.1],
        ['maxEnemyCount', 2], ['enemySpawnInterval', 0.1],
      ] },
      { label: 'Enemy Scaling (vs Player Size)', key: 'enemyScaling', fields: [
        ['baseEnemyMaxSize', 1], ['enemyMaxSizePerPlayerSize', 0.05],
      ] },
      // v0.6 §10-12: Death Orb section is gone — kill payoff is now `killReward`'s own orb
      // fields (a bigger kill drops noticeably more orbs, see spawning.js#spawnDeathOrbs), plus
      // the reduced direct-growth multiplier.
      { label: 'Kill Reward', key: 'killReward', fields: [
        ['baseReward', 1], ['referenceSize', 1], ['growthExponent', 0.05], ['growthRewardMultiplier', 0.05], ['retainedGrowthFraction',.05], ['growthPerSize',1],
        ['orbBaseCount', 1], ['orbPerEnemySize', 0.01], ['orbMaxCount', 1],
        ['orbSizeGrowthPerEnemySize', 0.01], ['orbSpreadBase', 1], ['orbSpreadMultiplier', 0.1],
      ] },
      { label: 'Enemy Size Distribution', key: 'enemySpawn', fields: [
        ['smallSizeRatio', 0.05], ['mediumSizeRatio', 0.05], ['largeSizeRatio', 0.05],
        ['smallSizeMin', 1], ['smallSizeMax', 1],
        ['mediumSizeMin', 1], ['mediumSizeMax', 1],
        ['largeSizeMin', 1], ['largeSizeMax', 1],
      ] },
      {label:'용암 저항',key:'biomes',fields:[['redLavaResistancePerSize',.0005],['maxRedLavaResistance',.05]]},
      { label: '플레이 평가 기준', key:'evaluation', fields:[['encounterSeconds',1],['minimumSizeGain',.1],['minimumGrowthRatio',.005],['clusterRadius',10]] },
      { label: 'Ecology', key: 'ecology', fields: [['maxApex', 1]] },
      { label: 'World', key: 'world', fields: [
        ['minOrbSize', 1], ['maxOrbSize', 1],
      ] },
      { label: 'Lives', key: 'lives', fields: [
        ['maxLives', 1],
      ] },
      { label: '부활', key: 'respawn', fields: [['invulnerableSeconds', .5], ['threatRadius', 50], ['hazardMargin', 20]] },
      { label: '한 판 지형 수 (다음 판부터)', key: 'biomes', fields: [['terrainsPerRound', 1]] },
      { label: 'Camera', key: 'camera', fields: [
        ['baseZoom', 0.05], ['zoomOutPerSize', 0.0005], ['maxZoomOut', 0.1],
      ] },
      { label: 'Audio', key: 'audio', fields: [
        ['masterVolume', 0.05], ['sfxVolume', 0.05], ['attackVolume', 0.05],
        ['damageVolume', 0.05], ['dodgeVolume', 0.05], ['deathVolume', 0.05],
      ] },
    ];

    const root = document.createElement('div');
    root.innerHTML = '<h2>DEBUG <span class="hint">(F1 to close)</span></h2>';

    // v0.6 follow-up: the ally-absorption toggle used to be a right-click gesture on the
    // canvas, easy to trigger by accident mid-fight. It now lives only here — a deliberate
    // action behind the debug panel — and defaults to ON every fresh run (see player.js).
    root.appendChild(this.buildGameplaySection());

    // v0.5 §22: Skill stack thresholds are a small array, not a flat scalar, so they get their
    // own hand-built section instead of the generic flat-key loop below.
    root.appendChild(this.buildSkillThresholdSection());

    for (const section of schema) {
      const box = document.createElement('div');
      box.className = 'debug-section';
      const h = document.createElement('h3');
      h.textContent = section.label;
      box.appendChild(h);

      for (const [field, step] of section.fields) {
        const row = document.createElement('label');
        row.className = 'debug-row';
        const span = document.createElement('span');
        span.textContent = field;
        const input = document.createElement('input');
        input.type = 'number';
        input.step = step;
        input.value = this.balance[section.key][field];
        if(section.key==='ecology'){input.min=0;input.max=50;span.textContent='최상위 포식자 최대 수';}
        const foodMultiplier=section.key==='spawning'&&field==='naturalFoodGrowthMultiplier';
        if(foodMultiplier){input.min=.1;input.max=10;span.textContent='자연 먹이 Growth 배율';input.addEventListener('change',()=>{input.value=this.balance.spawning.naturalFoodGrowthMultiplier;});}
        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          if (Number.isFinite(v)) {
            this.balance[section.key][field] = section.key==='ecology'?Math.max(0,Math.min(50,Math.floor(v))):foodMultiplier?Math.max(.1,Math.min(10,v)):v;
            if(section.key==='ecology'&&this.game)this.game.ecology.timer=0;
            this.onBalanceChange(section.key, field, v);
          }
        });
        row.appendChild(span);
        row.appendChild(input);
        box.appendChild(row);
      }
      root.appendChild(box);
    }

    this.debugPanel.appendChild(root);
  }

  buildGameplaySection() {
    const box = document.createElement('div');
    box.className = 'debug-section';
    const h = document.createElement('h3');
    h.textContent = 'Gameplay';
    box.appendChild(h);

    const row = document.createElement('label');
    row.className = 'debug-row';
    const span = document.createElement('span');
    span.textContent = 'Ally Absorption (아군 흡수)';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false; // matches Player's default (player.js)
    checkbox.addEventListener('change', () => {
      if(this.game)this.game.input.absorbToggle=checkbox.checked;
    });
    checkbox.title='흡수 버튼 토글 또는 PC 우클릭 유지';checkbox.disabled=false;
    this.allyAbsorbCheckbox = checkbox;
    row.appendChild(span);
    row.appendChild(checkbox);
    box.appendChild(row);

    const labelRow = document.createElement('label');
    labelRow.className = 'debug-row';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = 'AI 상태·성격 라벨 (F3)';
    const labelBox = document.createElement('input');
    labelBox.type = 'checkbox';
    labelBox.checked = false; // matches Game#showAILabels default
    labelBox.addEventListener('change', () => {
      if (this.game) this.game.showAILabels = labelBox.checked;
    });
    this.aiLabelCheckbox = labelBox;
    labelRow.appendChild(labelSpan);
    labelRow.appendChild(labelBox);
    box.appendChild(labelRow);
    return box;
  }

  buildSkillThresholdSection() {
    const box = document.createElement('div');
    box.className = 'debug-section';
    const h = document.createElement('h3');
    h.textContent = 'Skills (Size 기준 스택 해금)';
    box.appendChild(h);

    const rows = [
      ['Attack Unlock Size', this.balance.skills.attackStackThresholds, 0],
      ['Attack 2nd Stack Size', this.balance.skills.attackStackThresholds, 1],
      ['Dodge Unlock Size', this.balance.skills.dodgeStackThresholds, 0],
      ['Dodge 2nd Stack Size', this.balance.skills.dodgeStackThresholds, 1],
    ];
    for (const [label, list, index] of rows) {
      const row = document.createElement('label');
      row.className = 'debug-row';
      const span = document.createElement('span');
      span.textContent = label;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 1;
      input.value = list[index].size;
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        if (Number.isFinite(v)) {
          list[index].size = v;
          this.onBalanceChange('skills', label, v);
        }
      });
      row.appendChild(span);
      row.appendChild(input);
      box.appendChild(row);
    }
    return box;
  }
}
