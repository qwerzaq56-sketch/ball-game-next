import test from 'node:test';
import assert from 'node:assert/strict';
import {ApexMetrics} from '../tools/apex-metrics.mjs';
const unit = id => ({id, alive: true, behavior: 'ai', apex: true});
test('tracks absence, coexistence, succession and renewed tenure without changing units', () => {
  const m = new ApexMetrics(), a = Object.freeze(unit(1)), b = Object.freeze(unit(2));
  m.observe([], 2); m.observe([a], 3); m.observe([a,b], 4);
  m.observe([b], 5); m.observe([], 1); m.observe([a], 6);
  const s = m.summary();
  assert.equal(s.observedSeconds, 21); assert.equal(s.apexEntitySeconds, 22);
  assert.deepEqual(s.secondsByApexCount, {'0':3,'1':14,'2':4});
  assert.equal(s.distinctHolders, 2); assert.equal(s.titleGains, 3); assert.equal(s.titleLosses, 2);
  assert.deepEqual(s.tenures, [{id:1,seconds:7,ongoing:false},{id:2,seconds:9,ongoing:false},{id:1,seconds:6,ongoing:true}]);
  assert.deepEqual(s.soleHolderRuns, [{id:1,seconds:3,ongoing:false},{id:2,seconds:5,ongoing:false},{id:1,seconds:6,ongoing:true}]);
  assert.deepEqual(m.summary(), s); // Reporting does not close ongoing runs.
  m.observe([a], 1); assert.equal(m.summary().tenures.at(-1).seconds, 7);
});
test('dead units, orbs and non-title holders do not count; frame durations accumulate', () => {
  const m = new ApexMetrics();
  m.observe([{...unit(1),alive:false},{...unit(2),behavior:'orb'},{...unit(3),apex:false}], .25);
  m.observe([unit(4)], .5); m.observe([unit(5)], .25);
  const s = m.summary();
  assert.equal(s.observedSeconds, 1); assert.equal(s.apexEntitySeconds, .75);
  assert.deepEqual(s.soleHolderRuns, [{id:4,seconds:.5,ongoing:false},{id:5,seconds:.25,ongoing:true}]);
  assert.throws(() => m.observe([], 0));
});

test('observing real simulation leaves gameplay checkpoints and random streams unchanged', async () => {
  const {createGame} = await import('../tools/headless.mjs');
  const {random} = await import('../js/random.js');
  const run = observed => {
    const g = createGame(23), m = new ApexMetrics();
    for (let i = 0; i < 600; i++) {
      g.update(1/60);
      if (observed) m.observe(g.entities, 1/60);
    }
    return {snapshot: g.snapshot(), nextAI: random('ai'), nextWorld: random('world')};
  };
  assert.deepEqual(run(true), run(false));
});
