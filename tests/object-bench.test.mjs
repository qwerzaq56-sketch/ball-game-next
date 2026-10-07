import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {BIOME_OBJECTS, DEFAULT_OBJECT_IDS} from '../js/biomeObjectCatalog.js';

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
