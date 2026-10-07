// R-VIS-009: status chips (including the green absorb lock) and detailed object-effect popups.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../tools/headless.mjs';
import {statusChips, drawStatusChips, objectEffectText, textWidth} from '../js/statusLabels.js';
import {applyObjectPreset, defaultObjectPreset, BIOME_OBJECTS} from '../js/biomeObjectCatalog.js';

const kinds = (e, now = 0) => statusChips(e, {gameTime: now}).map((c) => c.kind);

test('a summoned companion shows a green absorb-lock chip until it becomes absorbable', () => {
  const e = {summoned: {absorbableAt: 30}};
  const [chip] = statusChips(e, {gameTime: 6.2});
  assert.deepEqual(chip, {text: '흡수 불가 24s', color: '#4ade80', kind: 'absorb-lock'});
  assert.deepEqual(kinds(e, 30), []);
  assert.deepEqual(kinds({summoned: {absorbableAt: 30, absorbable: true}}, 5), []);
  assert.deepEqual(kinds({}), []);
});

test('every active status gets a chip in a stable order', () => {
  const now = 10, e = {
    summoned: {absorbableAt: 40}, frozen: 1.2, frostbiteRemaining: 2, wavePush: {}, dustInvulnerableRemaining: .4,
    shieldHp: 80.2, shieldRemaining: 3, obsidianShieldHp: 50, obsidianShieldUntil: 25, objectSpeedUntil: 14, objectSpeedMultiplier: 1.35,
    objectFrostUntil: 12, companionCharmUntil: 20, companionCharmPower: .2, companionDecoration: 'shell',
    inviteBuffs: [{expires: 30}, {expires: 5}], windStoneStacks: 2, obsidianStacks: 1, command: {type: 'gather'},
  };
  const chips = statusChips(e, {gameTime: now});
  assert.deepEqual(chips.map((c) => c.kind), ['absorb-lock', 'frozen', 'frostbite', 'push', 'invulnerable', 'shield', 'obsidian-shield', 'speed', 'frost-guard', 'charm', 'invite', 'wind-stack', 'obsidian-stack', 'command']);
  const text = Object.fromEntries(chips.map((c) => [c.kind, c.text]));
  assert.equal(text.frozen, '빙결 2s');
  assert.equal(text.shield, '보호막 81 · 3s');
  assert.equal(text.speed, '가속 +35% 4s');
  assert.equal(text.charm, '치장 · 동행 +20% 10s');
  assert.equal(text.invite, '동행 강화 ×1');
  assert.equal(text['wind-stack'], '바람 2/3');
});

test('freeze immunity only shows when not frozen, and expired effects show nothing', () => {
  assert.deepEqual(kinds({freezeImmune: 2}), ['freeze-immune']);
  assert.deepEqual(kinds({frozen: 1, freezeImmune: 2}), ['frozen']);
  assert.deepEqual(kinds({objectSpeedUntil: 5, objectFrostUntil: 5, companionCharmUntil: 5, obsidianShieldHp: 10, obsidianShieldUntil: 5, shieldHp: 10, shieldRemaining: 0}, 5), []);
});

test('chips draw at constant screen size, wrap three per row and survive canvases without measureText', () => {
  const calls = [], ctx = {save() {}, restore() {}, beginPath() {}, fill() {}, rect() {}, fillText: (t, x, y) => calls.push({t, y})};
  const chips = statusChips({frozen: 1, wavePush: {}, windStoneStacks: 1, obsidianStacks: 2, command: {}}, {gameTime: 0});
  drawStatusChips(ctx, {x: 0, y: 0}, 20, 2, chips);
  assert.equal(calls.length, 5);
  assert.equal(new Set(calls.slice(0, 3).map((c) => c.y)).size, 1);
  assert(calls[3].y > calls[0].y);
  assert.equal(calls[0].y, 20 + 6);
  assert.equal(textWidth({}, 'abcd', 10), 4 * 10 * .62);
  assert.equal(textWidth({measureText: () => ({width: 7})}, 'abcd', 10), 7);
});

test('object popups say what changed and for how long', () => {
  const c = BIOME_OBJECTS;
  assert.equal(objectEffectText(c['grass-windstone'], {}), '바람돌 · 이동 +25% · 4초');
  assert.equal(objectEffectText(c['volcano-vent'], {}), '열기 분출구 · 이동 +35% · 4초 · 체력 -1%');
  assert.equal(objectEffectText(c['forest-tree'], {}), '수호 고목 · 보호막 최대HP 8% · 6초');
  assert.equal(objectEffectText(c['grass-wind-stack'], {windStoneStacks: 2}), '바람 2/3 · 다 모으면 이동 +35%');
  assert.equal(objectEffectText(c['grass-wind-stack'], {windStoneStacks: 0}), '바람 완성 · 이동 +35% · 15초');
  assert.equal(objectEffectText(c['volcano-obsidian-stack'], {obsidianStacks: 0}), '흑요석 완성 · 보호막 최대HP 12% · 20초');
  for (const cfg of Object.values(c)) assert.equal(typeof objectEffectText(cfg, {}), 'string');
});

test('the player gets the detailed popup while other units keep the short name', () => {
  const g = createGame(7), p = g.player, cfg = defaultObjectPreset();
  g.entities = [p]; g.biomes.enabled = true; cfg.enabled = ['grass-windstone']; cfg.countPerType = 1;
  applyObjectPreset(g.balance, cfg); g.biomeObjects.sync();
  const o = g.biomeObjects.objects[0]; p.x = o.x; p.y = o.y; g.buildGrid(); g.floatingTexts = [];
  g.biomeObjects.update();
  assert(g.floatingTexts.some((f) => f.text === '바람돌 · 이동 +25% · 4초' && f.life > 2), JSON.stringify(g.floatingTexts));
  assert.deepEqual(statusChips(p, g).map((c) => c.kind), ['speed']);
});

test('R-CTRL-006 era banner names the doom warning, doom, war and a new era in words', async () => {
  const {eraEventKind, eraEventText} = await import('../js/statusLabels.js');
  const g = createGame(7);
  g.gameTime = 500; g.era.update(0);
  assert.equal(eraEventKind(g, 0), 'doom-warning');
  assert.match(eraEventText(g, 0), /^파멸 전조 · \d+초 뒤 피해$/);
  g.gameTime = g.era.apocalypse.activeAt + .1; g.era.update(0);
  assert.equal(eraEventText(g, 0), '파멸 진행 · 붉은 원 안 피해');
  const era = (over) => ({apocalypse: null, activeWar: () => false, phase: {id: 'abundance', name: '영양기'}, ...over});
  assert.equal(eraEventText({gameTime: 10, era: era(), player: {}}, 8), '영양기 시작');
  assert.equal(eraEventText({gameTime: 20, era: era(), player: {}}, 8), '');
  assert.equal(eraEventText({gameTime: 20, era: era({phase: {id: 'war', name: '전쟁기'}}), player: {}}, 8), '전쟁기 · 최상위 간 전쟁');
  assert.equal(eraEventText({gameTime: 20, era: era({activeWar: () => true}), player: {warTargets: new Set([1, 2])}}, 8), '전쟁 · 상대 2명');
});

test('R-CTRL-006 HUD cooldown row shows seconds, ready and casting for E/R', async () => {
  const {skillCooldownRow} = await import('../js/statusLabels.js');
  const game = (left, can) => ({abilities: {skill: () => ({name: '직선 파도', cooldown: 10}), cooldown: () => left, canCast: () => can}});
  assert.deepEqual(skillCooldownRow(game(7.2, false), {}, 'E'), {name: '직선 파도', text: '8s', state: 'cooldown', progress: 28});
  assert.deepEqual(skillCooldownRow(game(0, true), {}, 'E'), {name: '직선 파도', text: '준비', state: 'ready', progress: 100});
  assert.equal(skillCooldownRow(game(0, false), {}, 'R').state, 'blocked');
  assert.equal(skillCooldownRow(game(9, false), {specialCast: {slot: 'R'}}, 'R').text, '시전 중');
});
