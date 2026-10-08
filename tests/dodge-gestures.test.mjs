// R-CTRL-009: phone dodge gesture modules (planning inbox ke764sms) — pure rules plus the real TouchControls on a fake page.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DODGE_MODULES, DODGE_MODULES_KEY, defaultDodgeModules, loadDodgeModules, saveDodgeModules, tapOf, isDoubleTap, isFlick, touchDownDodge, pointAngle} from '../js/dodgeGestures.js';
import {createGame} from '../tools/headless.mjs';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return {getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v))}; };

test('modules default to the two requested gestures and survive a save/load round trip', () => {
  assert.deepEqual(defaultDodgeModules(), {secondFinger: true, doubleTapRight: true, flickRight: false, doubleTapLeft: false});
  const store = memory();
  saveDodgeModules({...defaultDodgeModules(), flickRight: true, secondFinger: false}, store);
  assert.deepEqual(loadDodgeModules(store), {secondFinger: false, doubleTapRight: true, flickRight: true, doubleTapLeft: false});
  assert.deepEqual(loadDodgeModules(memory({[DODGE_MODULES_KEY]: '{bad'})), defaultDodgeModules(), 'malformed settings keep defaults');
  assert.ok(DODGE_MODULES.every((m) => m.label && m.hint));
});

test('taps, double taps and flicks are told apart by time and travel', () => {
  const tap = tapOf({side: 'right', startX: 0, startY: 0, startTime: 0, endX: 5, endY: 0, endTime: 120});
  assert.ok(tap);
  assert.equal(tapOf({side: 'right', startX: 0, startY: 0, startTime: 0, endX: 5, endY: 0, endTime: 400}), null, 'a long press is no tap');
  assert.equal(tapOf({side: 'right', startX: 0, startY: 0, startTime: 0, endX: 40, endY: 0, endTime: 100}), null, 'a drag is no tap');
  assert.ok(isDoubleTap(tap, {side: 'right', x: 20, y: 10, time: 300}));
  assert.ok(!isDoubleTap(tap, {side: 'right', x: 20, y: 10, time: 600}), 'too late');
  assert.ok(!isDoubleTap(tap, {side: 'left', x: 0, y: 0, time: 200}), 'other side');
  assert.ok(!isDoubleTap(tap, {side: 'right', x: 200, y: 0, time: 200}), 'too far');
  assert.ok(isFlick({startX: 0, startY: 0, startTime: 0, endX: 90, endY: 0, endTime: 120}));
  assert.ok(!isFlick({startX: 0, startY: 0, startTime: 0, endX: 90, endY: 0, endTime: 400}), 'a slow drag is an aimed attack');
  assert.equal(pointAngle({x: 100, y: 100}, {x: 110, y: 100}), null, 'a touch on the ball keeps the facing');
  assert.equal(pointAngle({x: 100, y: 100}, {x: 100, y: 200}), Math.PI / 2);
});

test('touch-down rules: second finger while aiming, double taps per side, and nothing when switched off', () => {
  const on = {secondFinger: true, doubleTapRight: true, flickRight: true, doubleTapLeft: true}, off = {secondFinger: false, doubleTapRight: false, flickRight: false, doubleTapLeft: false};
  const lastRight = {side: 'right', x: 0, y: 0, time: 0}, lastLeft = {side: 'left', x: 0, y: 0, time: 0}, down = (side) => ({side, x: 5, y: 5, time: 100});
  assert.deepEqual(touchDownDodge({modules: on, side: 'right', moving: false, attackHeld: true, down: down('right')}), {dodge: 'point'});
  assert.deepEqual(touchDownDodge({modules: on, side: 'left', moving: true, attackHeld: true, down: down('left')}), {dodge: 'point'}, 'left touch while already moving');
  assert.equal(touchDownDodge({modules: on, side: 'left', moving: false, attackHeld: true, down: down('left')}), null, 'left thumb still starts moving while aiming');
  assert.deepEqual(touchDownDodge({modules: on, side: 'right', moving: false, attackHeld: false, lastTap: lastRight, down: down('right')}), {dodge: 'point'});
  assert.deepEqual(touchDownDodge({modules: on, side: 'left', moving: false, attackHeld: false, lastTap: lastLeft, down: down('left')}), {dodge: 'facing', thenMove: true});
  for (const [side, lastTap, attackHeld] of [['right', null, true], ['right', lastRight, false], ['left', lastLeft, false]]) assert.equal(touchDownDodge({modules: off, side, moving: false, attackHeld, lastTap, down: down(side)}), null);
});

// ---- the real TouchControls on a minimal fake page
function fakePage(store) {
  const listeners = {}, on = (key) => (type, fn) => { (listeners[key + ':' + type] ??= []).push(fn); };
  const el = (id) => ({id, hidden: false, disabled: false, children: [], dataset: {}, style: {setProperty() {}}, classList: {add() {}, remove() {}, toggle() {}, contains: () => false},
    textContent: '', offsetWidth: 144, offsetHeight: 144, addEventListener: on(id), setPointerCapture() {}, setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k]; },
    append(...c) { this.children.push(...c); }, getClientRects: () => [], getBoundingClientRect: () => ({left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600})});
  const els = {};
  globalThis.document = {body: el('body'), getElementById: (id) => els[id] ??= el(id), createElement: () => el('new'), addEventListener: on('doc'), querySelector: () => null, hidden: false};
  globalThis.window = {matchMedia: () => ({matches: true}), addEventListener: on('win'), visualViewport: null};
  globalThis.localStorage = store;
  const fire = (key, type, e) => { for (const fn of listeners[key + ':' + type] ?? []) fn({preventDefault() {}, pointerType: 'touch', ...e}); };
  return {els, fire, listeners};
}

test('TouchControls: dodge modules act on real gestures and the menu switches them', async () => {
  const g = createGame(7), page = fakePage(memory());
  const {TouchControls} = await import('../js/touchControls.js');
  const canvas = document.getElementById('game');
  g.player.attackUnlocked = true; g.worldToScreen = () => ({x: 500, y: 300});
  const tc = new TouchControls(g, g.input, canvas), down = (id, x, y, t) => page.fire('game', 'pointerdown', {pointerId: id, clientX: x, clientY: y, timeStamp: t}), up = (id, x, y, t) => page.fire('win', 'pointerup', {pointerId: id, clientX: x, clientY: y, timeStamp: t});
  const reset = () => { g.input._dodgeQueued = false; g.input._dodgeAngle = null; g.input._attackQueued = null; tc.lastTap = null; };
  // Menu: one button per module, shown on touch devices, clicking flips and saves.
  const menu = page.els['dodge-modules'];
  assert.equal(menu.hidden, false); assert.equal(menu.children.length, DODGE_MODULES.length);
  // ② second finger while aiming: dodge toward the touch, the attack aim is kept.
  down(1, 800, 300, 0); assert.ok(tc.attackHeld());
  down(2, 500, 500, 50); assert.equal(g.input._dodgeQueued, true); assert.equal(g.input._dodgeAngle, Math.PI / 2); assert.ok(tc.attackHeld(), 'telegraph kept');
  up(2, 500, 500, 80); assert.ok(tc.attackHeld());
  up(1, 800, 300, 600); assert.ok(g.input._attackQueued, 'the held attack still fires on release'); reset();
  // The dodge button also works while aiming.
  down(1, 800, 300, 0); page.fire('touch-dodge', 'pointerdown', {pointerId: 3, clientX: 900, clientY: 500, timeStamp: 30}); assert.equal(g.input._dodgeQueued, true); up(1, 800, 300, 500); reset();
  // ③ double tap on the right: the second tap dodges instead of starting another attack.
  down(4, 700, 200, 1000); up(4, 702, 200, 1080); assert.ok(tc.lastTap); g.input._attackQueued = null;
  down(5, 705, 205, 1200); assert.equal(g.input._dodgeQueued, true); assert.ok(!tc.attackHeld()); up(5, 705, 205, 1250); assert.equal(g.input._attackQueued, null); reset();
  // ④ flick (off by default → attack; switched on → dodge along the flick).
  down(6, 700, 300, 2000); up(6, 800, 300, 2100); assert.ok(g.input._attackQueued); assert.equal(g.input._dodgeQueued, false); reset();
  page.fire('new', 'click', {}); // the fake createElement shares one key, so click every module button once
  assert.deepEqual(tc.modules, {secondFinger: false, doubleTapRight: false, flickRight: true, doubleTapLeft: true}, 'each menu button flips its module');
  assert.deepEqual(loadDodgeModules(localStorage), tc.modules, 'saved');
  down(7, 700, 300, 3000); up(7, 600, 300, 3100); assert.equal(g.input._dodgeQueued, true); assert.equal(g.input._dodgeAngle, Math.PI); assert.equal(g.input._attackQueued, null); reset();
  // ⑤ double tap on the left (now on): dodge along the facing and keep moving.
  down(8, 200, 300, 4000); up(8, 201, 300, 4080); down(9, 205, 302, 4200);
  assert.equal(g.input._dodgeQueued, true); assert.equal(g.input._dodgeAngle, null); assert.equal(tc.pointers.get(9), 'move'); up(9, 205, 302, 4300); reset();
  // With secondFinger off the second finger does nothing while aiming.
  down(10, 800, 300, 5000); down(11, 500, 500, 5050); assert.equal(g.input._dodgeQueued, false); up(10, 800, 300, 5500);
});
