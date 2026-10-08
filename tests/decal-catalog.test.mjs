import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DECALS, DECAL_LAYOUT, decalAt, madeDecals} from '../js/decalCatalog.js';
import {readReviews, plan, rewrite} from '../tools/decal-confirm.mjs';

test('decal catalog keeps the original forest decal placement (one tile in three, 18~30, inset 35)', () => {
  const ids = ['forest-leaf', 'forest-twig', 'forest-pebble'];
  assert.deepEqual(madeDecals('forest'), ids);
  let placed = 0;
  for (let y = 0; y < 8000; y += 200) for (let x = 0; x < 8000; x += 200) {
    const h = (Math.imul(x / 200, 73856093) ^ Math.imul(y / 200, 19349663)) >>> 0, d = decalAt('forest', x, y);
    if (h % 3 !== 0) { assert.equal(d, null); continue; }
    placed++;
    assert.deepEqual(d, {id: ids[(h >>> 5) % 3], x: x + 35 + (h >>> 8) % 130, y: y + 35 + (h >>> 16) % 130, size: 18 + (h >>> 24) % 12});
  }
  assert(placed > 400 && placed < 700);
});

test('regions without made decals draw nothing; planned decals have no image yet', () => {
  for (const region of Object.keys(DECAL_LAYOUT)) if (region !== 'forest') assert.equal(decalAt(region, 0, 0), null);
  assert(Object.values(DECALS).some((d) => !d.src));
  for (const d of Object.values(DECALS)) if (d.src) assert(fs.existsSync(new URL('../assets/art-packs/' + d.src, import.meta.url)));
});

test('decal-confirm writes bench layout changes and refuses a size range that is not increasing', () => {
  const text = '[데칼 검수]\n```json\n' + JSON.stringify({format: 'decal-review-v1', region: 'forest', layout: {chance: [1 / 3, .2], min: [18, 12]}, decals: {}}) + '\n```';
  const {next} = plan(readReviews(text));
  assert.deepEqual(next.forest, {chance: .2, size: [12, 30], inset: 35});
  const source = fs.readFileSync(new URL('../js/decalCatalog.js', import.meta.url), 'utf8');
  const out = rewrite(source, next);
  assert.match(out, /^ forest:\{chance:0\.2,size:\[12,30\],inset:35\},$/m);
  assert.match(out, /^ snow:\{chance:1\/3,size:\[18,30\],inset:35\},$/m);
  assert.throws(() => plan(readReviews(JSON.stringify({format: 'decal-review-v1', region: 'snow', layout: {min: [18, 40]}}))));
});

test('decal bench copies decal-review-v1 lines from the shared catalog', () => {
  const html = fs.readFileSync(new URL('../tools/decal-bench.html', import.meta.url), 'utf8');
  assert.match(html, /from '\.\.\/js\/decalCatalog\.js'/);
  assert.match(html, /format: 'decal-review-v1'/);
  for (const key of ['chance', 'min', 'max', 'inset']) assert(html.includes(`['${key}', `));
});
