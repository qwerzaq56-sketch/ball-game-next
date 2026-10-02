// Absorption system for same-color Player/AI hierarchy (spec v0.2 §6-11, reworked in v0.3 §1).
//
// v0.3 QA fix: the original pull was a flat per-frame lerp (frame-rate dependent, and far too
// strong — it dragged the target in within a few hundred ms regardless of the target's own
// movement). It's now a proper dt-scaled exponential pull (`pullForce` = fraction closed per
// second) that's weak enough to out-walk, and the target keeps full control of its own
// movement/attack/dodge the whole time (see game.js#updatePlayer, ai.js#updateAI — neither
// freezes on beingAbsorbedByRef anymore). Progress only advances while within `escapeDistance`;
// pulling clear of `breakDistance` cancels the grab outright.

export function computeResistanceTime(absorber, target, balance) {
  const cfg = balance.absorption;
  const baseTime = cfg.baseResistanceTime + target.size * cfg.resistancePerSize;
  const sizeRatio = absorber.size / target.size;

  if (sizeRatio >= cfg.sizeRatioForInstantAbsorption) return 0;

  const fastFactor = 0.4; // resistance remaining at the "fast absorption" knee point
  let factor;
  if (sizeRatio >= cfg.sizeRatioForFastAbsorption) {
    const span = cfg.sizeRatioForInstantAbsorption - cfg.sizeRatioForFastAbsorption;
    const t = span > 0 ? (sizeRatio - cfg.sizeRatioForFastAbsorption) / span : 1;
    factor = fastFactor * (1 - t);
  } else {
    const span = cfg.sizeRatioForFastAbsorption - 1;
    const t = span > 0 ? Math.max(0, sizeRatio - 1) / span : 1;
    factor = 1 - t * (1 - fastFactor);
  }
  return Math.max(0, baseTime * factor);
}

export function startAbsorption(absorber, target, balance) {
  target.beingAbsorbedByRef = absorber;
  target.absorptionProgress = 0;
  target.absorptionRequired = computeResistanceTime(absorber, target, balance);
}

export function cancelAbsorption(target) {
  target.beingAbsorbedByRef = null;
  target.absorptionProgress = 0;
  target.absorptionRequired = 0;
}

function completeAbsorption(absorber, target, game, balance) {
  const gained = target.behavior === 'orb' ? target.growthValue : target.growth;
  absorber.addGrowth(gained, balance);
  game.spawnAbsorptionParticles(target.x, target.y, target.colorHex);
  game.audio.absorb();
  cancelAbsorption(target);

  if (target.behavior === 'player') {
    game.ui.showDefeatMessage('ABSORBED');
    game.respawnPlayer();
  } else {
    // spec §6-2: Kill Count only tracks the player's own attack finishing an enemy off,
    // not absorption — so no kills++ here even when the player is the absorber.
    target.alive = false;
  }
}

// Advances every in-progress absorption: gently pulls the target toward its absorber (weak
// enough to walk out of), cancels if the target breaks past breakDistance, the size hierarchy
// flips, or the absorber died; completes once resistance time elapses while inside
// escapeDistance.
export function updateAbsorptions(game, dt, balance) {
  const cfg = balance.absorption;
  for (const target of game.entities) {
    if (!target.alive || !target.beingAbsorbedByRef) continue;
    const absorber = target.beingAbsorbedByRef;

    if (!absorber.alive || target.size >= absorber.size) {
      cancelAbsorption(target);
      continue;
    }

    const d = Math.hypot(target.x - absorber.x, target.y - absorber.y);
    if (d >= cfg.breakDistance) {
      cancelAbsorption(target);
      continue;
    }

    const pull = 1 - Math.pow(1 - cfg.pullForce, dt);
    target.x += (absorber.x - target.x) * pull;
    target.y += (absorber.y - target.y) * pull;

    if (d <= cfg.escapeDistance) {
      target.absorptionProgress += dt;
    }

    if (target.absorptionProgress >= target.absorptionRequired) {
      completeAbsorption(absorber, target, game, balance);
    }
  }
}
