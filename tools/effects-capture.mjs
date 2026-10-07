// Effects master (planning 00_기준/master/이펙트.md): current captures for the "art crop | game | resource" rows.
// Serve with `python tools/capture-serve.py --port 8003 --out <dir>`, then in the console of
//   tools/character-effects-review.html: await (await import('/tools/effects-capture.mjs')).captureCharacterEffects()
//   tools/ability-effects-review.html:   await (await import('/tools/effects-capture.mjs')).captureAbilityEffects()
//   index.html (code-drawn statuses):    await (await import('/tools/effects-capture.mjs')).captureStatusEffects(window.__game)
// Every shot is the real Game.render, cropped around the player and PUT to /__capture/fx-<name>.jpg.
import {growthFromSize} from '../js/entity.js';

async function shoot(game, name, size, quality = .86) {
  const {canvas, camera: cam, player: p} = game;
  const sx = (p.x - cam.x) * cam.zoom + canvas.width / 2, sy = (p.y - cam.y) * cam.zoom + canvas.height / 2;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#11151c'; ctx.fillRect(0, 0, size, size);
  ctx.drawImage(canvas, sx - size / 2, sy - size / 2, size, size, 0, 0, size, size);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
  const res = await fetch(`/__capture/fx-${name}.jpg`, {method: 'PUT', body: blob});
  return `fx-${name}.jpg ${res.status}`;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Combat and benefit rasters on one cyan size-100 ball on grassland, zoom 1.
export async function captureCharacterEffects() {
  const R = window.artReview, base = {biome: 'grassland', size: 100, color: 'cyan', zoom: 1, direction: 0, combat: 'idle', status: 'none'}, out = [];
  for (const [name, over] of [['charge-hold', {combat: 'hold'}], ['charge-dash', {combat: 'charge'}], ['dodge', {combat: 'dodge'}], ['impact', {combat: 'hit'}],
    ['shield', {status: 'shield'}], ['strength', {status: 'buff'}], ['frostbite', {status: 'frost'}], ['growth', {status: 'growth'}]]) {
    await R.set({...base, ...over}); await wait(150); R.render();
    out.push(await shoot(R.game, name, 300));
  }
  for (const kind of ['heal', 'frost']) { await R.set(base); R.probe(kind); await wait(150); R.render(); out.push(await shoot(R.game, kind === 'heal' ? 'heal' : 'frost-clear', 300)); }
  await R.set(base); document.getElementById('absorption').click(); await wait(150); R.render(); out.push(await shoot(R.game, 'absorption', 360));
  return out;
}

// Every E/R skill at size 200, zoom 0.5, in the given phase (fire = the cast moment; ranges reach ~480 world = 240px).
export async function captureAbilityEffects(phase = 'fire') {
  const A = window.abilityReview, out = [];
  for (const option of document.getElementById('skill').options) {
    await A.set({skill: option.value, size: 200, biome: 'grassland', zoom: '.5', direction: 0, phase}); await wait(150); A.render();
    out.push(await shoot(A.game, `skill-${option.value.replace(/[^A-Za-z0-9_-]+/g, '-')}-${phase}`, 560));
  }
  return out;
}

// Statuses that are drawn in code only (no raster resource): one size-60 player on grassland, zoom 1.5, flags set one at a time.
export async function captureStatusEffects(game) {
  const p = game.player, b = game.balance, out = [];
  const keep = {entities: game.entities, x: p.x, y: p.y, growth: p.growth, camera: {...game.camera}, paused: game.paused, names: game.ui.preferences?.names};
  p.growth = growthFromSize(60, b.player.startingSize, b.growth.growthToSizeRatio ?? b.growth.ratio, b.growth); p.refreshFromGrowth(b);
  const spot = (game.biomes.labels ?? game.biomes.regions).find((r) => r.id === 'grassland');
  game.paused = true; if (game.ui.preferences) game.ui.preferences.names = false;
  const t = game.gameTime, scenes = [
    ['frozen', () => { p.frozen = 3; }, () => { p.frozen = 0; }],
    ['gold-shell', () => { p.dustInvulnerableRemaining = 3; }, () => { p.dustInvulnerableRemaining = 0; }],
    ['obsidian', () => Object.assign(p, {obsidianShieldHp: 60, obsidianShieldMax: 100, obsidianShieldUntil: t + 5}), () => Object.assign(p, {obsidianShieldHp: 0, obsidianShieldUntil: 0})],
    ['charm-flower', () => Object.assign(p, {companionCharmUntil: t + 5, companionCharmPower: .2, companionDecoration: 'flower'}), () => { p.companionCharmUntil = 0; }],
    ['charm-shell', () => Object.assign(p, {companionCharmUntil: t + 5, companionCharmPower: .2, companionDecoration: 'shell'}), () => { p.companionCharmUntil = 0; }],
    ['absorb-lock', () => { p.summoned = {absorbable: false, absorbableAt: t + 5}; }, () => { delete p.summoned; }],
    ['frost-mark', () => game.abilities.frostMarks.push({target: p, expires: t + 5}), () => { game.abilities.frostMarks = game.abilities.frostMarks.filter((m) => m.target !== p); }],
  ];
  try {
    game.entities = [p]; p.x = spot.x; p.y = spot.y;
    for (const [name, on, off] of scenes) {
      on(); Object.assign(game.camera, {x: p.x, y: p.y, zoom: 1.5}); game.render(); await wait(60); game.render();
      out.push(await shoot(game, `status-${name}`, 300)); off();
    }
  } finally {
    Object.assign(p, {x: keep.x, y: keep.y, growth: keep.growth}); p.refreshFromGrowth(b); game.entities = keep.entities; Object.assign(game.camera, keep.camera); game.paused = keep.paused;
    if (game.ui.preferences) game.ui.preferences.names = keep.names;
  }
  return out;
}
