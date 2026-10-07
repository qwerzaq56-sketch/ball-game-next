// Balancing observation: where the player's HP comes back from, split by source, at chosen sizes.
//   node tools/heal-sources.mjs pass      — cross one ripe berry grove once (no hits), from 30% HP
//   node tools/heal-sources.mjs stand     — stand on a grove for 30s (no enemies), from 30% HP
//   node tools/heal-sources.mjs autoplay [minutes=4] [size=220] — autoplay started at a size; source split and 3s jumps of 25%p+
// Sources: growth (max-HP rise from growth also raises HP), berry (heal berry), absorb (+N HP on absorbing),
// oasis (heal objects), regen (natural regen), respawn (Life respawn refill), other.
import {createGame} from './headless.mjs';
import {applyObjectPreset, defaultObjectPreset} from '../js/biomeObjectCatalog.js';

const growTo = (g, p, size) => { let lo = 0, hi = 1e6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; p.growth = m; p.refreshFromGrowth(g.balance); if (p.size < size) lo = m; else hi = m; } p._recomputeStacks?.(g.balance, false); };
const pct = (v, m) => Math.round(100 * v / m);
const groveGame = (size) => {
  const g = createGame(7); g.biomes.enabled = true; applyObjectPreset(g.balance, defaultObjectPreset()); g.biomeObjects.sync();
  const o = g.biomeObjects.objects.find((o) => o.config.effect === 'berry-spawner'), p = g.player; growTo(g, p, size);
  g.entities = [p]; g.update(1 / 60); return {g, o, p};
};
function tracker(g) {
  const s = {growth: 0, berry: 0, absorb: 0, oasis: 0, regen: 0, respawn: 0, other: 0}; let hooked = null, frame = {};
  const hook = (p) => { const r = p.refreshFromGrowth.bind(p); p.refreshFromGrowth = (b) => { const h = p.hp; r(b); frame.growth = (frame.growth ?? 0) + (p.hp - h); }; };
  const respawn = g.respawnPlayer.bind(g); g.respawnPlayer = () => { frame.respawned = true; return respawn(); };
  const text = g.spawnFloatingText.bind(g);
  g.spawnFloatingText = (x, y, t, c) => { const p = g.player; if (Math.hypot(x - p.x, y - p.y) < 1) { let m = /^회복 \+(\d+)/.exec(t); if (m) frame.berry = (frame.berry ?? 0) + +m[1]; m = /^\+(\d+) HP/.exec(t); if (m) frame.absorb = (frame.absorb ?? 0) + +m[1]; } return text(x, y, t, c); };
  return {s, step() {
    const p = g.player; if (p !== hooked) { hooked = p; hook(p); }
    const h0 = p.hp; frame = {}; const regenOn = p.regenTimer + 1 / 60 >= g.balance.healthRegen.delay && p.hp < p.maxHp;
    g.update(1 / 60);
    if (g.player !== p || !p.alive) return null;
    const d = p.hp - h0, parts = {};
    if (frame.respawned) parts.respawn = Math.max(0, d);
    else {
      parts.growth = frame.absorb ? 0 : Math.max(0, frame.growth ?? 0); // absorbing resets HP to the pre-growth value, then refunds
      parts.berry = frame.berry ?? 0; parts.absorb = frame.absorb ?? 0;
      const rest = d - parts.growth - parts.berry - parts.absorb;
      const inOasis = g.biomeObjects.objects.some((o) => o.config.effect === 'heal' && Math.hypot(o.x - p.x, o.y - p.y) <= o.config.radius + p.size / 2);
      if (rest > 0) parts[inOasis ? 'oasis' : regenOn ? 'regen' : 'other'] = rest;
    }
    for (const [k, v] of Object.entries(parts)) if (v > 0) s[k] += v;
    return {d, parts};
  }};
}
const sizes = [40, 52, 80, 120, 200, 300, 400];
const mode = process.argv[2] ?? 'pass', out = {mode, rows: []};
if (mode === 'pass') {
  for (const size of sizes) {
    const {g, o, p} = groveGame(size), span = o.config.radius + p.size / 2 + 80, speed = g.balance.player.moveSpeed ?? 250;
    p.x = o.x - span; p.y = o.y; p.hp = p.maxHp * .3; p.regenTimer = 0; const t = tracker(g), m = p.maxHp;
    for (let x = -span; x <= span; x += speed / 60) { p.x = o.x + x; p.y = o.y; t.step(); }
    out.rows.push({size, maxHp: Math.round(m), endPct: pct(p.hp, p.maxHp), gainPctPoints: pct(p.hp, p.maxHp) - 30, growthPct: pct(t.s.growth, m), berryPct: pct(t.s.berry, m), berryShown: Math.round(t.s.berry)});
  }
} else if (mode === 'stand') {
  for (const size of sizes) {
    const {g, o, p} = groveGame(size); p.x = o.x; p.y = o.y; p.hp = p.maxHp * .3; p.regenTimer = 0; const t = tracker(g), m = p.maxHp, at = {};
    for (let f = 1; f <= 60 * 30; f++) { p.x = o.x + Math.cos(f / 40) * 30; p.y = o.y + Math.sin(f / 40) * 30; t.step(); if (f % 600 === 0) at[`${f / 60}s`] = pct(p.hp, p.maxHp); }
    out.rows.push({size, maxHp: Math.round(m), pctAt: at, growthPct: pct(t.s.growth, m), berryPct: pct(t.s.berry, m), regenPct: pct(t.s.regen, m)});
  }
} else if (mode === 'autoplay') {
  const minutes = +(process.argv[3] ?? 4), size = +(process.argv[4] ?? 220), total = {}; out.jumps = [];
  for (const seed of [7, 23, 41, 59]) {
    const g = createGame(seed); g.autoplay.setEnabled(true); growTo(g, g.player, size); g.player.hp = g.player.maxHp;
    const t = tracker(g), win = [];
    for (let f = 0; f < minutes * 3600 && !g.gameOver; f++) {
      const r = t.step(); if (!r) { win.length = 0; continue; }
      win.push(r); if (win.length > 180) win.shift();
      const p = g.player, gain = win.reduce((a, w) => a + Math.max(0, w.d), 0) / p.maxHp;
      if (gain >= .25 && win.length === 180) {
        const by = {}; for (const w of win) for (const [k, v] of Object.entries(w.parts)) by[k] = (by[k] ?? 0) + v / p.maxHp;
        out.jumps.push({seed, t: +g.gameTime.toFixed(1), size: Math.round(p.size), gainPct: Math.round(gain * 100), by: Object.fromEntries(Object.entries(by).filter(([, v]) => v > .005).map(([k, v]) => [k, Math.round(v * 100)]))}); win.length = 0;
      }
    }
    out.rows.push({seed, endSize: Math.round(g.player.size), alive: g.player.alive, ...Object.fromEntries(Object.entries(t.s).map(([k, v]) => [k, Math.round(v)]))});
    for (const [k, v] of Object.entries(t.s)) total[k] = (total[k] ?? 0) + v;
  }
  const sum = Object.values(total).reduce((a, b) => a + b, 0) || 1;
  out.share = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, +(100 * v / sum).toFixed(1)]));
} else throw new Error(`unknown mode ${mode}`);
console.log(JSON.stringify(out, null, 1));
