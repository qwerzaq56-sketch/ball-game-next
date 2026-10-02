// Base entity used by orbs (incl. death-spawned orbs), AI balls and the player.
// v0.2: Size is the single unified stat driving edibility, skill stage, and combat range —
// see computeSkillStage() below and combatScaling in combat.js.
// v0.3: added knockback physics fields (see combat.js#updateKnockback).

let nextId = 1;

export function sizeFromGrowth(growth, baseSize, growthToSizeRatio) {
  return baseSize + Math.sqrt(Math.max(growth, 0)) * growthToSizeRatio;
}

// Skill Stage is derived purely from Size, identically for Player and AI (spec v0.2 §12-15).
// Stage 0: everything locked. Stage 1: attack unlocked. Stage 2: attack + dodge unlocked.
export function computeSkillStage(size, balance) {
  const s = balance.skills;
  if (size < s.attackUnlockSize) return 0;
  if (size < s.dodgeUnlockSize) return 1;
  return 2;
}

export class Entity {
  constructor({ x, y, size, color, colorHex, growthValue = 0, moveSpeed = 80, behavior = 'orb', hp = null, maxHp = null }) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.colorHex = colorHex;
    this.growthValue = growthValue;
    this.moveSpeed = moveSpeed;
    this.behavior = behavior; // 'orb' | 'ai' | 'player'
    this.maxHp = maxHp ?? size * 5;
    this.hp = hp ?? this.maxHp;
    this.alive = true;
    this.facing = 0;

    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;

    // shared attack state machine (see combat.js)
    this.attackState = 'READY'; // READY | TELEGRAPH | CHARGING | RECOVERY
    this.attackTimer = 0;
    this.attackCooldownTimer = 0;
    this.attackDir = 0;
    this.attackHitSet = new Set();
    this.trail = [];
    this.currentAttackRange = 0; // snapshotted from size when an attack starts

    // shared dodge state machine
    this.dodgeState = 'READY'; // READY | DODGING
    this.dodgeTimer = 0;
    this.dodgeCooldownTimer = 0;
    this.dodgeDir = 0;
    this.invincible = false;
    this.dodgeTrail = [];
    this.currentDodgeDistance = 0; // snapshotted from size when a dodge starts

    // shared absorption state (v0.2): set on the entity being absorbed, referencing its absorber
    this.beingAbsorbedByRef = null;
    this.absorptionProgress = 0;
    this.absorptionRequired = 0;
    // v0.4: wall-clock time since the grab started, regardless of distance — a safety net so a
    // stable tug-of-war (pull vs. flee speed) can't hang forever just outside escapeDistance
    // (see absorption.js).
    this.absorptionElapsed = 0;

    this.hitFlash = 0;
    this.skillStage = 0;
    this.attackUnlocked = false;
    this.dodgeUnlocked = false;

    // v0.3 knockback impulse (see combat.js#applyDamage / #updateKnockback)
    this.kx = 0;
    this.ky = 0;
    this.knockbackTimer = 0;
    this.knockbackDuration = 0;

    // v0.4: seconds since last taking damage (see combat.js#updateHealthRegen); starts high
    // so a fresh spawn can regen immediately rather than waiting out the delay once for no reason
    this.regenTimer = 999;
    // v0.4: brief "grew bigger" scale pulse played on a successful absorption (render-only)
    this.scalePulseTimer = 0;
  }
}
