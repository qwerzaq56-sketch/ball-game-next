// R-CTRL-009 (planning inbox ke764sms, 2026-10-09): extra ways to dodge on a phone, each a module the player can
// switch on or off from the menu for UX testing. The dodge button itself always stays (holding it sprints, R-COMBAT-003).
export const DODGE_MODULES_KEY = 'ball-dodge-modules-v1';
export const DODGE_MODULES = Object.freeze([
  {id: 'secondFinger', label: '조준 중 다른 손가락', hint: '공격 조준을 누른 채 다른 손가락으로 화면이나 회피 버튼을 누르면 회피, 조준은 그대로', default: true},
  {id: 'doubleTapRight', label: '오른쪽 두 번 탭', hint: '오른쪽 절반을 빠르게 두 번 누르면 누른 쪽으로 회피(첫 탭은 짧은 공격)', default: true},
  {id: 'flickRight', label: '오른쪽 튕기기', hint: '오른쪽에서 짧고 빠르게 튕기면 공격 대신 그 방향으로 회피', default: false},
  {id: 'doubleTapLeft', label: '왼쪽 두 번 탭', hint: '왼쪽 절반을 빠르게 두 번 누르면 이동 방향으로 회피하고 그대로 이동', default: false},
]);
// Gesture thresholds (CSS px, ms). A tap is short and barely moves; a flick is short and travels far.
export const DODGE_GESTURE = Object.freeze({tapMs: 250, tapSlop: 20, doubleTapMs: 320, doubleTapRadius: 60, flickMs: 180, flickMin: 60, nearPlayer: 30});

export function defaultDodgeModules() { return Object.fromEntries(DODGE_MODULES.map((m) => [m.id, m.default])); }
export function loadDodgeModules(storage = globalThis.localStorage) {
  const modules = defaultDodgeModules();
  try { const saved = JSON.parse(storage?.getItem(DODGE_MODULES_KEY) ?? 'null'); if (saved && typeof saved === 'object') for (const m of DODGE_MODULES) if (typeof saved[m.id] === 'boolean') modules[m.id] = saved[m.id]; } catch { /* malformed settings keep the defaults */ }
  return modules;
}
export function saveDodgeModules(modules, storage = globalThis.localStorage) { try { storage?.setItem(DODGE_MODULES_KEY, JSON.stringify(modules)); } catch { /* private mode: the switch still applies to this run */ } }

// A finished touch counts as a tap when it was short and stayed put.
export function tapOf(touch, G = DODGE_GESTURE) {
  return touch.endTime - touch.startTime <= G.tapMs && Math.hypot(touch.endX - touch.startX, touch.endY - touch.startY) <= G.tapSlop ? {side: touch.side, x: touch.endX, y: touch.endY, time: touch.endTime} : null;
}
export function isDoubleTap(lastTap, down, G = DODGE_GESTURE) {
  return !!lastTap && lastTap.side === down.side && down.time - lastTap.time <= G.doubleTapMs && Math.hypot(down.x - lastTap.x, down.y - lastTap.y) <= G.doubleTapRadius;
}
export function isFlick(touch, G = DODGE_GESTURE) {
  return touch.endTime - touch.startTime <= G.flickMs && Math.hypot(touch.endX - touch.startX, touch.endY - touch.startY) >= G.flickMin;
}
// What a new touch on the play field does. side: 'left' | 'right'; moving: a move finger is down or the stick is pushed;
// attackHeld: an attack aim is held. Returns null (normal handling) or {dodge: 'point' | 'facing', thenMove?}.
export function touchDownDodge({modules, side, moving, attackHeld, lastTap, down}) {
  const startsMove = side === 'left' && !moving;
  if (attackHeld) return modules.secondFinger && !startsMove ? {dodge: 'point'} : null;
  if (startsMove) return modules.doubleTapLeft && isDoubleTap(lastTap, down) ? {dodge: 'facing', thenMove: true} : null;
  if (side === 'right' && modules.doubleTapRight && isDoubleTap(lastTap, down)) return {dodge: 'point'};
  return null;
}
// Direction from the player's screen position to the touch; a touch on the player keeps the facing (null).
export function pointAngle(player, touch, G = DODGE_GESTURE) {
  const dx = touch.x - player.x, dy = touch.y - player.y;
  return Math.hypot(dx, dy) < G.nearPlayer ? null : Math.atan2(dy, dx);
}
