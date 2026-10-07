// Playtest feedback 2026-10-08: healing berry at full HP, shield segment in HP bars, heat vent countdown.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {canEatOrb} from '../js/collision.js';
import {spawnOrb} from '../js/spawning.js';
import {shieldAmount} from '../js/statusLabels.js';
import {ventEruptsIn, VENT_WARNING_SECONDS} from '../js/biomeObjects.js';
import {applyObjectPreset, defaultObjectPreset} from '../js/biomeObjectCatalog.js';

test('R-WORLD-010 a healing berry is eaten even at full HP so it never looks uneaten', () => {
  const g = createGame(7), p = g.player;
  const berry = spawnOrb(g.balance, {x: p.x, y: p.y});
  berry.growthValue = 0; berry.healFraction = .08;
  p.hp = p.maxHp;
  assert.equal(canEatOrb(p, berry, g.balance), true);
  g.entities = [p, berry]; g.buildGrid(); g.update(1 / 60);
  assert.equal(berry.alive, false);
  assert.equal(p.hp, p.maxHp);
});

test('shield amount counts the skill/tree shield and only an active obsidian shield', () => {
  assert.equal(shieldAmount({shieldHp: 12}, 0), 12);
  assert.equal(shieldAmount({shieldHp: 12, obsidianShieldHp: 30, obsidianShieldUntil: 5}, 4), 42);
  assert.equal(shieldAmount({shieldHp: 12, obsidianShieldHp: 30, obsidianShieldUntil: 5}, 6), 12);
  assert.equal(shieldAmount({}, 0), 0);
});

test('R-WORLD-010 a heat vent counts down to its next eruption', () => {
  const g = createGame(7); g.biomes.enabled = true;
  const cfg = defaultObjectPreset(); cfg.enabled = ['volcano-vent-cycle']; cfg.countPerType = 1;
  applyObjectPreset(g.balance, cfg); g.biomeObjects.sync();
  const o = g.biomeObjects.objects[0], c = o.config;
  const start = c.cycleDuration - o.phase % c.cycleDuration; // the moment an eruption begins
  assert.equal(g.biomeObjects.activeVent(o), (g.gameTime + o.phase) % c.cycleDuration < c.activeDuration);
  g.gameTime = start - VENT_WARNING_SECONDS + .5;
  assert.ok(Math.abs(ventEruptsIn(o, g.gameTime) - (VENT_WARNING_SECONDS - .5)) < 1e-9);
  assert.equal(g.biomeObjects.activeVent(o), false);
  g.gameTime = start + .1;
  assert.equal(g.biomeObjects.activeVent(o), true);
});
