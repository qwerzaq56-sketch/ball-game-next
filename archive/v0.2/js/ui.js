// HUD rendering (DOM overlay) + live-editable Debug/Balance panel.

const SKILL_STAGE_LABELS = ['STAGE 0', 'STAGE 1', 'STAGE 2'];

export class UI {
  constructor(balance, onBalanceChange) {
    this.balance = balance;
    this.onBalanceChange = onBalanceChange || (() => {});

    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.growthText = document.getElementById('growth-text');
    this.sizeText = document.getElementById('size-text');
    this.stageText = document.getElementById('stage-text');
    this.attackStatus = document.getElementById('attack-status');
    this.dodgeStatus = document.getElementById('dodge-status');
    this.attackCooldownBar = document.getElementById('attack-cooldown-fill');
    this.dodgeCooldownBar = document.getElementById('dodge-cooldown-fill');

    this.unlockBanner = document.getElementById('unlock-banner');
    this.unlockTimer = 0;

    this.defeatBanner = document.getElementById('defeat-banner');
    this.defeatTimer = 0;

    this.debugPanel = document.getElementById('debug-panel');
    this.debugVisible = false;
    this.buildDebugPanel();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        this.debugVisible = !this.debugVisible;
        this.debugPanel.style.display = this.debugVisible ? 'block' : 'none';
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

  update(dt, player) {
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    this.hpFill.style.width = `${hpRatio * 100}%`;
    this.hpText.textContent = `${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`;
    this.growthText.textContent = Math.floor(player.growth);
    this.sizeText.textContent = Math.floor(player.size);
    this.stageText.textContent = SKILL_STAGE_LABELS[player.skillStage] ?? player.skillStage;

    const attackReady = player.attackState === 'READY' && player.attackCooldownTimer <= 0;
    this.attackStatus.textContent = !player.attackUnlocked ? 'LOCKED' : (attackReady ? 'READY' : '...');
    this.attackStatus.className = 'status ' + (!player.attackUnlocked ? 'locked' : (attackReady ? 'ready' : 'cooling'));

    const dodgeReady = player.dodgeState === 'READY' && player.dodgeCooldownTimer <= 0;
    this.dodgeStatus.textContent = !player.dodgeUnlocked ? 'LOCKED' : (dodgeReady ? 'READY' : '...');
    this.dodgeStatus.className = 'status ' + (!player.dodgeUnlocked ? 'locked' : (dodgeReady ? 'ready' : 'cooling'));

    const atkCd = this.balance.attack.attackCooldown;
    const dodgeCd = this.balance.dodge.dodgeCooldown;
    this.attackCooldownBar.style.width = `${(1 - Math.min(1, Math.max(0, player.attackCooldownTimer) / atkCd)) * 100}%`;
    this.dodgeCooldownBar.style.width = `${(1 - Math.min(1, Math.max(0, player.dodgeCooldownTimer) / dodgeCd)) * 100}%`;

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
        ['startingSize', 1], ['startingGrowth', 1], ['startingHp', 1], ['moveSpeed', 1], ['hpPerGrowth', 0.01],
      ] },
      { label: 'Growth', key: 'growth', fields: [
        ['growthToSizeRatio', 0.05], ['minEatSizeDifference', 1],
      ] },
      { label: 'Skills (Size 기준 해금)', key: 'skills', fields: [
        ['attackUnlockSize', 1], ['dodgeUnlockSize', 1],
      ] },
      { label: 'Absorption', key: 'absorption', fields: [
        ['baseResistanceTime', 0.05], ['resistancePerSize', 0.01],
        ['sizeRatioForFastAbsorption', 0.1], ['sizeRatioForInstantAbsorption', 0.1],
      ] },
      { label: 'Combat Scaling', key: 'combatScaling', fields: [
        ['referenceSize', 1], ['baseAttackRange', 2], ['attackRangePerSize', 0.05],
        ['baseDodgeDistance', 2], ['dodgeDistancePerSize', 0.05],
      ] },
      { label: 'Attack', key: 'attack', fields: [
        ['attackDamage', 1], ['attackTelegraphTime', 0.02], ['attackChargeSpeed', 10],
        ['attackChargeDuration', 0.02], ['attackCooldown', 0.1], ['attackRecoveryTime', 0.05],
      ] },
      { label: 'Dodge', key: 'dodge', fields: [
        ['dodgeDuration', 0.02], ['dodgeInvincibleTime', 0.02], ['dodgeCooldown', 0.1],
      ] },
      { label: 'AI', key: 'ai', fields: [
        ['spawnCount', 1], ['movementSpeed', 5], ['detectionRange', 10],
        ['attackCooldown', 0.1], ['aggression', 0.05], ['fleeThreshold', 0.05],
      ] },
      { label: 'World', key: 'world', fields: [
        ['spawnInterval', 0.1], ['maxOrbCount', 5], ['minOrbSize', 1], ['maxOrbSize', 1],
      ] },
      { label: 'Death Orb', key: 'deathOrb', fields: [
        ['deathOrbCount', 1], ['deathOrbGrowthValue', 1], ['deathOrbSize', 1],
      ] },
    ];

    const root = document.createElement('div');
    root.innerHTML = '<h2>DEBUG <span class="hint">(F1 to close)</span></h2>';

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
        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          if (!Number.isNaN(v)) {
            this.balance[section.key][field] = v;
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
}
