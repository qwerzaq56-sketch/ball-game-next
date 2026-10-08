import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame} from '../tools/headless.mjs';
import {BIOME_OBJECTS, DEFAULT_OBJECT_IDS, PLACEMENT_BOUNDS, defaultObjectPreset, applyObjectPreset} from '../js/biomeObjectCatalog.js';
import {CATALOG_PATH, collectChanges, validateChanges, applyToCatalogSource, currentDefault} from '../tools/object-confirm.mjs';

test('object-confirm reads both bench formats and ignores other lines', () => {
  const text = ['[오브젝트 검수] 2건', '{"format":"object-adjust-v1","id":"forest-tree","changes":{"visualScale":[1,1.6],"placed":[6,5]}}',
    '{"format":"object-review-v2","id":"desert-oasis","size":{"changes":{"radius":[140,160]}},"effect":{"changes":{"power":[10,12]}}}',
    '{"format":"other","id":"forest-tree","changes":{"radius":[1,2]}}', '{"format":"object-adjust-v1","id":"missing","changes":{"radius":[1,2]}}', '{broken'].join('\r\n');
  assert.deepEqual(collectChanges(text), [{id: 'forest-tree', key: 'visualScale', from: 1, to: 1.6}, {id: 'forest-tree', key: 'placed', from: 6, to: 5},
    {id: 'desert-oasis', key: 'radius', from: 140, to: 160}, {id: 'desert-oasis', key: 'power', from: 10, to: 12}]);
});

test('object-confirm rejects out-of-bounds values and flags stale or unchanged ones', () => {
  assert.throws(() => validateChanges([{id: 'forest-tree', key: 'visualScale', from: 1, to: 9}]));
  assert.throws(() => validateChanges([{id: 'forest-tree', key: 'placed', from: 5, to: 0}]));
  const [stale, same] = validateChanges([{id: 'forest-tree', key: 'radius', from: 1, to: 130}, {id: 'forest-tree', key: 'radius', from: null, to: BIOME_OBJECTS['forest-tree'].radius}]);
  assert.equal(stale.stale, true);assert.equal(same.same, true);
});

test('object-confirm rewrites one catalog line in place and round-trips the current catalog', () => {
  const src = fs.readFileSync(CATALOG_PATH, 'utf8');
  // Re-writing every entry with its own current values changes nothing.
  assert.equal(applyToCatalogSource(src, DEFAULT_OBJECT_IDS.map((id) => ({id, key: 'radius', to: BIOME_OBJECTS[id].radius}))), src);
  const out = applyToCatalogSource(src, [{id: 'grass-flowers', key: 'visualScale', to: 0.5}, {id: 'grass-flowers', key: 'edgeMargin', to: 0}]);
  const line = out.split(/\r?\n/).find((l) => l.startsWith(" 'grass-flowers':"));
  assert.match(line, /visualScale:\.5\}/);assert.doesNotMatch(line, /edgeMargin/);
  assert.equal(out.split(/\r?\n/).length, src.split(/\r?\n/).length);
  assert.throws(() => applyToCatalogSource(src, [{id: 'missing', key: 'radius', to: 1}]));
});

test('confirmed catalog placement and body defaults stay inside the bench bounds', () => {
  for (const id of DEFAULT_OBJECT_IDS) for (const [k, [lo, hi]] of Object.entries(PLACEMENT_BOUNDS)) {
    const v = currentDefault(id, k);assert.ok(v >= lo && v <= hi, `${id}.${k}=${v}`);
  }
});

test('lake currents with the confirmed defaults keep their full path inside the lake', () => {
  let full = 0, n = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = createGame(seed);g.biomes.enabled = true;applyObjectPreset(g.balance, defaultObjectPreset());g.biomeObjects.sync();
    for (const o of g.biomeObjects.objects.filter((o) => o.candidate === 'lake-current')) { n++; if (o.points.length === o.config.pathSteps * 2 + 1) full++; }
  }
  // Measured 99% (planning 03_아트/32 §8-4); 51% before the edge margin and axis choice.
  assert.ok(full / n >= .95, `${full}/${n}`);
});
