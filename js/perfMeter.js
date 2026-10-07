// Performance meter (pt1-09 "렉 관련 관리 문서"): the last N frames of the main loop, split into
// update / render / UI time plus the frame interval. Observation only: it never touches game state or RNG.
export const PERF_WINDOW = 300; // about five seconds at 60 fps
export const SLOW_FRAME_MS = 33; // a frame slower than 30 fps

export function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

export class PerfMeter {
  constructor(size = PERF_WINDOW) {
    this.size = size;
    this.rows = {interval: [], update: [], render: [], ui: []};
  }
  record(sample) {
    for (const key of Object.keys(this.rows)) {
      const row = this.rows[key];
      row.push(sample[key] ?? 0);
      if (row.length > this.size) row.shift();
    }
  }
  summary(game) {
    const r = this.rows, n = r.interval.length;
    const meanInterval = n ? r.interval.reduce((a, b) => a + b, 0) / n : 0;
    const part = (key) => ({p50: +percentile(r[key], .5).toFixed(2), p95: +percentile(r[key], .95).toFixed(2), max: +Math.max(0, ...r[key]).toFixed(2)});
    const p = game?.player;
    return {
      frames: n,
      fps: meanInterval ? Math.round(1000 / meanInterval) : 0,
      slowFrames: r.interval.filter((v) => v > SLOW_FRAME_MS).length,
      interval: part('interval'), update: part('update'), render: part('render'), ui: part('ui'),
      context: game ? {
        entities: game.entities.filter((e) => e.alive).length,
        region: p ? game.biomes?.regionAt?.(p)?.id ?? null : null,
        blizzard: !!game.biomes?.blizzard?.(),
        blurOff: !!(game.biomes?.fogSoftware || (game.biomes?.fogSlowFrames ?? 0) >= 90),
        zoom: +(game.camera?.zoom ?? 1).toFixed(2),
        size: p ? Math.round(p.size) : null,
        gameTime: Math.round(game.gameTime ?? 0),
      } : null,
    };
  }
}

export function perfLine(s) {
  return `프레임 ${s.fps}fps · 간격 p95 ${s.interval.p95}ms · 최대 ${s.interval.max}ms · 느린 프레임 ${s.slowFrames}/${s.frames}`
    + ` · 갱신/그리기/UI p95 ${s.update.p95}/${s.render.p95}/${s.ui.p95}ms`
    + (s.context ? ` · 개체 ${s.context.entities} · ${s.context.region ?? '-'}` : '');
}
