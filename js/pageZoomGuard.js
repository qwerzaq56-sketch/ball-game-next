// R-CTRL-008 (planning 트러블슈팅 TS-003): the game never wants browser page zoom on phones.
// A double tap on a HUD panel or tip card zoomed the page, and the full-screen canvas
// (touch-action:none) then swallowed the pinch that would undo it, so the zoom got stuck.
// Three layers: the viewport meta forbids scaling (Android Chrome), touch-action:manipulation on
// every element drops double-tap zoom (CSS), and if a browser zooms anyway (iOS ignores
// user-scalable) the page is snapped back to scale 1 by re-applying the viewport meta.
export const LOCKED_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

export function isZoomed(viewport) {
  return !!viewport && Math.abs((viewport.scale ?? 1) - 1) > .01;
}

export function installPageZoomGuard(win = window, doc = document) {
  const meta = doc.querySelector('meta[name="viewport"]');
  if (meta) meta.setAttribute('content', LOCKED_VIEWPORT);
  // iOS Safari pinch gestures (non-standard events, absent elsewhere).
  for (const type of ['gesturestart', 'gesturechange']) doc.addEventListener(type, (e) => e.preventDefault(), {passive: false});
  doc.addEventListener('dblclick', (e) => { if (!e.target.closest?.('input,textarea,select')) e.preventDefault(); }, {passive: false});
  let timer = 0;
  const reset = () => {
    if (!meta || !isZoomed(win.visualViewport)) return;
    // Re-writing the meta makes the browser re-apply initial-scale; the brief variant forces it to notice.
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover');
    win.setTimeout(() => meta.setAttribute('content', LOCKED_VIEWPORT), 50);
  };
  win.visualViewport?.addEventListener('resize', () => { win.clearTimeout(timer); timer = win.setTimeout(reset, 250); });
  return {reset};
}
