import { Entity, sizeFromGrowth } from './entity.js';

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
    this.attackUnlocked = false;
    this.dodgeUnlocked = false;
  }

  addGrowth(amount, balance) {
    this.growth += amount;
    this.refreshFromGrowth(balance);
  }

  refreshFromGrowth(balance) {
    const g = balance.growth;
    const p = balance.player;
    this.size = sizeFromGrowth(this.growth, this.baseSize, g.growthToSizeRatio);
    const newMaxHp = p.startingHp + this.growth * (p.hpPerGrowth ?? 0);
    this.hp = Math.min(this.hp + Math.max(0, newMaxHp - this.maxHp), newMaxHp);
    this.maxHp = newMaxHp;
  }

  checkUnlocks(balance, onUnlock) {
    if (!this.attackUnlocked && this.growth >= balance.unlock.attackUnlockGrowth) {
      this.attackUnlocked = true;
      onUnlock('attack');
    }
    if (!this.dodgeUnlocked && this.growth >= balance.unlock.dodgeUnlockGrowth) {
      this.dodgeUnlocked = true;
      onUnlock('dodge');
    }
  }
}
