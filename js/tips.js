// R-CTRL-007: one-time situational tips (planning 00_기준/master/팁.md, same IDs and order).
// Pure logic: events call notice(id), update() polls state-based conditions and picks what to show.
// Rendering lives in tipsUI.js. Nothing here touches gameplay state or RNG.
import {canAbsorb, dist} from './collision.js';
import {selectedSkill} from './skillCatalog.js';
import {ventEruptsIn, VENT_WARNING_SECONDS} from './biomeObjects.js';
import {skillLine} from './tutorialCards.js';

export const TIP_SHOW_SECONDS = 6, TIP_GAP_SECONDS = 4, TIP_LOCKED_HINT_SECONDS = 20, TIP_STALE_SECONDS = 3;
const STORAGE_KEY = 'ballgamenext_tips_v1';
const SLOT_KEYS = {E: {desktop: 'E 키', touch: 'E 버튼'}, R: {desktop: 'R 키', touch: 'R 버튼'}};

const both = (text) => ({desktop: text, touch: text});
// T01-T13 (T02 is the unlock family). Text is a title plus one or two short lines.
export function tipText(id, game) {
  const b = game.balance, p = game.player, attackAt = b.skills.attackStackThresholds[0]?.size ?? 40;
  switch (id) {
    case 'attack-locked': return {title: '아직 공격할 수 없어요', text: both(`먹이를 먹고 크기 ${attackAt}이 되면 공격이 열립니다.`)};
    case 'unlock-attack': return {title: '공격 해금', text: {desktop: '좌클릭을 누른 채 모았다가 떼면 돌진 공격합니다.', touch: '화면 오른쪽을 드래그해 조준하고 손을 떼면 돌진 공격합니다.'}};
    case 'unlock-dodge': return {title: '회피 해금', text: {desktop: 'Space를 짧게 누르면 잠깐 무적이 되어 피합니다.', touch: '회피 버튼을 짧게 누르면 잠깐 무적이 되어 피합니다.'}};
    case 'unlock-sprint': return {title: '달리기 해금', text: {desktop: 'Space를 꾹 누르면 달립니다. 게이지는 체력바 밑에 있어요.', touch: '회피 버튼을 꾹 누르면 달립니다. 게이지는 체력바 밑에 있어요.'}};
    case 'full-charge': return {title: '끝까지 모으면 강해져요', text: {desktop: '꾹 눌러 링이 다 찬 뒤 떼면 피해와 돌진 거리가 늘어납니다.', touch: '조준한 채 링이 다 찬 뒤 떼면 피해와 돌진 거리가 늘어납니다.'}};
    case 'same-color': return {title: '같은 색은 다치지 않아요', text: {desktop: '같은 색끼리는 공격·스킬 피해가 없습니다. 작은 같은 색은 우클릭으로 흡수하고, Q로 동행을 제안할 수 있어요.', touch: '같은 색끼리는 공격·스킬 피해가 없습니다. 작은 같은 색은 흡수 ON으로 흡수하고, 동행 제안도 할 수 있어요.'}};
    case 'companion-absorb': return {title: '동행 중 흡수하면 동행이 끊겨요', text: {desktop: '동행 중에 흡수(우클릭)를 켜면 동행이 풀립니다.', touch: '동행 중에 흡수 ON을 누르면 동행이 풀립니다.'}};
    case 'absorb-hit': return {title: '맞으면 흡수가 끊겨요', text: both('흡수당하는 쪽이 공격을 맞으면 흡수가 풀립니다. 흡수하는 동안 주변의 적을 조심하세요.')};
    case 'heal-sources': return {title: '체력이 낮아요', text: both('사막의 오아시스 안에 머물거나 숲 열매 덤불의 분홍 열매를 먹으면 회복합니다.')};
    case 'regen': return {title: '체력이 차오르는 중', text: both(`${num(b.healthRegen?.delay ?? 5)}초 동안 공격을 맞지 않으면 체력이 저절로 찹니다.`)};
    case 'dodge': return {title: '회피로 피할 수 있어요', text: {desktop: '돌진 공격은 Space를 짧게 눌러 피하세요. 잠깐 무적이 됩니다.', touch: '돌진 공격은 회피 버튼을 짧게 눌러 피하세요. 잠깐 무적이 됩니다.'}};
    case 'bigger-threat': return {title: '큰 같은 색은 나를 흡수해요', text: both('나보다 큰 같은 색 공은 나를 흡수할 수 있어요. 동행 중인 공은 흡수하지 않으니, 동행이 아니면 거리를 두세요.')};
    case 'blizzard': return {title: '눈보라', text: both('시야가 좁아지고 모두의 감지 거리가 줄어듭니다. 숨거나 몰래 다가가기 좋아요.')};
    case 'vent': return {title: '분출구가 곧 터져요', text: both('노랗게 깜빡이는 분출구는 곧 분출합니다. 원 밖으로 피하세요.')};
    case 'meteor': return {title: '운석이 떨어져요', text: both('커지는 그림자 밖으로 피하세요. 떨어진 뒤 불타는 운석구도 아프고, 식으면 테두리에 파편 먹이가 남습니다.')};
  }
  const skill = id.match(/^unlock-(E|R)-(\w+)$/);
  if (skill) {
    const [, slot, color] = skill, s = selectedSkill(b, color, slot);
    return {title: `${slot} 스킬 해금 · ${s.name}`, text: {desktop: `${SLOT_KEYS[slot].desktop} · ${skillLine(s)}`, touch: `${SLOT_KEYS[slot].touch} · ${skillLine(s)}`}};
  }
  return null;
}
const num = (v) => String(Math.round(v * 100) / 100);
const unlockTip = (id) => id.startsWith('unlock-');

export function loadTipState() {
  try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY)); return {seen: Array.isArray(v?.seen) ? v.seen : [], enabled: v?.enabled !== false}; }
  catch { return {seen: [], enabled: true}; }
}
function saveTipState(state) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* tips work without storage */ } }

export class Tips {
  constructor(game, {seen = [], enabled = true, persist = false} = {}) {
    this.game = game; this.seen = new Set(seen); this.enabled = enabled; this.persist = persist;
    this.queue = []; this.current = null; this.gap = 0; this.prev = {}; this.clock = 0;
  }
  save() { if (this.persist) saveTipState({seen: [...this.seen], enabled: this.enabled}); }
  // An event says this tip's condition just happened. Unseen tips wait in the queue; a situational tip that
  // could not be shown within TIP_STALE_SECONDS is dropped (it comes back when the situation happens again).
  notice(id) {
    if (!this.enabled || this.seen.has(id) || this.queue.some((q) => q.id === id) || this.current?.id === id || !tipText(id, this.game)) return;
    this.queue.push({id, at: this.clock});
  }
  // State-based conditions, checked every frame while the player is alive (cheap: player-only checks).
  poll() {
    const g = this.game, p = g.player, b = g.balance;
    if (!p?.alive) return;
    const edge = (key, on) => { const was = this.prev[key]; this.prev[key] = on; return on && !was; };
    if (edge('attack', p.attackUnlocked)) this.notice('unlock-attack');
    if (edge('dodge', p.dodgeUnlocked)) this.notice('unlock-dodge');
    if (edge('sprint', p.size >= (b.sprint?.unlockSize ?? 150))) this.notice('unlock-sprint');
    for (const slot of ['E', 'R']) if (edge(slot + p.color, g.abilities.unlocked(p, slot))) this.notice(`unlock-${slot}-${p.color}`);
    if (!p.attackUnlocked && g.gameTime > TIP_LOCKED_HINT_SECONDS) this.notice('attack-locked');
    if (p.companionGroup) this.notice('companion-absorb');
    if (g.era?.apocalypse && !g.era.apocalypse.active) this.notice('meteor');
    if (p.hp < p.maxHp * .5) this.notice('heal-sources');
    const regenDelay = b.healthRegen?.delay ?? 5;
    if (p.hp < p.maxHp && p.regenTimer >= regenDelay && p.regenTimer < regenDelay + 1) this.notice('regen');
    if (p.attackState === 'CHARGING' && !this.seen.has('same-color'))
      for (const e of g.getNearbyEntities(p, p.size + 60)) if (e.alive && e.behavior !== 'orb' && e.color === p.color && dist(p, e) - (p.size + e.size) / 2 <= 6) { this.notice('same-color'); break; }
    this.slow = (this.slow ?? 0) + 1;
    if (this.slow % 15) return; // the rest four times a second
    if (!this.seen.has('bigger-threat')) for (const e of g.getNearbyEntities(p, 250 + p.size)) if (e.behavior === 'ai' && canAbsorb(e, p) && dist(p, e) - (p.size + e.size) / 2 <= 250) { this.notice('bigger-threat'); break; }
    if (g.biomes?.enabled && g.biomes.regionAt(p)?.id === 'snow' && g.biomes.blizzard()) this.notice('blizzard');
    if (!this.seen.has('vent')) for (const o of g.biomeObjects?.objects ?? []) if (o.config?.effect === 'vent' && dist(p, o) - p.size / 2 - (o.config.radius ?? 0) <= 200 && ventEruptsIn(o, g.gameTime) <= VENT_WARNING_SECONDS && !g.biomeObjects.activeVent(o)) { this.notice('vent'); break; }
  }
  // blocked: a dialog, pause, autoplay or the start guide is up. Only the visible tip's timer runs then.
  update(dt, blocked = false) {
    if (!this.enabled) { this.current = null; return; }
    this.clock += dt;
    this.queue = this.queue.filter((q) => unlockTip(q.id) || this.clock - q.at <= TIP_STALE_SECONDS);
    if (!blocked) this.poll();
    if (this.current) {
      if (!blocked) this.current.left -= dt;
      if (this.current.left <= 0) { this.current = null; this.gap = TIP_GAP_SECONDS; }
      return;
    }
    if (this.gap > 0) { this.gap -= dt; return; }
    if (blocked || !this.queue.length) return;
    const i = Math.max(0, this.queue.findIndex((q) => unlockTip(q.id)));
    const [{id}] = this.queue.splice(i, 1);
    this.seen.add(id); this.save();
    this.current = {id, ...tipText(id, this.game), left: TIP_SHOW_SECONDS};
  }
  dismiss() { if (this.current) { this.current = null; this.gap = TIP_GAP_SECONDS; } }
  disable() { this.enabled = false; this.queue = []; this.current = null; this.save(); }
  reset() { this.seen.clear(); this.enabled = true; this.queue = []; this.current = null; this.gap = 0; this.prev = {}; this.save(); }
}

