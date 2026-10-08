// tools/size-sim.html reads the game's own size functions and config paths; this keeps it from silently breaking
// when one of them is renamed (planning 00_기준/master/능력치.md, user request 2026-10-09).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as combat from '../js/combat.js';
import * as entity from '../js/entity.js';
import {BIOME_OBJECTS} from '../js/biomeObjectCatalog.js';

const page = fs.readFileSync(new URL('../tools/size-sim.html', import.meta.url), 'utf8');
const balance = JSON.parse(fs.readFileSync(new URL('../config/gameBalance.json', import.meta.url), 'utf8'));

test('size simulator: every imported game function exists', () => {
  const mods = {'../js/combat.js': combat, '../js/entity.js': entity, '../js/biomeObjectCatalog.js': {BIOME_OBJECTS}};
  const imports = [...page.matchAll(/import \{([^}]+)\} from '([^']+)'/g)];
  assert.equal(imports.length, 3);
  for (const [, names, from] of imports) for (const name of names.split(',').map((n) => n.trim())) assert.ok(name in mods[from], `${from} exports ${name}`);
});

test('size simulator: every knob points at a number the game has', () => {
  const objs = {'forest-berry-grove': 'BERRY', 'volcano-obsidian-stack': 'OBS', 'volcano-vent-cycle': 'VENT'};
  const paths = [...page.matchAll(/\{g: '[^']+', p: (?:'([^']+)'|`obj\.\$\{(\w+)\}\.(\w+)`)/g)];
  assert.ok(paths.length >= 10);
  for (const [, plain, obj, key] of paths) {
    if (plain) assert.equal(typeof plain.split('.').reduce((a, k) => a?.[k], balance), 'number', plain);
    else { const id = Object.keys(objs).find((i) => objs[i] === obj); assert.equal(typeof BIOME_OBJECTS[id][key], 'number', `${id}.${key}`); }
  }
});
