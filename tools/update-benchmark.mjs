// Performance master P-UPD-01: game.update cost per frame, headless (no rendering), by game phase and player size.
// node tools/update-benchmark.mjs [seconds=20] — prints p50/p95/max ms and live unit/orb counts.
import {createGame} from './headless.mjs';
import {growthFromSize} from '../js/entity.js';
import {percentile} from '../js/perfMeter.js';

const seconds = Number(process.argv[2] ?? 20), dt = 1 / 60;
const rows = [];
for (const [label, startAt, size] of [['start', 0, null], ['competition', 200, null], ['war', 420, null], ['decline', 520, null], ['war, size 400', 420, 400]]) {
  const g = createGame(23), p = g.player, b = g.balance;
  // Fast-forward the world to the phase without timing it.
  for (let t = 0; t < startAt; t += .1) { g.update(.1); p.hp = p.maxHp; p.alive = true; g.lives = b.lives.maxLives; g.gameOver = false; }
  if (size) { p.growth = growthFromSize(size, b.player.startingSize, b.growth.growthToSizeRatio ?? b.growth.ratio, b.growth); p.refreshFromGrowth(b); }
  const times = [];
  for (let i = 0; i < seconds * 60; i++) {
    p.hp = p.maxHp; p.alive = true; g.lives = b.lives.maxLives; g.gameOver = false;
    const t0 = performance.now(); g.update(dt); times.push(performance.now() - t0);
  }
  const alive = g.entities.filter((e) => e.alive);
  const units = alive.filter((e) => e.behavior === 'ai' || e === p).length;
  rows.push({scene: label, gameTime: Math.round(g.gameTime), units, orbs: alive.length - units,
    p50Ms: +percentile(times, .5).toFixed(2), p95Ms: +percentile(times, .95).toFixed(2), maxMs: +Math.max(...times).toFixed(2)});
}
console.log(JSON.stringify({note: 'headless node, update only (no render); budget for 60 fps is 16.7 ms per frame in total', seconds, rows}, null, 2));
