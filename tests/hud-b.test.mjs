// R-VIS-010: the quiet HUD's ability rings read charges and cooldowns without changing the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {abilityRing} from '../js/hudB.js';

const ATTACK = {kind: 'attack', name: '공격', key: '좌클릭'};
const DODGE = {kind: 'dodge', name: '회피', key: 'Space'};
const E = {kind: 'special', slot: 'E', key: 'E'};
const R = {kind: 'ultimate', slot: 'R', key: 'R'};

test('R-VIS-010 locked rings show the unlock hint and no charges', () => {
  const game = createGame(3);
  const ring = abilityRing(game, ATTACK);
  assert.equal(ring.state, 'locked');
  assert.equal(ring.fill, 0);
  assert.equal(ring.dots, null);
  assert.match(ring.name, /크기 \d+ 공격 해금/);
  assert.match(abilityRing(game, E).name, /E 해금/);
  assert.equal(abilityRing(game, R).state, 'locked');
});

test('R-VIS-010 charge rings count stacks and fill toward the next charge', () => {
  const game = createGame(3), p = game.player;
  p.size = 80; p.attackUnlocked = p.dodgeUnlocked = true;
  p.attackStack = 1; p.attackMaxStack = 3; p.attackStackTimer = game.balance.attack.attackCooldown * .5;
  p.dodgeStack = p.dodgeMaxStack = 2;
  const before = JSON.stringify(game.snapshot());
  const attack = abilityRing(game, ATTACK), dodge = abilityRing(game, DODGE);
  assert.deepEqual(attack.dots, {count: 1, max: 3});
  assert.equal(attack.label, '1');
  assert(attack.fill > 0 && attack.fill < 100, 'attack ring fills toward the next charge');
  assert.deepEqual(dodge.dots, {count: 2, max: 2});
  assert.equal(dodge.fill, 100, 'a full dodge ring is closed');
  assert.equal(JSON.stringify(game.snapshot()), before, 'reading the rings does not change the game');
});

test('R-VIS-010 the E ring shows its cooldown seconds and fills as it recovers', () => {
  const game = createGame(3), p = game.player;
  p.addGrowth(4000, game.balance);
  p.normalSkillCooldown = 0;
  const ready = abilityRing(game, E);
  assert.equal(ready.label, 'E');
  assert.equal(ready.sub, 'E');
  assert.equal(ready.fill, 100);
  p.normalSkillCooldown = 4;
  const cooling = abilityRing(game, E);
  assert.equal(cooling.state, 'cooldown');
  assert.match(cooling.sub, /^\d+s$/);
  assert(cooling.fill >= 0 && cooling.fill < 100);
});
