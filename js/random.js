// Named streams isolate presentation from gameplay. One active Game per JS realm.
let streams = new Map();
export function resetRandom(seed) {
  streams = new Map();
  for (const name of ['world', 'ai', 'physics', 'visual', 'names', 'affinity', 'respawn']) {
    let state = seed >>> 0;
    for (const c of name) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
    streams.set(name, state);
  }
}
export function random(name = 'world') {
  if (!streams.has(name)) resetRandom(Date.now());
  let a = (streams.get(name) + 0x6D2B79F5) >>> 0;
  streams.set(name, a);
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
