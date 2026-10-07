// pt1-09 performance meter: a rolling window of frame timings, observation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {PerfMeter, percentile, perfLine, SLOW_FRAME_MS} from '../js/perfMeter.js';
import {random, resetRandom} from '../js/random.js';

test('perf meter keeps the last N frames and reports fps, percentiles and slow frames', () => {
  const m = new PerfMeter(10);
  for (let i = 0; i < 15; i++) m.record({interval: i < 13 ? 16 : 50, update: 1, render: i, ui: .5});
  const s = m.summary();
  assert.equal(s.frames, 10);
  assert.equal(s.slowFrames, 2);
  assert.ok(50 > SLOW_FRAME_MS);
  assert.equal(s.interval.max, 50);
  assert.equal(s.render.max, 14);
  assert.equal(s.fps, Math.round(1000 / ((8 * 16 + 2 * 50) / 10)));
  assert.equal(percentile([5, 1, 3], .5), 3);
  assert.equal(percentile([], .5), 0);
});

test('perf meter summary reads game context without touching game state or RNG', () => {
  const g = createGame(7), m = new PerfMeter();
  m.record({interval: 16, update: 2, render: 8, ui: 1});
  resetRandom(7); const expected = random('ai'); resetRandom(7);
  const before = JSON.stringify({x: g.player.x, hp: g.player.hp, t: g.gameTime});
  const s = m.summary(g);
  assert.equal(random('ai'), expected);
  assert.equal(JSON.stringify({x: g.player.x, hp: g.player.hp, t: g.gameTime}), before);
  assert.equal(s.context.entities, g.entities.filter((e) => e.alive).length);
  assert.match(perfLine(s), /^프레임 63fps · 간격 p95 16ms/);
});
