// R-CTRL-007 situational tips: once per device, one at a time, unlock tips first, stale situations dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {Tips, tipText, TIP_SHOW_SECONDS, TIP_GAP_SECONDS, TIP_STALE_SECONDS} from '../js/tips.js';

const setup = () => { const g = createGame(7); g.tips = new Tips(g); return g; };
const run = (tips, seconds, blocked = false) => { for (let t = 0; t < seconds; t += .1) tips.update(.1, blocked); };

test('R-CTRL-007 every tip id has a title and desktop/touch text, unlock E/R per species', () => {
  const g = setup();
  for (const id of ['attack-locked', 'unlock-attack', 'unlock-dodge', 'unlock-sprint', 'full-charge', 'same-color', 'companion-absorb', 'absorb-hit', 'heal-sources', 'regen', 'dodge', 'bigger-threat', 'blizzard', 'vent', 'meteor', 'unlock-E-red', 'unlock-R-cyan']) {
    const t = tipText(id, g);
    assert.ok(t?.title && t.text.desktop && t.text.touch, id);
  }
  assert.match(tipText('unlock-E-red', g).title, /^E 스킬 해금 · /);
  assert.equal(tipText('nope', g), null);
});

test('R-CTRL-007 a tip shows once, one at a time, unlock tips jump the queue, then a gap', () => {
  const g = setup(), tips = g.tips;
  tips.notice('absorb-hit'); tips.notice('unlock-dodge'); tips.update(.1);
  assert.equal(tips.current.id, 'unlock-dodge');
  run(tips, TIP_SHOW_SECONDS);
  assert.equal(tips.current, null);
  tips.notice('unlock-dodge'); // already seen
  run(tips, TIP_GAP_SECONDS + .2);
  assert.equal(tips.current, null, 'absorb-hit waited longer than the stale limit and was dropped');
  tips.notice('absorb-hit'); tips.update(.1);
  assert.equal(tips.current.id, 'absorb-hit');
  assert.deepEqual([...tips.seen].sort(), ['absorb-hit', 'unlock-dodge']);
});

test('R-CTRL-007 blocked tips wait (unlock tips keep), disable and reset', () => {
  const g = setup(), tips = g.tips;
  tips.notice('unlock-attack'); tips.notice('regen');
  run(tips, TIP_STALE_SECONDS + 1, true);
  assert.equal(tips.current, null);
  assert.deepEqual(tips.queue.map((q) => q.id), ['unlock-attack']);
  tips.update(.1); assert.equal(tips.current.id, 'unlock-attack');
  tips.disable(); tips.notice('dodge'); tips.update(.1);
  assert.equal(tips.current, null); assert.equal(tips.queue.length, 0);
  tips.reset(); assert.equal(tips.enabled, true); assert.equal(tips.seen.size, 0);
});

test('R-CTRL-007 state conditions: low HP, regen start, attack still locked after the start guide', () => {
  const g = setup(), tips = g.tips, p = g.player;
  p.hp = p.maxHp * .4; p.regenTimer = 0; tips.update(.1);
  assert.equal(tips.current.id, 'heal-sources');
  tips.dismiss(); run(tips, TIP_GAP_SECONDS);
  p.regenTimer = g.balance.healthRegen.delay + .2; tips.update(.1);
  assert.equal(tips.current.id, 'regen');
  tips.dismiss(); run(tips, TIP_GAP_SECONDS);
  p.attackUnlocked = false; g.gameTime = 25; p.hp = p.maxHp; tips.update(.1);
  assert.equal(tips.current.id, 'attack-locked');
});

test('R-CTRL-007 T13 the meteor tip shows while the meteor is still falling, not once the crater burns', () => {
  const g = setup(), tips = g.tips; tips.seen.add('attack-locked');
  g.gameTime = 480; g.era.update(0); tips.update(.1);
  assert.equal(tips.current.id, 'meteor');
  const late = setup(); late.tips.seen.add('attack-locked'); late.gameTime = 480; late.era.update(0); late.gameTime = late.era.apocalypse.activeAt; late.era.update(0); late.tips.update(.1);
  assert.notEqual(late.tips.current?.id, 'meteor');
});

const noticed = (g, id) => g.tips.queue.some((q) => q.id === id) || g.tips.current?.id === id;
test('R-CTRL-007 game events: locked attack input, then a weakly charged attack', () => {
  const g = setup(), p = g.player;
  p.size = 10; p._recomputeStacks(g.balance, false);
  g.input._attackQueued = {angle: 0, charge: 1}; g.update(1 / 60);
  assert.ok(noticed(g, 'attack-locked'));
  assert.ok(!noticed(g, 'full-charge'));
  p.size = 60; p._recomputeStacks(g.balance, false);
  g.input._attackQueued = {angle: 0, charge: .3}; g.update(1 / 60);
  assert.ok(noticed(g, 'full-charge'));
});
