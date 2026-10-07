// R-CTRL-005: tutorial card data follows the live balance and covers abilities, species and terrain.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {basicCards, speciesCards, terrainCards, firstRunDeck, objectCardLine, skillLine, terrainHint} from '../js/tutorialCards.js';
import {SKILL_CATALOG} from '../js/skillCatalog.js';
import {BIOME_OBJECTS, applyObjectPreset, defaultObjectPreset} from '../js/biomeObjectCatalog.js';
import {createGame} from '../tools/headless.mjs';

const balance = () => JSON.parse(readFileSync(new URL('../config/gameBalance.json', import.meta.url), 'utf8'));

test('first start shows the five basic ability cards then the chosen species card', () => {
  const deck = firstRunDeck(balance(), 'red');
  assert.deepEqual(deck.map((c) => c.title), ['공격', '회피', '흡수', '달리기', '동행 요청', '빨강 종족']);
  for (const c of deck.slice(0, 5)) { assert(c.keys.desktop && c.keys.touch, c.id); assert(c.lines.length >= 2, c.id); }
});

test('basic card numbers follow the balance', () => {
  const b = balance(); b.sprint.unlockSize = 180; b.dodge.dodgeInvincibleTime = .3;
  const cards = Object.fromEntries(basicCards(b).map((c) => [c.id, c.lines.join(' ')]));
  assert.match(cards.sprint, /크기 180에 열립니다/);
  assert.match(cards.dodge, /0\.3초 동안 피해를 받지 않습니다/);
  assert.match(cards.attack, /크기 40에 열리고, 크기 100부터 2번/);
});

test('species cards list the selected E/R skills and terrain bonuses for all five species', () => {
  const b = balance(), cards = speciesCards(b);
  assert.deepEqual(cards.map((c) => c.species).sort(), ['blue', 'cyan', 'green', 'red', 'yellow']);
  const by = Object.fromEntries(cards.map((c) => [c.species, c]));
  assert.deepEqual(by.green.skills.map((s) => s.name), ['동행 초대', '숲의 부름']);
  assert.match(by.green.skills[1].text, /30초 동안 흡수할 수 없습니다/);
  assert.match(by.yellow.lines[0], /모래바람 피해 80% 감소/);
  assert.match(by.blue.lines[0], /호수에서 이동 90%/);
  b.abilitySkills.loadout.cyan.E = 'cyan-chill';
  assert.equal(speciesCards(b).find((c) => c.species === 'cyan').skills[0].name, '냉기 찌르기');
  for (const s of Object.values(SKILL_CATALOG)) assert.notEqual(skillLine({...s, id: Object.keys(SKILL_CATALOG).find((k) => SKILL_CATALOG[k] === s)}), s.name, s.name);
});

test('terrain cards cover all six regions with their enabled objects and real effects', () => {
  const g = createGame(7), cards = terrainCards(g.balance, g.biomes.regions);
  assert.deepEqual(cards.map((c) => c.region).sort(), ['desert', 'forest', 'grassland', 'lake', 'snow', 'volcano']);
  const by = Object.fromEntries(cards.map((c) => [c.region, c]));
  assert.deepEqual(by.lake.objects.map((o) => o.name), ['진주 조개밭', '해류', '소용돌이']);
  assert(by.volcano.objects.find((o) => o.name === '열기 분출구').danger);
  assert.match(by.desert.objects.find((o) => o.name === '작은 오아시스').text, /안에 있는 동안 초당 최대 체력 1% 회복/);
  assert(by.volcano.lines.some((l) => /빨강 종족이 이곳에 강합니다/.test(l)));
  assert.match(terrainHint(by.snow), /^설원 · .*동상/);
  const cfg = defaultObjectPreset(); cfg.enabled = ['forest-tree']; applyObjectPreset(g.balance, cfg);
  const only = terrainCards(g.balance, g.biomes.regions);
  assert.deepEqual(only.flatMap((c) => c.objects.map((o) => o.name)), ['수호 고목']);
});

test('every catalogued object has a card line', () => {
  for (const [id, c] of Object.entries(BIOME_OBJECTS)) assert.notEqual(objectCardLine(c), '', id);
});

test('R-WORLD-015 the oasis help line shows the healing a placed oasis actually gives', () => {
  const g = createGame(7);
  g.biomeObjects.sync();
  const placed = g.biomeObjects.objects.find(o => o.candidate === 'desert-oasis').config;
  const perSecond = Math.round(1000 * placed.power / placed.cooldown) / 10;
  const line = terrainCards(balance()).find(c => c.region === 'desert').objects.find(o => o.id === 'desert-oasis').text;
  assert.match(line, new RegExp(`초당 최대 체력 ${perSecond}% 회복`));
  assert.equal(perSecond, 1);
});
