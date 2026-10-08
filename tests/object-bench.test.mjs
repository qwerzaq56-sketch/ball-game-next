import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {BIOME_OBJECTS, DEFAULT_OBJECT_IDS, PLACEMENT_BOUNDS, OVERRIDE_BOUNDS, defaultObjectPreset, applyObjectPreset, normalizeObjectPreset, defaultPlacedCount} from '../js/biomeObjectCatalog.js';
import {placementTiles} from '../js/biomeObjects.js';
import {createGame} from '../tools/headless.mjs';

// Object review bench (planning 03_아트/32): every reference it shows must exist, for every default object.
const page = readFileSync(new URL('../tools/object-bench.html', import.meta.url), 'utf8');
const fromTools = (rel) => new URL('../tools/' + rel, import.meta.url);

test('object bench references only files that exist', () => {
  const literal = [...page.matchAll(/'(\.\.\/assets\/[^']+\.png)'/g)].map((m) => m[1]);
  const joined = [...page.matchAll(/(SC|FR) \+ '([^']+\.png)'/g)].map((m) => (m[1] === 'SC' ? '../assets/art-batches/scene-coherent-v1/' : '../assets/art-packs/forest-raster-v1/') + m[2]);
  assert.ok(joined.length >= 6, 'bench lists the adopted and extra generations');
  for (const rel of [...literal, ...joined]) assert.ok(existsSync(fromTools(rel)), rel);
});

test('object bench has the object crop, batch asset and gameplay region crop for each default object', () => {
  for (const id of DEFAULT_OBJECT_IDS) {
    for (const f of ['reference.png', 'asset.png']) assert.ok(existsSync(fromTools(`../assets/art-batches/scene-coherent-v1/${id}/${f}`)), `${id}/${f}`);
    assert.ok(existsSync(fromTools(`object-bench/gameplay-${BIOME_OBJECTS[id].region}.jpg`)), `gameplay crop for ${BIOME_OBJECTS[id].region}`);
  }
});

test('object bench "game resource" matches what landmarkArt actually draws', () => {
  const art = readFileSync(new URL('../js/landmarkArt.js', import.meta.url), 'utf8');
  for (const file of ['guardian-002-extracted.png', 'overhead-states-002.png']) {
    assert.ok(art.includes(file), `landmarkArt draws ${file}`);
    assert.ok(page.includes(file), `bench shows ${file} as the game resource`);
  }
  // 2026-10-08 object review: the berry grove draws its batch generation; berry-002 stays on the bench only for comparison.
  assert.ok(!art.includes('berry-002.png'), 'landmarkArt no longer draws berry-002');
  assert.ok(!/ADOPTED = \{[^}]*forest-berry-grove/.test(page), 'bench shows the batch asset as the berry game resource');
});

// Stage 2: the bench writes preset v3 overrides — body scale and placed count per object.
const placedGame = (overrides) => { const g = createGame(7); g.biomes.enabled = true; const p = defaultObjectPreset(); p.overrides = overrides; applyObjectPreset(g.balance, p); g.biomeObjects.sync(); return g; };

test('preset v3 accepts visualScale and placed, rejects out-of-range values, and still reads v2', () => {
  const v3 = normalizeObjectPreset({...defaultObjectPreset(), overrides: {'forest-tree': {visualScale: 1.3, placed: 3, radius: 120}}});
  assert.equal(v3.format, 'ball-next-objects-v3');
  assert.deepEqual(v3.overrides['forest-tree'], {visualScale: 1.3, placed: 3, radius: 120});
  assert.equal(normalizeObjectPreset({format: 'ball-next-objects-v2', countPerType: 6, enabled: ['forest-tree'], overrides: {}}).format, 'ball-next-objects-v3');
  assert.doesNotThrow(() => normalizeObjectPreset({...defaultObjectPreset(), overrides: {'forest-tree': {visualScale: 3.5, aspect: 1.6, edgeMargin: 200, spacing: 500}, 'volcano-vent-cycle': {lavaMargin: 150}}}));
  for (const bad of [{visualScale: .2}, {visualScale: 4.1}, {aspect: .4}, {aspect: 2.5}, {placed: 0}, {placed: 21}, {placed: 2.5}, {edgeMargin: -1}, {spacing: 801}, {lavaMargin: 401}])
    assert.throws(() => normalizeObjectPreset({...defaultObjectPreset(), overrides: {'forest-tree': bad}}), /잘못된 수치/);
});

test('placed sets the instance count; without it the catalog or shared count rule applies', () => {
  const base = placedGame({}), set = placedGame({'forest-tree': {placed: 2}, 'lake-vortex': {placed: 4}});
  const n = (g, id) => g.biomeObjects.objects.filter((o) => o.candidate === id).length;
  // Bench-confirmed counts live in the catalog (placed); objects without one use the shared rule.
  for (const id of DEFAULT_OBJECT_IDS) assert.equal(n(base, id), BIOME_OBJECTS[id].placed ?? defaultPlacedCount(id, 6), id);
  assert.equal(n(set, 'forest-tree'), 2);
  assert.equal(n(set, 'lake-vortex'), 4);
  // Instances keep their place: the first two trees sit where they did before.
  const at = (g) => g.biomeObjects.objects.filter((o) => o.candidate === 'forest-tree').slice(0, 2).map((o) => [o.x, o.y]);
  assert.deepEqual(at(set), at(base));
});

test('every bench size row writes a key the preset accepts at both ends of its slider', () => {
  // Sliders take their ends from PLACEMENT_BOUNDS / OVERRIDE_BOUNDS, so both ends must normalize.
  const rows = [...page.matchAll(/\{k: '(\w+)', label: '[^']+', group: /g)].map((m) => m[1]);
  assert.deepEqual(rows, ['visualScale', 'aspect', 'radius', 'widthMin', 'widthMax', 'pathSteps', 'placed', 'edgeMargin', 'spacing', 'lavaMargin']);
  for (const k of rows) {
    const id = ['widthMin', 'widthMax', 'pathSteps'].includes(k) ? 'lake-current' : 'forest-tree', [lo, hi] = Object.hasOwn(PLACEMENT_BOUNDS, k) ? PLACEMENT_BOUNDS[k] : OVERRIDE_BOUNDS[k];
    // widthMin must stay below widthMax (the bench toasts that), so each end is checked with the other at its far end.
    const pair = {widthMin: {widthMax: 250}, widthMax: {widthMin: 40}}[k] || {};
    for (const v of [lo, hi]) assert.doesNotThrow(() => normalizeObjectPreset({...defaultObjectPreset(), overrides: {[id]: {...pair, [k]: v}}}), `${id}.${k}=${v}`);
  }
  // Effect rows: each object's own catalog keys, so both slider ends must normalize for that object.
  for (const id of DEFAULT_OBJECT_IDS) for (const k of Object.keys(BIOME_OBJECTS[id]).filter((k) => Object.hasOwn(OVERRIDE_BOUNDS, k) && !rows.includes(k)))
    for (const v of OVERRIDE_BOUNDS[k]) { const pair = {activeDuration: {cycleDuration: 60}, cycleDuration: {activeDuration: 1}}[k] || {};
      assert.doesNotThrow(() => normalizeObjectPreset({...defaultObjectPreset(), overrides: {[id]: {...pair, [k]: v}}}), `${id}.${k}=${v}`); }
  assert.ok(page.includes('OBJECT_PRESET_KEY') && page.includes("format: 'object-review-v2'"), 'bench saves the game preset and copies object-review-v2');
});

test('bench has three evaluations and opens references in a zoomable lightbox', () => {
  for (const k of ["image: {tab: '① 이미지 평가'", "size: {tab: '② 크기·배치 평가'", "effect: {tab: '③ 효과 평가'"]) assert.ok(page.includes(k), k);
  assert.ok(page.includes('id="lb"') && page.includes("addEventListener('wheel'"), 'lightbox with wheel zoom');
  // Gameplay triptychs open cropped to the object's region panel.
  for (const v of ['002', '003']) for (const s of ['a', 'b']) assert.ok(existsSync(fromTools(`../assets/art-batches/scene-coherent-v1/gameplay-${s}-${v}.png`)), `gameplay-${s}-${v}.png`);
});

test('placement margins keep objects off region borders, lava and each other', () => {
  const g = placedGame({'forest-tree': {edgeMargin: 250}, 'volcano-vent-cycle': {lavaMargin: 220}, 'forest-berry-grove': {spacing: 450}});
  const of = (id) => g.biomeObjects.objects.filter((o) => o.candidate === id), w = g.balance.world;
  const d = (a, b) => { const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y); return Math.hypot(Math.min(dx, w.worldWidth - dx), Math.min(dy, w.worldHeight - dy)); };
  const trees = placementTiles(g, {...BIOME_OBJECTS['forest-tree'], edgeMargin: 250});
  assert.ok(trees.fit.length > 0 && trees.fit.length < trees.region.length, 'edge margin rules out some forest tiles but not all');
  for (const o of of('forest-tree')) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; assert.equal(g.biomes.regionAt({x: o.x + Math.cos(a) * 250, y: o.y + Math.sin(a) * 250})?.id, 'forest', `${o.id} keeps 250 from the forest border`); }
  if (placementTiles(g, {...BIOME_OBJECTS['volcano-vent-cycle'], lavaMargin: 220}).fit.length) for (const o of of('volcano-vent-cycle')) assert.ok(!g.biomes.lavaAt(o, 220), `${o.id} keeps 220 from lava`);
  // Spacing is mutual: trees are placed after the berry groves and still keep the groves' 450.
  const berries = of('forest-berry-grove');
  for (let i = 0; i < berries.length; i++) for (let j = i + 1; j < berries.length; j++) assert.ok(d(berries[i], berries[j]) >= 450, 'groves keep their spacing');
  for (const t of of('forest-tree')) for (const b of berries) assert.ok(d(t, b) >= 450, `${t.id} keeps the groves' spacing`);
  // Without margins nothing moves.
  assert.deepEqual(placedGame({}).biomeObjects.objects.map((o) => [o.x, o.y]), placedGame({'grass-garland': {spacing: 0, edgeMargin: 0}}).biomeObjects.objects.map((o) => [o.x, o.y]));
});

test('vent and vortex bodies scale with visualScale and aspect, never with the effect radius', () => {
  const base = placedGame({}), wide = placedGame({'volcano-vent-cycle': {radius: 240, visualScale: 3, aspect: 1.5}, 'lake-vortex': {radius: 40, visualScale: 3}});
  const first = (g, id) => g.biomeObjects.objects.find((o) => o.candidate === id);
  // An override replaces the catalog body scale, so the body grows by override ÷ catalog value.
  const k = (id, v) => v / (BIOME_OBJECTS[id].visualScale ?? 1);
  assert.ok(Math.abs(first(wide, 'volcano-vent-cycle').bodyRadius - first(base, 'volcano-vent-cycle').bodyRadius * k('volcano-vent-cycle', 3)) < 1e-9);
  assert.ok(Math.abs(first(wide, 'lake-vortex').bodyRadius - first(base, 'lake-vortex').bodyRadius * k('lake-vortex', 3)) < 1e-9);
  assert.equal(first(wide, 'volcano-vent-cycle').aspect, 1.5);
  assert.equal(first(base, 'forest-tree').aspect, 1);
  assert.ok(first(wide, 'lake-vortex').config.radius < first(base, 'lake-vortex').config.radius, 'radius still shrinks the effect');
});

test('visualScale grows the body only; the effect radius stays', () => {
  const base = placedGame({}), big = placedGame({'forest-tree': {visualScale: 1.5}});
  const first = (g) => g.biomeObjects.objects.find((o) => o.candidate === 'forest-tree');
  assert.ok(Math.abs(first(big).visualScale - first(base).visualScale * 1.5 / (BIOME_OBJECTS['forest-tree'].visualScale ?? 1)) < 1e-9);
  assert.equal(first(big).config.radius, first(base).config.radius);
});
