// balance-sheet: auto-generates rules/BALANCE_SHEET.md from the implementation's tunable values.
// Usage: node tools/balance-sheet.mjs --impl <implementation dir> [--commit <label>] [--out rules/BALANCE_SHEET.md]
// Reads config/gameBalance.json (every numeric/boolean leaf) and the default skill candidates in js/skillCatalog.js,
// links each value to the rule cards that name it (`config <path>` / `skill <id> <key>` checks), and uses
// rules/balance-intent.json (path prefix -> one-line "what experience this changes") for values no card covers.
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const inImpl = fs.existsSync(path.join(root, 'config', 'gameBalance.json'));
const impl = path.resolve(opt('impl', inImpl ? root : path.resolve(root, '..', 'ball-game-next-source')));
const rulesDir = path.resolve(opt('rules', fs.existsSync(path.join(root, 'rules')) ? path.join(root, 'rules') : path.join(root, 'planning', 'rules')));
const out = path.resolve(opt('out', path.join(rulesDir, 'BALANCE_SHEET.md')));
let commit = opt('commit', '');
if (!commit) { try { commit = execSync('git rev-parse --short HEAD', {cwd: impl, stdio: ['ignore', 'pipe', 'ignore']}).toString().trim(); } catch { commit = '(git 정보 없음)'; } }
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

const balance = JSON.parse(read(path.join(impl, 'config', 'gameBalance.json')));
const intent = JSON.parse(read(path.join(rulesDir, 'balance-intent.json')) ?? '{}');

// rule cards -> which config/skill values they pin
const cardOf = {}; // key -> [{id,title}]
const link = (k, c) => { (cardOf[k] ??= []).push(c); };
for (const f of fs.readdirSync(rulesDir).filter((x) => /^[A-Z]+\.md$/.test(x))) {
  const text = read(path.join(rulesDir, f)).replace(/\r\n/g, '\n');
  for (const blk of text.split(/^### (?=R-[A-Z]+-\d{3} )/m).slice(1)) {
    const m = blk.match(/^(R-[A-Z]+-\d{3}) · (.+)$/m); if (!m) continue;
    const card = {id: m[1], title: m[2].trim()};
    for (const l of blk.split('\n')) {
      let x;
      if ((x = l.match(/^\s{2}- config\s+(\S+)\s*(?:>=|<=|=)/))) link('config:' + x[1].replace(/\[(\d+)\]/g, '.$1'), card);
      else if ((x = l.match(/^\s{2}- skill\s+(\S+)\s+(\S+)\s*(?:>=|<=|=)/))) link(`skill:${x[1]}.${x[2]}`, card);
      else if ((x = l.match(/^\s{2}- obj\s+(\S+)\s+(\S+)\s*(?:>=|<=|=)/))) link(`obj:${x[1]}.${x[2]}`, card);
    }
  }
}

// flatten config
const leaves = [];
(function walk(o, p) {
  if (o && typeof o === 'object') for (const [k, v] of Array.isArray(o) ? o.map((v, i) => [i, v]) : Object.entries(o)) walk(v, p ? p + '.' + k : String(k));
  else if (typeof o === 'number' || typeof o === 'boolean') leaves.push({path: p, value: o});
})(balance, '');

const intentFor = (p) => {
  let best = '';
  for (const k of Object.keys(intent)) if ((p === k || p.startsWith(k + '.') || p.startsWith(k)) && k.length > best.length) best = k;
  return best ? intent[best] : '';
};

// default skill candidates from skillCatalog.js
const skillText = read(path.join(impl, 'js', 'skillCatalog.js')) ?? '';
const defaults = {};
const dm = skillText.match(/DEFAULT_SKILLS=\{([^;]+)\};/);
if (dm) for (const m of dm[1].matchAll(/(\w+):\{E:'([\w-]+)',R:'([\w-]+)'\}/g)) { defaults[m[2]] = m[1] + ' E'; defaults[m[3]] = m[1] + ' R'; }
const skills = [];
for (const line of skillText.split('\n')) {
  const m = line.match(/^\s*'([\w-]+)':\{(.*)\},?\s*$/);
  if (!m || !defaults[m[1]]) continue;
  const props = {};
  for (const kv of m[2].matchAll(/(\w+):('[^']*'|[-.\d]+)/g)) props[kv[1]] = kv[2].replace(/'/g, '');
  skills.push({id: m[1], slot: defaults[m[1]], props});
}

const rows = leaves.map((l) => {
  const cards = cardOf['config:' + l.path] ?? [];
  return {...l, cards, intent: cards.length ? cards[0].title : intentFor(l.path)};
});
const sections = [...new Set(rows.map((r) => r.path.split('.')[0]))];
const linked = rows.filter((r) => r.cards.length).length;
const explained = rows.filter((r) => r.cards.length || r.intent).length;

const L = [];
L.push('# 밸런스 시트 (자동 생성 — 직접 수정 금지)', '');
L.push(`생성: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · 구현 기준: \`${path.relative(root, impl) || impl}\` @ \`${commit}\``);
L.push('도구: `tools/balance-sheet.mjs` · 의도 사전: `rules/balance-intent.json`(수정 가능) · 규칙 카드: `rules/*.md`', '');
L.push('이 표는 **조절 가능한 수치 전부**를 한 곳에 모은 것이다. "규칙"은 그 수치를 못 박아 둔 규칙 카드, "의도"는 수치가 바꾸는 경험이다. 값을 바꾸면 카드의 `확인` 줄이 상충으로 표시되므로 규칙과 값이 어긋난 채 남지 않는다.', '');
L.push('## 요약', '', '| 지표 | 값 |', '|---|---|');
L.push(`| 설정 수치(숫자·불리언) | ${rows.length}개 · ${sections.length}개 구역 |`);
L.push(`| 규칙 카드가 못 박은 수치 | ${linked}개 (${Math.round(linked / rows.length * 100)}%) |`);
L.push(`| 규칙 또는 의도 설명이 있는 수치 | ${explained}개 (${Math.round(explained / rows.length * 100)}%) |`);
L.push(`| 설명이 없는 수치 | ${rows.length - explained}개 → 다음 카드/의도 사전 작성 대상 |`);
L.push(`| 기본 적용 능력 후보 | ${skills.length}개 (js/skillCatalog.js) |`, '');
for (const s of sections) {
  const rs = rows.filter((r) => r.path.split('.')[0] === s);
  L.push(`## ${s}${intent[s] ? ' — ' + intent[s] : ''}`, '', '| 수치 | 현재값 | 규칙 | 이 수치가 바꾸는 경험 |', '|---|---|---|---|');
  for (const r of rs) {
    const ids = [...new Set(r.cards.map((c) => c.id))].join(', ');
    L.push(`| \`${r.path.slice(s.length + 1) || s}\` | ${r.value} | ${ids || '—'} | ${r.intent || '—'} |`);
  }
  L.push('');
}
L.push('## 기본 적용 능력 후보 (js/skillCatalog.js)', '', '이 값들은 `config/gameBalance.json`이 아니라 코드의 후보 정의에 있으며 F1 프리셋으로 덮어쓸 수 있다. 값은 규칙 카드 `ABIL`의 `skill` 확인이 못 박는다.', '');
L.push('| 후보 | 슬롯 | 수치 | 규칙 |', '|---|---|---|---|');
for (const s of skills) {
  const ids = new Set();
  for (const k of Object.keys(cardOf)) if (k.startsWith(`skill:${s.id}.`)) cardOf[k].forEach((c) => ids.add(c.id));
  const props = Object.entries(s.props).filter(([k]) => !['color', 'slot', 'name', 'effect'].includes(k)).map(([k, v]) => `${k} ${v}`).join(' · ');
  L.push(`| ${s.id} | ${s.slot} | ${props} | ${[...ids].join(', ') || '—'} |`);
}
L.push('');
fs.writeFileSync(out, L.join('\n'), 'utf8');
console.log(`values=${rows.length} linked=${linked} explained=${explained} unexplained=${rows.length - explained} skills=${skills.length}`);
console.log('wrote ' + path.relative(process.cwd(), out));
