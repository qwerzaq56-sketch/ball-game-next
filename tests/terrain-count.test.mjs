// R-WORLD-017: a round shows only some terrains; grassland fills the rest. The count is a setting so it can be tested later.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame} from '../tools/headless.mjs';
import {roundTerrains} from '../js/biomes.js';

const base=JSON.parse(fs.readFileSync(new URL('../config/gameBalance.json',import.meta.url))).biomes;
const ids=g=>g.biomes.regions.map(r=>r.id).sort();
const withTerrains=(seed,extra)=>createGame(seed,{biomes:{...base,...extra}});

test('R-WORLD-017 the default keeps all five terrains plus grassland', () => {
  assert.deepEqual(ids(createGame(7)),['desert','forest','grassland','lake','snow','volcano']);
});

test('R-WORLD-017 a terrain count keeps that many terrains per seed, always with grassland, the same for the same seed', () => {
  const seen=new Set();
  for(const seed of [1,2,3,4,5,6,7,8,9,10]){
    const g=withTerrains(seed,{terrainsPerRound:3}),kept=ids(g);
    assert.equal(kept.length,4);assert(kept.includes('grassland'));
    assert.deepEqual(ids(withTerrains(seed,{terrainsPerRound:3})),kept,'deterministic');
    seen.add(kept.join(','));
    // dropped regions become grassland on the map; their objects and lava are gone
    for(const t of g.biomes.tiles)assert(kept.includes(t.region.id));
    if(!kept.includes('volcano'))assert.equal(g.biomes.rivers.length,0);
    for(const o of g.biomeObjects.objects)assert(kept.includes(o.config.region));
  }
  assert(seen.size>1,'different seeds pick different terrains');
});

test('R-WORLD-017 terrainIds forces the set and the limit clamps to the pool', () => {
  assert.deepEqual(ids(withTerrains(7,{terrainIds:['lake','volcano']})),['grassland','lake','volcano']);
  assert.deepEqual(ids(withTerrains(7,{terrainsPerRound:0})),['grassland']);
  assert.deepEqual(ids(withTerrains(7,{terrainsPerRound:99})).length,6);
  const regions=[{id:'forest'},{id:'grassland'},{id:'lake'}];
  assert.equal(roundTerrains(regions,{},1),regions,'no setting leaves the list untouched');
});
