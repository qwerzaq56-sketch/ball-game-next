import { Entity, sizeFromGrowth, computeSkillStage } from './entity.js';

export class Player extends Entity {
  constructor(balance) {
    const b = balance.player;
    const colorDef = balance.colors.find((c) => c.id === 'blue') || balance.colors[0];
    super({
      x: balance.world.worldWidth / 2,
      y: balance.world.worldHeight / 2,
      size: b.startingSize,
      color: colorDef.id,
      colorHex: colorDef.color,
      moveSpeed: b.moveSpeed,
      behavior: 'player',
      hp: b.startingHp,
      maxHp: b.startingHp,
    });
    this.baseSize = b.startingSize;
    this.growth = b.startingGrowth;
    this.onSkillUnlock = null; // set by Game to trigger the HUD banner
    this._recomputeSkillStage(balance, false);
  }

  addGrowth(amount, balance) {
    this.growth += amount;
    this.refreshFromGrowth(balance);
    this._recomputeSkillStage(balance, true);
  }

  refreshFromGrowth(balance) {
    const g = balance.growth;
    const p = balance.player;
    this.size = sizeFromGrowth(this.growth, this.baseSize, g.growthToSizeRatio);
    const newMaxHp = p.startingHp + this.growth * (p.hpPerGrowth ?? 0);
    this.hp = Math.min(this.hp + Math.max(0, newMaxHp - this.maxHp), newMaxHp);
    this.maxHp = newMaxHp;
  }

  // Size-driven Skill Stage, identical rule to AI (spec v0.2 §12-15).
  _recomputeSkillStage(balance, fireEvents) {
    const newStage = computeSkillStage(this.size, balance);
    if (newStage === this.skillStage) return;
    if (fireEvents && this.onSkillUnlock) {
      if (newStage >= 1 && this.skillStage < 1) this.onSkillUnlock('attack');
      if (newStage >= 2 && this.skillStage < 2) this.onSkillUnlock('dodge');
    }
    this.skillStage = newStage;
    this.attackUnlocked = newStage >= 1;
    this.dodgeUnlocked = newStage >= 2;
  }
}
