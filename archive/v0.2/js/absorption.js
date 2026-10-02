// v0.2: absorption system for same-color Player/AI hierarchy (spec §6-11).
// A bigger entity can absorb a smaller same-color entity, but not instantly — the target
// resists for a duration based on its own size and how close in size the two are. If the
// hierarchy flips mid-absorption (absorber dies, or the size gap closes), it cancels.

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

function cancelAbsorption(target) {
  target.beingAbsorbedByRef = null;
  target.absorptionProgress = 0;
  target.absorptionRequired = 0;
}

function completeAbsorption(absorber, target, game, balance) {
  const gained = target.behavior === 'orb' ? target.growthValue : target.growth;
  absorber.addGrowth(gained, balance);
  game.spawnAbsorptionParticles(target.x, target.y, target.colorHex);
  cancelAbsorption(target);

  if (target.behavior === 'player') {
    game.ui.showDefeatMessage('ABSORBED');
    game.respawnPlayer();
  } else {
    target.alive = false;
  }
}

// Advances every in-progress absorption: pulls the target toward its absorber, cancels if the
// size hierarchy flips or the absorber died, completes once the resistance time elapses.
export function updateAbsorptions(game, dt, balance) {
  for (const target of game.entities) {
    if (!target.alive || !target.beingAbsorbedByRef) continue;
    const absorber = target.beingAbsorbedByRef;

    if (!absorber.alive || target.size >= absorber.size) {
      cancelAbsorption(target);
      continue;
    }

    target.absorptionProgress += dt;
    const t = target.absorptionRequired > 0 ? Math.min(1, target.absorptionProgress / target.absorptionRequired) : 1;
    const pull = 0.06 + t * 0.2;
    target.x += (absorber.x - target.x) * pull;
    target.y += (absorber.y - target.y) * pull;

    if (target.absorptionProgress >= target.absorptionRequired) {
      completeAbsorption(absorber, target, game, balance);
    }
  }
}
