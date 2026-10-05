// spec-trace: rule cards (planning/rules/*.md) vs the implementation checkout.
// Usage: node tools/spec-trace.mjs --impl <implementation dir> [--commit <label>] [--out rules/SPEC_TRACE.md]
// Zero dependencies. Checks per card (listed under "- 확인:"):
//   config <dotted.path[idx]> (=|>=|<=) <value>   value is read from <impl>/config/gameBalance.json
//   symbol <file> :: <name>                        file exists and the identifier appears in it
//   test   <file> :: <title substring>             file exists and a test title contains the text
//   file   <path>                                  path exists
//   skill  <id> <key> (=|>=|<=) <value>            value in js/skillCatalog.js entry '<id>':{...key:value...}
//   obj    <id> <key> (=|>=|<=) <value>            same for js/biomeObjectCatalog.js
//   code   <file> :: <regex>                       regex matches somewhere in the file
// Tags: an ID written in a js/** comment or tests/** title (e.g. // R-COMBAT-001) is reported per card and counts as evidence.
// A card is 구현됨 when it has >=1 config/symbol/file check and all of them pass,
// 검증됨 when it has >=1 test check and all of them pass, 상충 when a config value differs.
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
// Default layout 1 (planning repo): rules/ next to tools/, implementation in ../ball-game-next-source.
// Default layout 2 (implementation repo): config/gameBalance.json at the repo root, rules in planning/rules.
const inImpl = fs.existsSync(path.join(root, 'config', 'gameBalance.json'));
const impl = path.resolve(opt('impl', inImpl ? root : path.resolve(root, '..', 'ball-game-next-source')));
const rulesDir = path.resolve(opt('rules', fs.existsSync(path.join(root, 'rules')) ? path.join(root, 'rules') : path.join(root, 'planning', 'rules')));
const outFile = path.resolve(opt('out', path.join(rulesDir, 'SPEC_TRACE.md')));
let commit = opt('commit', '');
if (!commit) { try { commit = execSync('git rev-parse --short HEAD', {cwd: impl, stdio: ['ignore', 'pipe', 'ignore']}).toString().trim(); } catch { commit = '(git 정보 없음)'; } }

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
let balance = null;
try { balance = JSON.parse(read(path.join(impl, 'config', 'gameBalance.json'))); } catch { /* reported per check */ }

function getPath(obj, p) {
  const parts = p.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (const k of parts) { if (cur == null) return undefined; cur = cur[k]; }
  return cur;
}
const num = (s) => (s === 'true' ? true : s === 'false' ? false : s !== '' && !Number.isNaN(Number(s)) ? Number(s) : s);

function runCheck(c) {
  if (c.kind === 'config') {
    const m = c.arg.match(/^(\S+)\s*(>=|<=|=)\s*(.+)$/);
    if (!m) return {ok: false, conflict: false, msg: '형식 오류'};
    if (!balance) return {ok: false, conflict: false, msg: 'gameBalance.json 없음'};
    const actual = getPath(balance, m[1]), want = num(m[3].trim());
    if (actual === undefined) return {ok: false, conflict: false, msg: `키 없음 ${m[1]}`};
    const pass = m[2] === '=' ? actual === want : m[2] === '>=' ? actual >= want : actual <= want;
    return {ok: pass, conflict: !pass, msg: pass ? `${m[1]} ${m[2]} ${want}` : `${m[1]} 기대 ${m[2]} ${want}, 실제 ${actual}`};
  }
  if (c.kind === 'symbol' || c.kind === 'test') {
    const [file, what] = c.arg.split('::').map((s) => s.trim());
    const text = read(path.join(impl, file));
    if (text == null) return {ok: false, conflict: false, msg: `파일 없음 ${file}`};
    if (c.kind === 'symbol') {
      const found = new RegExp('(^|[^A-Za-z0-9_$])' + what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z0-9_$]|$)').test(text);
      return {ok: found, conflict: false, msg: found ? `${file} :: ${what}` : `식별자 없음 ${file} :: ${what}`};
    }
    const found = text.split('\n').some((l) => /\btest\(/.test(l) && l.includes(what));
    return {ok: found, conflict: false, msg: found ? `${file} :: ${what}` : `테스트 제목 없음 ${file} :: ${what}`};
  }
  if (c.kind === 'skill' || c.kind === 'obj') {
    const file = c.kind === 'skill' ? 'js/skillCatalog.js' : 'js/biomeObjectCatalog.js';
    const m = c.arg.match(/^(\S+)\s+(\S+)\s*(>=|<=|=)\s*(.+)$/);
    if (!m) return {ok: false, conflict: false, msg: '형식 오류'};
    const text = read(path.join(impl, file));
    if (text == null) return {ok: false, conflict: false, msg: `파일 없음 ${file}`};
    const line = text.split(String.fromCharCode(10)).find((l) => l.includes(`'${m[1]}':{`));
    if (!line) return {ok: false, conflict: false, msg: `항목 없음 ${m[1]}`};
    const vm = line.match(new RegExp('[,{]' + m[2] + ':([^,}]+)'));
    if (!vm) return {ok: false, conflict: false, msg: `키 없음 ${m[1]}.${m[2]}`};
    const actual = num(vm[1].replace(/^'|'$/g, '')), want = num(m[4].trim());
    const pass = m[3] === '=' ? actual === want : m[3] === '>=' ? actual >= want : actual <= want;
    return {ok: pass, conflict: !pass, msg: pass ? `${m[1]}.${m[2]} ${m[3]} ${want}` : `${m[1]}.${m[2]} 기대 ${m[3]} ${want}, 실제 ${actual}`};
  }
  if (c.kind === 'code') {
    const [file, pattern] = c.arg.split('::').map((x) => x.trim());
    const text = read(path.join(impl, file));
    if (text == null) return {ok: false, conflict: false, msg: `파일 없음 ${file}`};
    let ok = false; try { ok = new RegExp(pattern).test(text); } catch { return {ok: false, conflict: false, msg: '정규식 오류'}; }
    return {ok, conflict: false, msg: ok ? `${file} ~ ${pattern}` : `패턴 없음 ${file} ~ ${pattern}`};
  }
  if (c.kind === 'file') {
    const ok = fs.existsSync(path.join(impl, c.arg));
    return {ok, conflict: false, msg: ok ? c.arg : `경로 없음 ${c.arg}`};
  }
  return {ok: false, conflict: false, msg: `알 수 없는 확인 종류 ${c.kind}`};
}

function parseCards(file) {
  const text = read(file) ?? '';
  const parts = text.split(/^### (?=R-[A-Z]+-\d{3} )/m).slice(1);
  return parts.map((blk) => {
    const lines = blk.split('\n');
    const [, id, title] = lines[0].match(/^(R-[A-Z]+-\d{3}) · (.+?)\s*$/) ?? [];
    const card = {id, title, status: '', rule: '', source: '', checks: [], file: path.basename(file)};
    let inChecks = false;
    for (const raw of lines.slice(1)) {
      const l = raw.replace(/\r$/, '');
      let m;
      if ((m = l.match(/^- 규칙:\s*(.*)$/))) { card.rule = m[1]; inChecks = false; }
      else if ((m = l.match(/^- 상태:\s*(.*)$/))) { card.status = m[1].trim(); inChecks = false; }
      else if ((m = l.match(/^- 출처:\s*(.*)$/))) { card.source = m[1]; inChecks = false; }
      else if (/^- 확인:/.test(l)) inChecks = true;
      else if (inChecks && (m = l.match(/^\s{2}- (config|symbol|test|file|skill|obj|code)\s+(.+?)\s*$/))) card.checks.push({kind: m[1], arg: m[2]});
      else if (/^- /.test(l)) inChecks = false;
    }
    return id ? card : null;
  }).filter(Boolean);
}

const tagCount = {};
function scanTags(dir, kind) {
  const base = path.join(impl, dir);
  if (!fs.existsSync(base)) return;
  for (const f of fs.readdirSync(base, {recursive: true})) {
    if (!/\.(m?js)$/.test(String(f))) continue;
    for (const id of (read(path.join(base, String(f))) ?? '').match(/R-[A-Z]+-\d{3}/g) ?? []) {
      (tagCount[id] ??= {code: 0, test: 0})[kind]++;
    }
  }
}
scanTags('js', 'code'); scanTags('tests', 'test');
const files = fs.existsSync(rulesDir)
  ? fs.readdirSync(rulesDir).filter((f) => /^[A-Z]+\.md$/.test(f) && !['README.md'].includes(f)).sort() : [];
const cards = files.flatMap((f) => parseCards(path.join(rulesDir, f)));
for (const c of cards) {
  c.results = c.checks.map((k) => ({...k, ...runCheck(k)}));
  const impls = c.results.filter((r) => r.kind !== 'test'), tests = c.results.filter((r) => r.kind === 'test');
  c.tags = tagCount[c.id] ?? {code: 0, test: 0};
  c.conflict = c.results.some((r) => r.conflict);
  c.verified = (tests.length > 0 && tests.every((r) => r.ok)) || (tests.length === 0 && c.tags.test > 0);
  // Behavioural rules have no config/symbol to check; their passing test titles count as the implementation evidence.
  c.implemented = impls.length > 0 ? impls.every((r) => r.ok) : (c.verified || c.tags.code > 0);
  c.broken = c.results.some((r) => !r.ok && !r.conflict);
}

const approved = cards.filter((c) => c.status.startsWith('승인'));
const pct = (n, d) => (d ? Math.round((n / d) * 100) + '%' : '-');
const domains = [...new Set(cards.map((c) => c.id.split('-')[1]))];
const L = [];
L.push('# 규칙 추적 결과 (자동 생성 — 직접 수정 금지)', '');
L.push(`생성: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · 구현 기준: \`${path.relative(root, impl) || impl}\` @ \`${commit}\``);
L.push('도구: `tools/spec-trace.mjs` · 규칙 카드: `rules/*.md` · **존재·수치 일치 검사이며 테스트 통과 여부는 `node --test`로 따로 확인한다.**', '');
L.push('## 요약', '', '| 지표 | 값 |', '|---|---|');
L.push(`| 규칙 카드 | ${cards.length}개 (승인 ${approved.length}) |`);
L.push(`| A1 승인 규칙 구현율 (구현 확인 전부 통과) | ${approved.filter((c) => c.implemented).length}/${approved.length} = ${pct(approved.filter((c) => c.implemented).length, approved.length)} |`);
L.push(`| A2 검증율 (연결된 테스트 전부 존재) | ${approved.filter((c) => c.verified).length}/${approved.length} = ${pct(approved.filter((c) => c.verified).length, approved.length)} |`);
L.push(`| A5 상충 (기획 수치 ≠ 구현 수치) | ${cards.filter((c) => c.conflict).length}건 |`);
L.push(`| 확인 실패(식별자·테스트·경로 없음) | ${cards.filter((c) => c.broken).length}건 |`);
L.push(`| 테스트 미연결 카드 | ${approved.filter((c) => !c.checks.some((k) => k.kind === 'test') && !c.tags.test).length}건 |`);
L.push(`| ID 태그가 코드/테스트에 있는 카드 | ${cards.filter((c) => c.tags.code || c.tags.test).length}개 |`, '');
for (const d of domains) {
  const cs = cards.filter((c) => c.id.split('-')[1] === d);
  L.push(`## ${d}`, '', '| ID | 규칙 | 상태 | 구현 | 검증 | 비고 |', '|---|---|---|---|---|---|');
  for (const c of cs) {
    const notes = c.results.filter((r) => !r.ok).map((r) => `❌ ${r.msg}`);
    if (!c.checks.some((k) => k.kind === 'test') && !c.tags.test) notes.push('테스트 미연결');
    if (c.tags.code || c.tags.test) notes.push(`태그 코드${c.tags.code}/테스트${c.tags.test}`);
    L.push(`| ${c.id} | ${c.title} | ${c.status} | ${c.conflict ? '⚠ 상충' : c.implemented ? (c.checks.some((k) => k.kind !== 'test') ? '✅' : '✅(테스트)') : c.broken ? '❌' : '—'} | ${c.verified ? '✅' : '—'} | ${notes.join('<br>') || ''} |`);
  }
  L.push('');
}
fs.writeFileSync(outFile, L.join('\n'), 'utf8');
const bad = cards.filter((c) => c.conflict || c.broken);
console.log(`cards=${cards.length} approved=${approved.length} implemented=${approved.filter((c) => c.implemented).length} verified=${approved.filter((c) => c.verified).length} conflicts=${cards.filter((c) => c.conflict).length} broken=${cards.filter((c) => c.broken).length}`);
for (const c of bad) for (const r of c.results.filter((x) => !x.ok)) console.log(`  ${c.id}: ${r.msg}`);
console.log('wrote ' + path.relative(process.cwd(), outFile));
process.exit(bad.length ? 1 : 0);
