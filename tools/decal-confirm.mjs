// decal-confirm: makes decal bench placement results permanent — writes their layout changes into DECAL_LAYOUT (js/decalCatalog.js).
// Usage: node tools/decal-confirm.mjs <review file> [--write]
// The review file is the text copied from tools/decal-bench.html ("[데칼 검수] …" with decal-review-v1 JSON lines).
// Without --write it only prints the plan. Values are clamped to DECAL_BOUNDS and min < max is checked before the file is touched.
// Image verdicts and work requests are not written here; they go to the planning decal master (00_기준/master/데칼.md).
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DECAL_LAYOUT, DECAL_BOUNDS} from '../js/decalCatalog.js';

export const CATALOG_PATH = fileURLToPath(new URL('../js/decalCatalog.js', import.meta.url));

export function readReviews(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim(); if (!s.startsWith('{')) continue;
    try { const r = JSON.parse(s); if (r.format === 'decal-review-v1' && DECAL_LAYOUT[r.region]) out.push(r); } catch {}
  }
  return out;
}
// Planned layouts per region after applying every review's "to" values (later lines win).
export function plan(reviews) {
  const next = {}, notes = [];
  for (const r of reviews) for (const [key, pair] of Object.entries(r.layout || {})) {
    const [from, to] = pair, cur = next[r.region] ?? {...DECAL_LAYOUT[r.region], size: [...DECAL_LAYOUT[r.region].size]};
    const now = key === 'min' ? cur.size[0] : key === 'max' ? cur.size[1] : cur[key];
    if (Math.abs(now - from) > 1e-9) notes.push(`${r.region}.${key}: 검수 때 값 ${from}이 지금 값 ${now}과 다름(그 사이 바뀜)`);
    const [lo, hi] = DECAL_BOUNDS[key === 'min' || key === 'max' ? 'size' : key], v = Math.max(lo, Math.min(hi, Number(to)));
    if (key === 'min') cur.size[0] = Math.round(v); else if (key === 'max') cur.size[1] = Math.round(v); else cur[key] = key === 'inset' ? Math.round(v) : v;
    next[r.region] = cur;
  }
  for (const [region, l] of Object.entries(next)) if (!(l.size[0] < l.size[1])) throw new Error(`${region}: 최소 크기(${l.size[0]})가 최대 크기(${l.size[1]})보다 작아야 합니다`);
  return {next, notes};
}
const num = (v) => Math.abs(v - 1 / 3) < 1e-9 ? '1/3' : String(+v.toFixed(4));
export const layoutLine = (region, l) => ` ${region}:{chance:${num(l.chance)},size:[${l.size[0]},${l.size[1]}],inset:${l.inset}},`;
export function rewrite(source, next) {
  let out = source;
  for (const [region, l] of Object.entries(next)) {
    const re = new RegExp(`^ ${region}:\\{chance:[^\\n]*\\},$`, 'm');
    if (!re.test(out)) throw new Error(`${region} 줄을 찾지 못했습니다`);
    out = out.replace(re, layoutLine(region, l));
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file) { console.error('사용법: node tools/decal-confirm.mjs <검수 파일> [--write]'); process.exit(2); }
  const reviews = readReviews(fs.readFileSync(file, 'utf8')), {next, notes} = plan(reviews);
  for (const n of notes) console.log('주의: ' + n);
  if (!Object.keys(next).length) { console.log('배치 변경이 없습니다(이미지 판정·작업 요청은 데칼 마스터에 적습니다).'); process.exit(0); }
  for (const [region, l] of Object.entries(next)) console.log(layoutLine(region, l).trim());
  if (rest.includes('--write')) { fs.writeFileSync(CATALOG_PATH, rewrite(fs.readFileSync(CATALOG_PATH, 'utf8'), next)); console.log('썼습니다 → js/decalCatalog.js'); }
  else console.log('(미리보기 — 쓰려면 --write)');
}
