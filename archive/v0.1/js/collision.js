// Distance / eating / hostility helper predicates shared by player, AI and game systems.

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function circlesOverlap(a, b) {
  return dist(a, b) <= (a.size / 2 + b.size / 2);
}

// Core "eat" rule: same color, and target strictly smaller (by an optional configurable margin).
export function canEat(eater, target, balance) {
  if (!target.alive || !eater.alive) return false;
  if (target === eater) return false;
  if (target.behavior === 'player') return false; // the player can never be eaten
  if (target.color !== eater.color) return false;
  const minDiff = balance.growth.minEatSizeDifference ?? 0;
  return target.size < eater.size - minDiff;
}

// Different-color combatants (orbs/fragments are passive resources, never hostile).
export function isHostile(a, b) {
  if (a.color === b.color) return false;
  if (a.isFragment || b.isFragment) return false;
  if (a.behavior === 'orb' || b.behavior === 'orb') return false;
  return true;
}
