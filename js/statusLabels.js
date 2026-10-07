// R-VIS-009: every status effect gets a readable chip under the body, and object effects
// announce what they change and for how long. Pure helpers; drawing never mutates game state or RNG.

const pct = (v) => `${Math.round(v * 100)}%`;
const secs = (v) => `${Math.max(1, Math.ceil(v))}s`;
// Mock or minimal canvases may not measure text; fall back to an estimate so drawing never throws.
export const textWidth = (ctx, text, font) => { const m = ctx.measureText?.(text); return Number.isFinite(m?.width) ? m.width : text.length * font * 0.62; };

// Shield HP that still blocks damage (cyan/tree shield plus an active obsidian shield); HP bars draw it as a grey segment.
export function shieldAmount(e, now) {
  return Math.max(0, e.shieldHp ?? 0) + ((e.obsidianShieldUntil ?? 0) > now ? Math.max(0, e.obsidianShieldHp ?? 0) : 0);
}

// Status chips for one unit. Order is stable so rows do not jump between frames.
export function statusChips(e, game) {
  const now = game.gameTime, out = [];
  const add = (text, color, kind) => out.push({text, color, kind});
  if (e.summoned && !e.summoned.absorbable && (e.summoned.absorbableAt ?? 0) > now) add(`흡수 불가 ${secs(e.summoned.absorbableAt - now)}`, '#4ade80', 'absorb-lock');
  if (e.frozen > 0) add(`빙결 ${secs(e.frozen)}`, '#dffaff', 'frozen');
  else if ((e.freezeImmune ?? 0) > 0) add(`빙결 면역 ${secs(e.freezeImmune)}`, '#a5f3fc', 'freeze-immune');
  if ((e.frostbiteRemaining ?? 0) > 0) add('❄ 동상', '#cffafe', 'frostbite');
  if (e.wavePush) add('밀림', '#93c5fd', 'push');
  if ((e.dustInvulnerableRemaining ?? 0) > 0) add(`무적 ${secs(e.dustInvulnerableRemaining)}`, '#fde68a', 'invulnerable');
  if ((e.respawnInvulnerableRemaining ?? 0) > 0) add(`부활 무적 ${secs(e.respawnInvulnerableRemaining)}`, '#fde68a', 'respawn-invulnerable');
  if ((e.shieldHp ?? 0) > 0 && (e.shieldRemaining ?? 0) > 0) add(`보호막 ${Math.ceil(e.shieldHp)} · ${secs(e.shieldRemaining)}`, '#a5f3fc', 'shield');
  if ((e.obsidianShieldHp ?? 0) > 0 && (e.obsidianShieldUntil ?? 0) > now) add(`흑요석 막 ${secs(e.obsidianShieldUntil - now)}`, '#c4b5fd', 'obsidian-shield');
  if ((e.objectSpeedUntil ?? 0) > now) add(`가속 +${pct((e.objectSpeedMultiplier ?? 1) - 1)} ${secs(e.objectSpeedUntil - now)}`, '#7dd3fc', 'speed');
  if ((e.objectFrostUntil ?? 0) > now) add(`동상 저항 ${secs(e.objectFrostUntil - now)}`, '#e0f2fe', 'frost-guard');
  if ((e.companionCharmUntil ?? 0) > now) add(`치장 · 동행 +${pct(e.companionCharmPower ?? 0)} ${secs(e.companionCharmUntil - now)}`, e.companionDecoration === 'shell' ? '#fef3c7' : '#f9a8d4', 'charm');
  const buffs = (e.inviteBuffs ?? []).filter((b) => b.expires > now);
  if (buffs.length) add(`동행 강화 ×${buffs.length}`, '#86efac', 'invite');
  if ((e.windStoneStacks ?? 0) > 0) add(`바람 ${e.windStoneStacks}/3`, '#7dd3fc', 'wind-stack');
  if ((e.obsidianStacks ?? 0) > 0) add(`흑요석 ${e.obsidianStacks}/3`, '#c4b5fd', 'obsidian-stack');
  if (e.command) add('지시 중', '#e2e8f0', 'command');
  return out;
}

// Chips sit under the body at a constant screen size, wrapped to at most three per row.
export function drawStatusChips(ctx, e, r, zoom, chips) {
  if (!chips.length) return;
  const font = 10 / zoom, padX = 4 / zoom, h = 14 / zoom, gap = 3 / zoom;
  ctx.save();
  ctx.font = `bold ${font}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let row = 0; row * 3 < chips.length; row++) {
    const line = chips.slice(row * 3, row * 3 + 3), widths = line.map((c) => textWidth(ctx, c.text, font) + padX * 2);
    let x = e.x - (widths.reduce((a, b) => a + b, 0) + gap * (line.length - 1)) / 2;
    const y = e.y + r + 12 / zoom + row * (h + gap);
    line.forEach((c, i) => {
      ctx.fillStyle = 'rgba(15,23,42,.78)'; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y - h / 2, widths[i], h, h / 2); else ctx.rect(x, y - h / 2, widths[i], h);
      ctx.fill(); ctx.fillStyle = c.color; ctx.fillText(c.text, x + widths[i] / 2, y);
      x += widths[i] + gap;
    });
  }
  ctx.restore();
}

// Popup text for the unit that received an object effect. `c` is the object config.
export function objectEffectText(c, e) {
  switch (c.effect) {
    case 'food': return `${c.name} · 먹이 ${c.count}개`;
    case 'heal': return `${c.name} · 체력 +${pct(c.power)}`;
    case 'shield': return `${c.name} · 보호막 최대HP ${pct(c.power)} · ${c.duration}초`;
    case 'speed': return `${c.name} · 이동 +${pct(c.power)} · ${c.duration}초${c.hpCost ? ` · 체력 -${pct(c.hpCost)}` : ''}`;
    case 'charm': return `${c.name} · 동행 수락 +${pct(c.power)} · ${c.duration}초`;
    case 'frost': return `${c.name} · 동상 저항 · ${c.duration}초`;
    case 'wind-stack': return e.windStoneStacks ? `바람 ${e.windStoneStacks}/${c.stacksRequired} · 다 모으면 이동 +${pct(c.power)}` : `바람 완성 · 이동 +${pct(c.power)} · ${c.duration}초`;
    case 'obsidian': return e.obsidianStacks ? `흑요석 ${e.obsidianStacks}/${c.stacksRequired} · 다 모으면 보호막` : `흑요석 완성 · 보호막 최대HP ${pct(c.shieldFraction)} · ${c.duration}초`;
    default: return c.name;
  }
}

// R-CTRL-006: the top-centre era banner names the current era event in words.
export function eraEventKind(game, changedAt) {
  const era = game.era, field = era.apocalypse;
  if (field) return field.active ? 'doom' : 'doom-warning';
  if (era.activeWar(game.player)) return 'war';
  if (game.gameTime - changedAt < 4) return 'transition';
  if (era.phase.id === 'war') return 'war-phase';
  return '';
}
export function eraEventText(game, changedAt) {
  const era = game.era, field = era.apocalypse, kind = eraEventKind(game, changedAt);
  if (kind === 'doom') return '파멸 진행 · 붉은 원 안 피해';
  if (kind === 'doom-warning') return `파멸 전조 · ${Math.max(0, Math.ceil(field.activeAt - game.gameTime))}초 뒤 피해`;
  if (kind === 'war') return `전쟁 · 상대 ${game.player.warTargets.size}명`;
  if (kind === 'transition') return `${era.phase.name} 시작`;
  if (kind === 'war-phase') return '전쟁기 · 최상위 간 전쟁';
  return '';
}

// R-CTRL-006: one HUD row per unlocked E/R skill, kept apart from the chips under the body.
export function skillCooldownRow(game, e, slot) {
  const skill = game.abilities.skill(e, slot), left = game.abilities.cooldown(e, slot), total = Math.max(.001, skill?.cooldown ?? left);
  const casting = e.specialCast?.slot === slot, ready = game.abilities.canCast(e, slot);
  return {
    name: skill?.name ?? '',
    text: casting ? '시전 중' : left > 0 ? `${Math.ceil(left)}s` : ready ? '준비' : '대기',
    state: casting ? 'casting' : left > 0 ? 'cooldown' : ready ? 'ready' : 'blocked',
    progress: Math.round(100 * (left > 0 ? 1 - Math.min(1, left / total) : 1)),
  };
}
