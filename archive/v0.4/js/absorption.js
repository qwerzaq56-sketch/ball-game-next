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

// v0.4 spec §20-21: distinct start/success sounds, played only when the player is involved
// (either side) so a map full of AI-vs-AI absorptions doesn't turn into constant noise.
export function startAbsorption(absorber, target, balance, game) {
  target.beingAbsorbedByRef = absorber;
  target.absorptionProgress = 0;
  target.absorptionRequired = computeResistanceTime(absorber, target, balance);
  target.absorptionElapsed = 0;
  if (game && (absorber === game.player || target === game.player)) game.audio.absorbStart();
}

export function cancelAbsorption(target) {
  target.beingAbsorbedByRef = null;
  target.absorptionProgress = 0;
  target.absorptionRequired = 0;
  target.absorptionElapsed = 0;
}

function completeAbsorption(absorber, target, game, balance) {
  const gained = target.behavior === 'orb' ? target.growthValue : target.growth;
  absorber.addGrowth(gained, balance);
  game.spawnAbsorptionParticles(target.x, target.y, target.colorHex);
  absorber.scalePulseTimer = 0.3; // spec §23: short "grew bigger" scale pulse on the absorber
  if (absorber === game.player || target === game.player) game.audio.absorbSuccess();
  if (absorber === game.player) game.spawnFloatingText(absorber.x, absorber.y - absorber.size / 2 - 10, `+${Math.round(gained)} GROWTH`, '#93c5fd');
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

// v0.4 QA fix (round 1): at v0.3's flat pullForce, a target that immediately bolts on contact
// (which is exactly what ai.js now makes it do) reaches breakDistance within ~1-1.5s of "pure
// pursuit" lag almost regardless of the absorber's speed advantage — so absorption practically
// never completed against anything that fought back, even at a favorable size ratio. Below
// escapeDistance the pull stays exactly as gentle as v0.3 (still trivially escapable by simply
// walking away, see BALANCE_NOTES); beyond it, a stronger pull gives a faster or more
// size-favored absorber enough bite to reel a fleeing target back in before breakDistance.
//
// v0.4 QA fix (round 2): a flat "beyond escapeDistance" pull rate can settle into a stable
// tug-of-war — flee speed exactly balances pull speed at some distance strictly between
// escapeDistance and breakDistance — where the target neither completes nor escapes, just hangs
// there indefinitely (found empirically: it parked at ~88px and sat there for 4.5+ simulated
// seconds). Two independent fixes: the pull rate now *ramps up continuously* the further past
// escapeDistance the target gets (so it can't find a stable balance point — the pull keeps
// winning by a growing margin as it approaches breakDistance), and `absorptionElapsed` is a
// wall-clock timeout independent of distance that force-cancels any grab that still hasn't
// resolved after `cfg.maxGrabDuration` seconds, so no future parameter combination can hang
// forever again regardless of the exact pull curve.
const MAX_PULL_RATE = 0.9; // `1 - Math.pow(1 - rate, dt)` is only valid for rate < 1

function pullRateFor(d, cfg) {
  if (d <= cfg.escapeDistance) return cfg.pullForce;
  const span = Math.max(1, cfg.breakDistance - cfg.escapeDistance);
  const t = Math.min(1, (d - cfg.escapeDistance) / span);
  const ramped = cfg.pullForce + t * t * (MAX_PULL_RATE - cfg.pullForce); // quadratic ramp
  return Math.min(MAX_PULL_RATE, ramped);
}

// Advances every in-progress absorption: pulls the target toward its absorber (gently inside
// escapeDistance, ramping up hard the further it drags beyond that), cancels if the target
// breaks past breakDistance, the grab times out, the size hierarchy flips, or the absorber
// died; completes once resistance time elapses while inside escapeDistance.
export function updateAbsorptions(game, dt, balance) {
  const cfg = balance.absorption;
  for (const target of game.entities) {
    if (!target.alive || !target.beingAbsorbedByRef) continue;
    const absorber = target.beingAbsorbedByRef;

    if (!absorber.alive || target.size >= absorber.size) {
      cancelAbsorption(target);
      continue;
    }

    target.absorptionElapsed += dt;
    if (target.absorptionElapsed >= cfg.maxGrabDuration) {
      cancelAbsorption(target);
      continue;
    }

    const d = Math.hypot(target.x - absorber.x, target.y - absorber.y);
    if (d >= cfg.breakDistance) {
      cancelAbsorption(target);
      continue;
    }

    const pull = 1 - Math.pow(1 - pullRateFor(d, cfg), dt);
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
