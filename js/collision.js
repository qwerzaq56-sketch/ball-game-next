import {delta} from './topology.js';
// Distance / eating / hostility / absorption-eligibility predicates.
//
// v0.2 splits "consuming something smaller" into two distinct rules:
//   - Orbs (passive growth resources): color is irrelevant, only size matters, eaten instantly.
//   - Same-color Player/AI entities: size-hierarchy governed by the absorption system
//     (see absorption.js) which adds a resistance time instead of instant consumption.
// Different-color Player/AI entities are never consumable — only combat (attack) can remove them.

export function dist(a, b) {
  const d=delta(a,b);return Math.hypot(d.x,d.y);
}

export function circlesOverlap(a, b) {
  return dist(a, b) <= (a.size / 2 + b.size / 2);
}

// Passive orb pickup: color-independent, instant.
export function canEatOrb(eater, orb, balance) {
  if (!orb.alive || !eater.alive) return false;
  if (orb.behavior !== 'orb') return false;
  const minDiff = balance.growth.minEatSizeDifference ?? 0;
  return orb.size < eater.size - minDiff;
}

// Same-color entity hierarchy: eligible to START an absorption (still subject to resistance time).
export function canAbsorb(absorber, target) {
  if (!target.alive || !absorber.alive || target.summoned&&!target.summoned.absorbable || absorber.summoned) return false;
  if (target === absorber || absorber.companionGroup) return false;
  if (target.behavior !== 'ai' && target.behavior !== 'player') return false;
  if (target.color !== absorber.color || absorber.warTargets?.has(target)||target.warTargets?.has(absorber)) return false;
  if (target.beingAbsorbedByRef) return false; // already locked by another absorber
  return target.size < absorber.size;
}

// Different-color combatants (orbs are passive resources, never hostile).
export function isHostile(a, b) {
  if(a.behavior!=='orb'&&b.behavior!=='orb'&&(a.warTargets?.has(b)||b.warTargets?.has(a)))return true;
  if (a.color === b.color || a.companionGroup && a.companionGroup===b.companionGroup) return false;
  if (a.behavior === 'orb' || b.behavior === 'orb') return false;
  return true;
}
