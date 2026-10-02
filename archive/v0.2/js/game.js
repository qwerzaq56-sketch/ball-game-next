import { Player } from './player.js';
import { AIEntity, updateAI } from './ai.js';
import { canEatOrb, canAbsorb, isHostile, circlesOverlap } from './collision.js';
import { updateAttack, updateDodge, canStartAttack, startAttack, canStartDodge, startDodge } from './combat.js';
import { spawnOrb, spawnAI, spawnDeathOrbs } from './spawning.js';
import { startAbsorption, updateAbsorptions } from './absorption.js';

const CELL_SIZE = 220;

export class Game {
  constructor(balance, canvas, input, ui) {
    this.balance = balance;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.ui = ui;

    this.player = new Player(balance);
    this.player.onSkillUnlock = (type) => this.ui.showUnlock(type);
    this.entities = [this.player];
    this.particles = [];
    this.grid = new Map();
    this.spawnTimer = 0;
    this.paused = false;

    this.camera = {
      x: this.player.x,
      y: this.player.y,
      zoom: balance.camera.baseZoom,
    };

    this.initWorld();
  }

  initWorld() {
    const b = this.balance;
    const safeRadius = 350; // keep AI from clustering right on top of the player's spawn point
    const px = this.player.x;
    const py = this.player.y;

    for (let i = 0; i < b.world.initialOrbCount; i++) this.entities.push(spawnOrb(b));

    const perColor = Math.max(1, Math.floor(b.ai.spawnCount / b.colors.length));
    for (const c of b.colors) {
      for (let i = 0; i < perColor; i++) {
        let pos = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = {
            x: Math.random() * b.world.worldWidth,
            y: Math.random() * b.world.worldHeight,
          };
          if (Math.hypot(candidate.x - px, candidate.y - py) >= safeRadius) {
            pos = candidate;
            break;
          }
        }
        this.entities.push(spawnAI(b, c, pos));
      }
    }
  }

  // ---------- spatial grid ----------

  buildGrid() {
    this.grid.clear();
    for (const e of this.entities) {
      if (!e.alive) continue;
      const cx = Math.floor(e.x / CELL_SIZE);
      const cy = Math.floor(e.y / CELL_SIZE);
      const key = cx + ',' + cy;
      let arr = this.grid.get(key);
      if (!arr) {
        arr = [];
        this.grid.set(key, arr);
      }
      arr.push(e);
    }
  }

  getNearbyEntities(entity, range) {
    const result = [];
    const minCx = Math.floor((entity.x - range) / CELL_SIZE);
    const maxCx = Math.floor((entity.x + range) / CELL_SIZE);
    const minCy = Math.floor((entity.y - range) / CELL_SIZE);
    const maxCy = Math.floor((entity.y + range) / CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const arr = this.grid.get(cx + ',' + cy);
        if (!arr) continue;
        for (const e of arr) if (e !== entity) result.push(e);
      }
    }
    return result;
  }

  hostileTargetsFor(entity) {
    const range = this.balance.attack.attackChargeSpeed * this.balance.attack.attackChargeDuration + entity.size + 40;
    return this.getNearbyEntities(entity, range).filter((o) => isHostile(entity, o));
  }

  // ---------- update ----------

  update(dt) {
    if (this.paused) return;
    const b = this.balance;

    this.buildGrid();
    this.updatePlayer(dt);

    for (const e of this.entities) {
      if (e.behavior === 'ai' && e.alive) updateAI(e, dt, this, b);
    }

    this.resolveConsumption();
    updateAbsorptions(this, dt, b);
    this.clampAllToWorld();
    this.updateCamera(dt);
    this.updateParticles(dt);
    this.spawnLoop(dt);
    this.cleanupDead();
  }

  updatePlayer(dt) {
    const b = this.balance;
    const p = this.player;
    const inp = this.input;

    updateAttack(p, dt, b, this.hostileTargetsFor(p), this);
    updateDodge(p, dt, b);

    // Held in an absorption grip: no player control until it resolves (spec v0.2 §6-11).
    if (p.beingAbsorbedByRef) return;

    const mouseWorld = this.screenToWorld(inp.mouseX, inp.mouseY);
    const aimAngle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);

    let dx = 0;
    let dy = 0;
    if (inp.keys.has('w') || inp.keys.has('arrowup')) dy -= 1;
    if (inp.keys.has('s') || inp.keys.has('arrowdown')) dy += 1;
    if (inp.keys.has('a') || inp.keys.has('arrowleft')) dx -= 1;
    if (inp.keys.has('d') || inp.keys.has('arrowright')) dx += 1;

    const moving = dx !== 0 || dy !== 0;
    const moveAngle = moving ? Math.atan2(dy, dx) : p.facing;

    if (p.attackState === 'READY' && p.dodgeState !== 'DODGING') {
      if (moving) {
        const len = Math.hypot(dx, dy);
        p.x += (dx / len) * p.moveSpeed * dt;
        p.y += (dy / len) * p.moveSpeed * dt;
      }
      p.facing = aimAngle;
    }

    if (inp.mouseDown && p.attackUnlocked && canStartAttack(p)) {
      startAttack(p, aimAngle, b);
    }
    if (inp.consumeDodge() && p.dodgeUnlocked && canStartDodge(p)) {
      startDodge(p, moveAngle, b);
    }
  }

  // v0.2: two separate consumption rules — instant color-independent orb pickup, and
  // same-color entity absorption (which only *starts* here; see absorption.js for resolution).
  resolveConsumption() {
    const b = this.balance;
    for (const eater of this.entities) {
      if (!eater.alive) continue;
      if (eater.behavior !== 'player' && eater.behavior !== 'ai') continue;
      if (eater.beingAbsorbedByRef) continue; // can't eat while being absorbed yourself

      const nearby = this.getNearbyEntities(eater, eater.size + 40);
      for (const target of nearby) {
        if (!target.alive) continue;

        if (target.behavior === 'orb') {
          if (!canEatOrb(eater, target, b)) continue;
          if (!circlesOverlap(eater, target)) continue;
          target.alive = false;
          eater.addGrowth(target.growthValue, b);
          this.spawnGrowthParticles(target.x, target.y, target.colorHex);
          continue;
        }

        if (canAbsorb(eater, target) && circlesOverlap(eater, target)) {
          startAbsorption(eater, target, b);
        }
      }
    }
  }

  clampAllToWorld() {
    const w = this.balance.world;
    for (const e of this.entities) {
      if (!e.alive) continue;
      const r = e.size / 2;
      e.x = Math.min(Math.max(e.x, r), w.worldWidth - r);
      e.y = Math.min(Math.max(e.y, r), w.worldHeight - r);
    }
  }

  updateCamera(dt) {
    const cfg = this.balance.camera;
    const w = this.balance.world;
    const p = this.player;

    const sizeGrowth = Math.max(0, p.size - p.baseSize);
    const targetZoom = Math.max(cfg.minZoom, cfg.baseZoom - sizeGrowth * cfg.zoomSizeFactor);

    const lerp = 1 - Math.pow(0.001, dt);
    this.camera.zoom += (targetZoom - this.camera.zoom) * lerp;
    this.camera.x += (p.x - this.camera.x) * lerp;
    this.camera.y += (p.y - this.camera.y) * lerp;

    const halfViewW = this.canvas.width / 2 / this.camera.zoom;
    const halfViewH = this.canvas.height / 2 / this.camera.zoom;
    this.camera.x = Math.min(Math.max(this.camera.x, halfViewW), Math.max(halfViewW, w.worldWidth - halfViewW));
    this.camera.y = Math.min(Math.max(this.camera.y, halfViewH), Math.max(halfViewH, w.worldHeight - halfViewH));
  }

  spawnLoop(dt) {
    const w = this.balance.world;
    this.spawnTimer -= dt;
    const orbCount = this.entities.reduce((n, e) => n + (e.alive && e.behavior === 'orb' ? 1 : 0), 0);
    if (this.spawnTimer <= 0) {
      this.spawnTimer = w.spawnInterval;
      if (orbCount < w.maxOrbCount) {
        this.entities.push(spawnOrb(this.balance));
      }
    }
  }

  cleanupDead() {
    if (this.entities.length > 2000) {
      this.entities = this.entities.filter((e) => e.alive || e.behavior === 'player');
      return;
    }
    if (Math.random() < 0.02) {
      this.entities = this.entities.filter((e) => e.alive || e.behavior === 'player');
    }
  }

  onEntityDeath(entity) {
    if (entity.behavior === 'player') {
      this.spawnDeathParticles(entity.x, entity.y, entity.colorHex);
      this.ui.showDefeatMessage('DEFEATED');
      this.respawnPlayer();
      return;
    }
    this.spawnDeathParticles(entity.x, entity.y, entity.colorHex);
    if (entity.behavior === 'ai') {
      const orbs = spawnDeathOrbs(entity, this.balance);
      this.entities.push(...orbs);
    }
  }

  respawnPlayer() {
    const p = this.player;
    const b = this.balance.player;
    p.x = this.balance.world.worldWidth / 2;
    p.y = this.balance.world.worldHeight / 2;
    p.growth = Math.floor(p.growth * 0.5);
    p.baseSize = b.startingSize;
    p.refreshFromGrowth(this.balance);
    p._recomputeSkillStage(this.balance, false);
    p.hp = p.maxHp;
    p.alive = true;
    p.attackState = 'READY';
    p.dodgeState = 'READY';
    p.invincible = false;
    p.beingAbsorbedByRef = null;
  }

  // ---------- particles ----------

  spawnHitParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.35, maxLife: 0.35, color, size: 3 + Math.random() * 2, type: 'spark',
      });
    }
  }

  spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 180;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.6, maxLife: 0.6, color, size: 3 + Math.random() * 4, type: 'burst',
      });
    }
  }

  spawnGrowthParticles(x, y, color) {
    this.particles.push({
      x, y, vx: 0, vy: -20, life: 0.4, maxLife: 0.4, color, size: 6, type: 'ring',
    });
  }

  spawnAbsorptionParticles(x, y, color) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 90;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.5, maxLife: 0.5, color, size: 2 + Math.random() * 3, type: 'spark',
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------- camera transforms ----------

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
      y: (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y: (wy - this.camera.y) * this.camera.zoom + this.canvas.height / 2,
    };
  }

  // ---------- render ----------

  render() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.fillStyle = '#11151c';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.drawGrid(ctx);
    this.drawWorldBorder(ctx);
    this.drawAbsorptionLinks(ctx);
    this.drawEntities(ctx);
    this.drawParticles(ctx);

    ctx.restore();
  }

  drawGrid(ctx) {
    const w = this.balance.world;
    const step = 200;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1 / this.camera.zoom;
    ctx.beginPath();
    for (let x = 0; x <= w.worldWidth; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, w.worldHeight);
    }
    for (let y = 0; y <= w.worldHeight; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w.worldWidth, y);
    }
    ctx.stroke();
  }

  drawWorldBorder(ctx) {
    const w = this.balance.world;
    ctx.strokeStyle = 'rgba(255,80,80,0.6)';
    ctx.lineWidth = 6 / this.camera.zoom;
    ctx.strokeRect(0, 0, w.worldWidth, w.worldHeight);
  }

  drawAbsorptionLinks(ctx) {
    for (const target of this.entities) {
      if (!target.alive || !target.beingAbsorbedByRef) continue;
      const absorber = target.beingAbsorbedByRef;
      const t = target.absorptionRequired > 0 ? Math.min(1, target.absorptionProgress / target.absorptionRequired) : 1;

      ctx.save();
      ctx.strokeStyle = this.withAlpha('#ffffff', 0.25 + t * 0.4);
      ctx.lineWidth = (2 + t * 3) / this.camera.zoom;
      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(absorber.x, absorber.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEntities(ctx) {
    const visible = this.entities
      .filter((e) => e.alive && this.isRoughlyVisible(e))
      .sort((a, b) => a.size - b.size);

    for (const e of visible) this.drawEntity(ctx, e);
  }

  isRoughlyVisible(e) {
    const halfW = this.canvas.width / 2 / this.camera.zoom + 100;
    const halfH = this.canvas.height / 2 / this.camera.zoom + 100;
    return Math.abs(e.x - this.camera.x) < halfW && Math.abs(e.y - this.camera.y) < halfH;
  }

  drawEntity(ctx, e) {
    const beingAbsorbed = !!e.beingAbsorbedByRef;
    const absorbT = beingAbsorbed && e.absorptionRequired > 0 ? Math.min(1, e.absorptionProgress / e.absorptionRequired) : (beingAbsorbed ? 1 : 0);
    const r = (e.size / 2) * (beingAbsorbed ? 1 - absorbT * 0.3 : 1);

    // dodge afterimages
    if (e.dodgeTrail.length) {
      for (let i = 0; i < e.dodgeTrail.length; i++) {
        const t = e.dodgeTrail[i];
        const alpha = ((i + 1) / e.dodgeTrail.length) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = this.withAlpha(e.colorHex, alpha);
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // charge afterimages
    if (e.attackState === 'CHARGING' && e.trail.length) {
      for (let i = 0; i < e.trail.length; i++) {
        const t = e.trail[i];
        const alpha = ((i + 1) / e.trail.length) * 0.3;
        ctx.beginPath();
        ctx.fillStyle = this.withAlpha('#ffffff', alpha);
        ctx.arc(t.x, t.y, r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // telegraph indicator
    if (e.attackState === 'TELEGRAPH') {
      const progress = e.attackTimer / this.balance.attack.attackTelegraphTime;
      const reach = e.currentAttackRange > 0 ? e.currentAttackRange * 0.5 : 40;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3 / this.camera.zoom;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.attackDir) * (r + reach), e.y + Math.sin(e.attackDir) * (r + reach));
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,60,60,0.9)';
      ctx.lineWidth = 4 / this.camera.zoom;
      ctx.arc(e.x, e.y, r + 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // shadow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.ellipse(e.x, e.y + r * 0.15, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.colorHex;
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.strokeStyle = e.behavior === 'player' ? '#ffffff' : (beingAbsorbed ? '#ffffff' : 'rgba(0,0,0,0.45)');
    ctx.stroke();

    if (beingAbsorbed) {
      // absorption progress ring, pulsing as it nears completion
      ctx.beginPath();
      ctx.strokeStyle = this.withAlpha('#ffffff', 0.5 + Math.sin(absorbT * Math.PI * 6) * 0.2);
      ctx.lineWidth = 3 / this.camera.zoom;
      ctx.arc(e.x, e.y, r + 8, -Math.PI / 2, -Math.PI / 2 + absorbT * Math.PI * 2);
      ctx.stroke();
    }

    if (e.invincible) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2 / this.camera.zoom;
      ctx.arc(e.x, e.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (e.fromDeath) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5 / this.camera.zoom;
      ctx.moveTo(e.x - r * 0.5, e.y);
      ctx.lineTo(e.x + r * 0.5, e.y);
      ctx.moveTo(e.x, e.y - r * 0.5);
      ctx.lineTo(e.x, e.y + r * 0.5);
      ctx.stroke();
    }

    // hp bar for AI / player
    if ((e.behavior === 'ai' || e.behavior === 'player') && e.hp < e.maxHp) {
      const barW = Math.max(24, r * 1.6);
      const barH = 5;
      const bx = e.x - barW / 2;
      const by = e.y - r - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = e.hp / e.maxHp > 0.3 ? '#4ade80' : '#f87171';
      ctx.fillRect(bx, by, barW * Math.max(0, e.hp / e.maxHp), barH);
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.fillStyle = this.withAlpha(p.color, alpha);
      if (p.type === 'ring') {
        ctx.arc(p.x, p.y, p.size * (1 - alpha) * 3 + p.size, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.withAlpha(p.color, alpha);
        ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  withAlpha(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
