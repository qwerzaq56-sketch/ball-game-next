// object-confirm: makes object bench results permanent — writes their value changes into BIOME_OBJECTS (js/biomeObjectCatalog.js).
// Usage: node tools/object-confirm.mjs <review file> [--set id.key=value ...] [--write]
// The review file is the text copied from the bench ("[오브젝트 검수] …" with object-adjust-v1 or object-review-v2 JSON lines).
// --set adds or replaces one value (Claude's own confirmation decisions, e.g. lake-current.edgeMargin=400).
// Without --write it only prints the plan. Every change is checked by normalizeObjectPreset (bounds, vent cycle, current width)
// before the file is touched; a "from" value that no longer matches the current default is reported (someone changed it since).
// Planning 03_아트/32_오브젝트_검수대_기획서.md §4 (확정 절차).
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BIOME_OBJECTS, PLACEMENT_BOUNDS, defaultObjectPreset, normalizeObjectPreset, defaultPlacedCount} from '../js/biomeObjectCatalog.js';

export const CATALOG_PATH = fileURLToPath(new URL('../js/biomeObjectCatalog.js', import.meta.url));
// Values an object has when neither the catalog nor an override sets them (same rules as BiomeObjects.sync).
export const currentDefault = (id, key) => BIOME_OBJECTS[id][key] ?? ({visualScale: 1, aspect: 1, edgeMargin: 0, spacing: 0, sameKindSpacing: 0}[key]
  ?? (key === 'placed' ? defaultPlacedCount(id, defaultObjectPreset().countPerType) : key === 'lavaMargin' ? (BIOME_OBJECTS[id].radius ?? 0) * 1.2 : undefined));

// Every {"format":"object-adjust-v1"|"object-review-v2", …} line → [{id, key, from, to}].
export function collectChanges(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim(); if (!s.startsWith('{')) continue;
    let r; try { r = JSON.parse(s); } catch { continue; }
    const changes = r.format === 'object-adjust-v1' ? r.changes : r.format === 'object-review-v2' ? {...r.size?.changes, ...r.effect?.changes} : null;
    if (!changes || !Object.hasOwn(BIOME_OBJECTS, r.id)) continue;
    for (const [key, pair] of Object.entries(changes)) if (Array.isArray(pair) && pair.length === 2) out.push({id: r.id, key, from: pair[0], to: pair[1]});
  }
  return out;
}

// Throws (Korean message from normalizeObjectPreset) unless every change is an acceptable preset value.
export function validateChanges(changes) {
  const p = defaultObjectPreset();
  for (const c of changes) (p.overrides[c.id] ??= {})[c.key] = c.to;
  normalizeObjectPreset(p);
  return changes.map((c) => ({...c, stale: c.from != null && Math.abs(c.from - currentDefault(c.id, c.key)) > 1e-9, same: Math.abs(c.to - currentDefault(c.id, c.key)) < 1e-9}));
}

const literal = (v) => typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(v).replace(/^(-?)0\./, '$1.');
// Rewrites the one-line catalog entries ` 'id':{…},` in place, keeping key order and appending new keys.
export function applyToCatalogSource(src, changes) {
  const byId = {};
  for (const c of changes) (byId[c.id] ??= {})[c.key] = c.to;
  let out = src;
  for (const [id, set] of Object.entries(byId)) {
    const re = new RegExp(`^( '${id.replace(/[-]/g, '\\-')}':)(\\{[^\\r\\n]*\\})(,?\\r?)$`, 'm'), m = out.match(re);
    if (!m) throw new Error(`카탈로그에서 ${id} 줄을 찾지 못했습니다.`);
    const entry = Function(`return (${m[2]});`)();
    for (const [k, v] of Object.entries(set)) {
      // A value equal to the implicit default is dropped instead of written (placement/body keys only).
      if (Object.hasOwn(PLACEMENT_BOUNDS, k) && !Object.hasOwn(BIOME_OBJECTS[id], k) && Math.abs(v - currentDefault(id, k)) < 1e-9) delete entry[k];
      else entry[k] = v;
    }
    out = out.replace(re, `$1{${Object.entries(entry).map(([k, v]) => `${k}:${literal(v)}`).join(',')}}$3`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const args = process.argv.slice(2), file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--set');
  const sets = args.flatMap((a, i) => a === '--set' ? [args[i + 1]] : []).map((s) => { const [, id, key, v] = s.match(/^([\w-]+)\.(\w+)=(.+)$/) || []; if (!id) throw new Error('--set 형식: id.key=value'); return {id, key, from: null, to: +v}; });
  const fromFile = file ? collectChanges(fs.readFileSync(file, 'utf8')) : [];
  // --set wins over the file for the same id.key.
  const all = [...fromFile.filter((c) => !sets.some((s) => s.id === c.id && s.key === c.key)), ...sets];
  if (!all.length) { console.log('확정할 변경이 없습니다.'); process.exit(0); }
  const checked = validateChanges(all);
  for (const c of checked) console.log(`${c.id}.${c.key}: ${currentDefault(c.id, c.key)} → ${c.to}${c.stale ? `  (주의: 제출 당시 기본값 ${c.from})` : ''}${c.same ? '  (이미 같음)' : ''}`);
  if (args.includes('--write')) { fs.writeFileSync(CATALOG_PATH, applyToCatalogSource(fs.readFileSync(CATALOG_PATH, 'utf8'), checked), 'utf8'); console.log(`썼습니다: ${checked.length}건 → js/biomeObjectCatalog.js`); }
  else console.log('(미리보기 — 쓰려면 --write)');
}
