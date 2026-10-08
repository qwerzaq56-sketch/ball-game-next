// R-CTRL-008 / planning 트러블슈팅 TS-003: browser page zoom is locked and snapped back on phones.
import test from 'node:test';
import assert from 'node:assert/strict';
import {installPageZoomGuard, isZoomed, LOCKED_VIEWPORT} from '../js/pageZoomGuard.js';

function fakePage(scale = 1) {
  const listeners = {}, timers = [], meta = {content: 'width=device-width, initial-scale=1.0', setAttribute(k, v) { this[k] = v; }};
  const viewport = {scale, addEventListener: (t, f) => { listeners['vv:' + t] = f; }};
  const doc = {querySelector: () => meta, addEventListener: (t, f) => { listeners[t] = f; }};
  const win = {visualViewport: viewport, setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {}};
  return {meta, viewport, doc, win, listeners, flush: () => { while (timers.length) timers.shift()(); }};
}

test('viewport meta forbids page scaling and double-tap/pinch defaults are cancelled', () => {
  const page = fakePage();
  installPageZoomGuard(page.win, page.doc);
  assert.equal(page.meta.content, LOCKED_VIEWPORT);
  assert.match(LOCKED_VIEWPORT, /maximum-scale=1\.0/);
  assert.match(LOCKED_VIEWPORT, /user-scalable=no/);
  let prevented = 0;
  page.listeners.gesturestart({preventDefault: () => prevented++});
  page.listeners.dblclick({target: {closest: () => null}, preventDefault: () => prevented++});
  page.listeners.dblclick({target: {closest: () => ({})}, preventDefault: () => prevented++}); // text fields keep double-tap select
  assert.equal(prevented, 2);
});

test('a page that got zoomed anyway is reset to scale 1', () => {
  const page = fakePage(2.4), seen = [];
  const set = page.meta.setAttribute.bind(page.meta); page.meta.setAttribute = (k, v) => { seen.push(v); set(k, v); };
  installPageZoomGuard(page.win, page.doc);
  seen.length = 0;
  page.listeners['vv:resize'](); page.flush();
  assert.equal(seen.length, 2);
  assert.match(seen[0], /minimum-scale=1\.0/);
  assert.equal(page.meta.content, LOCKED_VIEWPORT);
  assert.equal(isZoomed({scale: 1.005}), false);
  assert.equal(isZoomed({scale: 1.3}), true);
});
