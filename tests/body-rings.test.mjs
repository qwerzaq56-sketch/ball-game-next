import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BODY_RING_PX, ringRadius} from '../js/bodyRings.js';

test('R-VIS-009 body rings use one screen-pixel table, in a fixed order with no shared radius', () => {
  const values = Object.values(BODY_RING_PX);
  for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1], `ring ${i} must sit outside ring ${i - 1}`);
  // The rings that used to overlap near zoom 1 (frost mark, morale, obsidian) keep at least 3 px apart.
  assert.ok(BODY_RING_PX.morale - BODY_RING_PX.frostMark >= 3);
  assert.ok(BODY_RING_PX.obsidian - BODY_RING_PX.morale >= 3);
  // Screen units: the gap shrinks in world units as the camera zooms in, so it reads the same on screen.
  assert.equal(ringRadius(50, 'frozen', 2) - 50, BODY_RING_PX.frozen / 2);
});

test('R-VIS-009 game.js draws no body ring at a world-unit offset', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /arc\(\s*e\.x\s*,\s*e\.y\s*,\s*r\s*\+\s*\d+\s*,/, 'use ringRadius(r, key, zoom)');
});
