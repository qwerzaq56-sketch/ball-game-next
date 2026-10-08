import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {BIOME_OBJECTS, DEFAULT_OBJECT_IDS, defaultObjectPreset, applyObjectPreset, normalizeObjectPreset, defaultPlacedCount} from '../js/biomeObjectCatalog.js';
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
  for (const file of ['berry-002.png', 'guardian-002-extracted.png', 'overhead-states-002.png']) {
    assert.ok(art.includes(file), `landmarkArt draws ${file}`);
    assert.ok(page.includes(file), `bench shows ${file} as the game resource`);
  }
});

// Stage 2: the bench writes preset v3 overrides — body scale and placed count per object.
const placedGame = (overrides) => { const g = createGame(7); g.biomes.enabled = true; const p = defaultObjectPreset(); p.overrides = overrides; applyObjectPreset(g.balance, p); g.biomeObjects.sync(); return g; };

test('preset v3 accepts visualScale and placed, rejects out-of-range values, and still reads v2', () => {
  const v3 = normalizeObjectPreset({...defaultObjectPreset(), overrides: {'forest-tree': {visualScale: 1.3, placed: 3, radius: 120}}});
  assert.equal(v3.format, 'ball-next-objects-v3');
  assert.deepEqual(v3.overrides['forest-tree'], {visualScale: 1.3, placed: 3, radius: 120});
  assert.equal(normalizeObjectPreset({format: 'ball-next-objects-v2', countPerType: 6, enabled: ['forest-tree'], overrides: {}}).format, 'ball-next-objects-v3');
  for (const bad of [{visualScale: .4}, {visualScale: 2.1}, {placed: 0}, {placed: 21}, {placed: 2.5}])
    assert.throws(() => normalizeObjectPreset({...defaultObjectPreset(), overrides: {'forest-tree': bad}}), /잘못된 수치/);
});

test('placed sets the instance count; without it the shared count rule applies', () => {
  const base = placedGame({}), set = placedGame({'forest-tree': {placed: 2}, 'lake-vortex': {placed: 4}});
  const n = (g, id) => g.biomeObjects.objects.filter((o) => o.candidate === id).length;
  assert.equal(n(base, 'forest-tree'), defaultPlacedCount('forest-tree', 6));
  assert.equal(n(base, 'lake-vortex'), defaultPlacedCount('lake-vortex', 6));
  assert.equal(n(set, 'forest-tree'), 2);
  assert.equal(n(set, 'lake-vortex'), 4);
  // Instances keep their place: the first two trees sit where they did before.
  const at = (g) => g.biomeObjects.objects.filter((o) => o.candidate === 'forest-tree').slice(0, 2).map((o) => [o.x, o.y]);
  assert.deepEqual(at(set), at(base));
});

test('every bench adjustment row writes a key the preset accepts at both ends of its slider', () => {
  const rows = [...page.matchAll(/\{k: '(\w+)', label: '[^']+', min: ([^,]+), max: ([^,]+),/g)].map((m) => m[1]);
  assert.deepEqual(rows, ['radius', 'visualScale', 'placed', 'widthMin', 'widthMax', 'pathSteps']);
  const ends = {radius: [20, 250], visualScale: [.5, 2], placed: [1, 20], widthMin: [40, 160], widthMax: [80, 250], pathSteps: [1, 6]};
  for (const k of rows) {
    const id = ['widthMin', 'widthMax', 'pathSteps'].includes(k) ? 'lake-current' : 'forest-tree';
    for (const v of ends[k]) assert.doesNotThrow(() => normalizeObjectPreset({...defaultObjectPreset(), overrides: {[id]: {[k]: v}}}), `${id}.${k}=${v}`);
  }
  assert.ok(page.includes('OBJECT_PRESET_KEY') && page.includes("format: 'object-adjust-v1'"), 'bench saves the game preset and copies object-adjust-v1');
});

test('visualScale grows the body only; the effect radius stays', () => {
  const base = placedGame({}), big = placedGame({'forest-tree': {visualScale: 1.5}});
  const first = (g) => g.biomeObjects.objects.find((o) => o.candidate === 'forest-tree');
  assert.ok(Math.abs(first(big).visualScale - first(base).visualScale * 1.5) < 1e-9);
  assert.equal(first(big).config.radius, first(base).config.radius);
});
