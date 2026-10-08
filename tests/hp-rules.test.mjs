import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {AIEntity} from '../js/ai.js';
import {aiMaxHp, playerMaxHp, growthFromSize} from '../js/entity.js';
import {applyDamage, hpDefenseScale} from '../js/combat.js';
import {statsAt} from '../tools/stats-by-size.mjs';

test('player and AI share the size × hpPerSize HP rule from the balance config', () => {
  const g = createGame(1), b = g.balance, p = g.player;
  assert.equal(aiMaxHp(470, b), 470 * b.ai.hpPerSize);
  p.addGrowth(growthFromSize(200, p.baseSize, b.growth.growthToSizeRatio, b.growth), b);
  assert(Math.abs(p.maxHp - p.size * b.player.hpPerSize) < 1e-8);
  const a = new AIEntity({balance: b, x: 0, y: 0, startSize: 40, color: 'red', colorHex: '#f00'});
  assert.equal(a.maxHp, 40 * b.ai.hpPerSize);
  a.addGrowth(500, b);
  assert(Math.abs(a.maxHp - a.size * b.ai.hpPerSize) < 1e-8);
});

test('player hpPerSize 0 falls back to the growth rule and keeps defense scale 1', () => {
  const b = createGame(1).balance;
  b.player.hpPerSize = 0;
  assert.equal(playerMaxHp(52, 400, b), b.player.startingHp + 400 * b.player.hpPerGrowth);
  assert.equal(hpDefenseScale({behavior: 'player'}, b), 1);
  b.ai.hpPerSize = 5;
  assert.equal(hpDefenseScale({behavior: 'ai'}, b), 1);
});

test('fraction-of-max-HP field damage loses the same fraction under size×5 and size×10 rules', () => {
  const lost = (perSize) => {
    const g = createGame(1), b = g.balance;
    b.ai.hpPerSize = perSize;
    const t = new AIEntity({balance: b, x: 0, y: 0, startSize: 100, color: 'red', colorHex: '#f00'});
    applyDamage(t, t.maxHp * .2, null, null, b, {kind: 'field', knockback: false, defenseScale: hpDefenseScale(t, b)});
    return 1 - t.hp / t.maxHp;
  };
  assert(Math.abs(lost(5) - lost(10)) < 1e-9);
  assert(Math.abs(lost(10) - .1) < 1e-9);
});

test('stats table gives equal player/AI HP and same-size full-charge share under the shared rule', () => {
  const s = statsAt(500);
  assert.equal(s.playerMaxHp, s.aiMaxHp);
  assert.equal(s.fullHitPctOfPlayer, s.fullHitPctOfAi);
  assert.equal(s.hitsToKillPlayer, 11);
});
