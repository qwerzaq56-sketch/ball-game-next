// Behaviour metrics used by REQ-001 (before/after comparisons for AI tuning).
// Usage: node tools/behavior-metrics.mjs [seed=11] [seconds=300]
// The player is kept alive and idle so the run measures AI-vs-AI behaviour for the whole span.
import {createGame} from './headless.mjs';

const seed = Number(process.argv[2] ?? 11), seconds = Number(process.argv[3] ?? 300);
const g = createGame(seed), dt = 1 / 60, win = 30;
const buckets = Math.ceil(seconds / win);
const attacks = new Array(buckets).fill(0), aliveSum = new Array(buckets).fill(0), aliveN = new Array(buckets).fill(0);
const prev = new Map(), pairs = {}, perAI = new Map();
let apexSamples = 0, apexNotBiggest = 0;

for (let f = 0; f < seconds * 60; f++) {
  g.player.hp = g.player.maxHp; g.player.alive = true; g.gameOver = false;
  g.update(dt);
  const w = Math.min(buckets - 1, Math.floor(f / 60 / win));
  const ais = g.entities.filter(e => e.alive && e.behavior === 'ai');
  for (const e of ais) {
    const p = prev.get(e.id) ?? {atk: e.attackState, st: e.state};
    if (p.atk === 'READY' && e.attackState !== 'READY') attacks[w]++;
    let s = perAI.get(e.id);
    if (!s) { s = {changes: 0, first: f, last: f}; perAI.set(e.id, s); }
    s.last = f;
    if (p.st !== e.state) {
      pairs[p.st + '>' + e.state] = (pairs[p.st + '>' + e.state] ?? 0) + 1;
      s.changes++;
    }
    prev.set(e.id, {atk: e.attackState, st: e.state});
  }
  if (f % 60 === 0) {
    aliveSum[w] += ais.length; aliveN[w]++;
    const all = g.entities.filter(e => e.alive && e.behavior !== 'orb');
    const maxSize = Math.max(...all.map(e => e.size));
    for (const e of all.filter(e => e.apex)) { apexSamples++; if (e.size < maxSize - 0.01) apexNotBiggest++; }
  }
}

const rates = [...perAI.values()].map(s => ({secs: (s.last - s.first) / 60, c: s.changes})).filter(s => s.secs >= 20).map(s => s.c / s.secs).sort((a, b) => a - b);
const q = p => rates.length ? rates[Math.min(rates.length - 1, Math.floor(rates.length * p))].toFixed(2) : '-';
const top = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(JSON.stringify({
  seed, seconds,
  aiAttackStartsPer30s: attacks,
  avgAliveAIPer30s: aliveSum.map((a, i) => Math.round(a / Math.max(1, aliveN[i]))),
  stateChangesPerSec: {sampledAI: rates.length, p50: q(0.5), p90: q(0.9), max: q(1)},
  topTransitions: Object.fromEntries(top),
  searchFleeTotal: (pairs['search>flee'] ?? 0) + (pairs['flee>search'] ?? 0),
  apex: {samples: apexSamples, notBiggest: apexNotBiggest},
}, null, 1));
