// Look-dev master (planning 00_기준/master/룩뎁.md): current in-game captures for the "art crop | game | resource" rows.
// Serve with `python tools/capture-serve.py --port 8003 --out <dir>`, open index.html, then in the console:
//   await (await import('/tools/lookdev-capture.mjs')).captureLookdev(window.__game)
// Each terrain, object and ball colour is drawn by the real Game.render at zoom 1 (balls at zoom 2) with only one
// reference ball (the player, size 40) in the world, then cropped and PUT to /__capture/<name>.jpg.
// Game state is restored afterwards; reload the page before playing.
import {growthFromSize} from '../js/entity.js';
const COLORS = ['cyan', 'blue', 'green', 'red', 'yellow'];

export async function captureLookdev(game, {crop = 360, quality = .86} = {}) {
  const p = game.player, keep = {entities: game.entities, x: p.x, y: p.y, growth: p.growth, color: p.color, colorHex: p.colorHex,
    camera: {...game.camera}, paused: game.paused, names: game.ui.preferences?.names};
  game.paused = true; if (game.ui.preferences) game.ui.preferences.names = false;
  const saved = [];
  const shoot = async (name, x, y, zoom, size = crop) => {
    Object.assign(game.camera, {x, y, zoom});
    game.render(); await new Promise((r) => setTimeout(r, 60)); game.render();
    const c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').drawImage(game.canvas, (game.canvas.width - size) / 2, (game.canvas.height - size) / 2, size, size, 0, 0, size, size);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
    const res = await fetch(`/__capture/${name}.jpg`, {method: 'PUT', body: blob});
    saved.push(`${name}.jpg ${res.status}`);
  };
  try {
    // Terrain: the region's label tile (grassland is the filler ground, so its centre may be another region), ball beside it.
    const spots = game.biomes.labels ?? game.biomes.regions;
    const b = game.balance; p.growth = growthFromSize(40, b.player.startingSize, b.growth.growthToSizeRatio ?? b.growth.ratio, b.growth); p.refreshFromGrowth(b);
    for (const region of spots) {
      game.entities = [p]; p.x = region.x + 140; p.y = region.y + 60;
      await shoot(`ground-${region.id}`, region.x, region.y, 1);
    }
    // Objects: the first placed instance of each kind, reference ball below-left.
    const seen = new Set();
    for (const o of game.biomeObjects.objects) {
      if (seen.has(o.candidate)) continue; seen.add(o.candidate);
      game.entities = [p]; p.x = o.x - 110; p.y = o.y + 110;
      await shoot(`object-${o.candidate}`, o.x, o.y, 1);
    }
    // Balls: the player recoloured, on plain grassland, zoom 2.
    const grass = spots.find((r) => r.id === 'grassland') ?? spots[0];
    for (const color of COLORS) {
      const sample = keep.entities.find((e) => e.color === color && e.colorHex);
      p.color = color; if (sample) p.colorHex = sample.colorHex;
      game.entities = [p]; p.x = grass.x + 150; p.y = grass.y;
      await shoot(`ball-${color}`, p.x, p.y, 2, 200);
    }
  } finally {
    Object.assign(p, {x: keep.x, y: keep.y, growth: keep.growth, color: keep.color, colorHex: keep.colorHex});
    p.refreshFromGrowth(game.balance);
    game.entities = keep.entities; Object.assign(game.camera, keep.camera); game.paused = keep.paused;
    if (game.ui.preferences) game.ui.preferences.names = keep.names;
  }
  return saved;
}
