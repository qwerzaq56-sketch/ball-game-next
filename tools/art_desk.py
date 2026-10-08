"""Art desk: one request format for GPT image generation through Codex or ChatGPT web, with live review.

Manual: tools/ART_DESK.md (planning 03_아트/33_아트_요청_데스크.md). User request 2026-10-08:
"실시간 상호작용을 목표로 코덱스/챗 모두 호환 가능한 툴 및 문서".

Roles: Claude packs requests and checks results, GPT (Codex imagegen or ChatGPT web) generates, the user approves.
Nothing here generates images or approves art by itself.

  python tools/art_desk.py new BATCH --title "..."            create assets/art-desk/BATCH/
  python tools/art_desk.py add BATCH --spec items.json         add/replace items (refs are cropped and hashed)
  python tools/art_desk.py next BATCH                          what a generator should do now (Codex loop)
  python tools/art_desk.py ingest BATCH --id ID --file X.png [--by codex|chat] [--prompt-file P]
  python tools/art_desk.py feedback BATCH --id ID --verdict redo|drop|note [--note "..."]   (ok only with --by user, by the user)
  python tools/art_desk.py focus BATCH --id ID                 unnamed files dropped in the inbox go to ID
  python tools/art_desk.py status BATCH
  python tools/art_desk.py chat BATCH --id ID [--zip OUT.zip]  ChatGPT web message (+ numbered refs in a zip)
  python tools/art_desk.py serve [--port 8010] [--watch DIR]   review page tools/art-desk.html + live inbox

Results are never overwritten: every ingest is out-vN. Only verdicts by the user may approve.
"""
import argparse, hashlib, io, json, shutil, sys, threading, time, zipfile
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DESK = ROOT / 'assets' / 'art-desk'
IMAGE_EXT = {'.png', '.webp', '.jpg', '.jpeg'}
STATUS = ('requested', 'generated', 'redo', 'approved', 'dropped')
LOCK = threading.RLock()

# Rules every generator gets, learned from earlier batches (planning 25/30, tools/ART_BATCH_README.md).
COMMON_RULES = [
    'Use the attached reference images by their stated role; the first reference is the shape/identity source, the gameplay scene is the final look.',
    'True transparency when alpha is required: never paint a checkerboard, white or coloured backdrop.',
    'One isolated subject, centred, small even margin; do not crop the subject at the canvas edge.',
    'Keep the reference proportions; do not stretch or squash.',
    'No UI, text, numbers, range rings, arrows, balls/characters, terrain or extra props unless the item asks for them.',
    'Keep the soft upper-left light of the gameplay look; do not mirror or rotate baked lighting.',
    'Muted palette, broad flat colour planes, subtle dark outlines; no glossy gradients, photoreal texture or noisy tiny detail.',
]


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def rel(path):
    try:
        return Path(path).resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def batch_dir(batch):
    if not batch or any(c in batch for c in '/\\:') or batch.startswith('.'):
        raise SystemExit(f'bad batch name: {batch!r}')
    return DESK / batch


def load(batch):
    path = batch_dir(batch) / 'desk.json'
    if not path.exists():
        raise SystemExit(f'no batch {batch} (python tools/art_desk.py new {batch} --title ...)')
    return json.loads(path.read_text(encoding='utf-8'))


def save(desk):
    folder = batch_dir(desk['batch'])
    desk['updated'] = now()
    tmp = folder / 'desk.json.tmp'
    tmp.write_text(json.dumps(desk, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.replace(folder / 'desk.json')
    (folder / 'REQUEST.md').write_text(request_md(desk), encoding='utf-8')
    write_index()


def log(desk, event, **data):
    with open(batch_dir(desk['batch']) / 'events.jsonl', 'a', encoding='utf-8') as f:
        f.write(json.dumps({'at': now(), 'event': event, **data}, ensure_ascii=False) + '\n')


def write_index():
    DESK.mkdir(parents=True, exist_ok=True)
    rows = []
    for d in sorted(DESK.iterdir()):
        p = d / 'desk.json'
        if d.is_dir() and p.exists():
            desk = json.loads(p.read_text(encoding='utf-8'))
            counts = {s: sum(1 for i in desk['items'] if i['status'] == s) for s in STATUS}
            rows.append({'batch': desk['batch'], 'title': desk.get('title', ''), 'updated': desk.get('updated'), 'counts': counts})
    (DESK / 'index.json').write_text(json.dumps({'batches': rows}, ensure_ascii=False, indent=2), encoding='utf-8')


def item_of(desk, ident):
    for item in desk['items']:
        if item['id'] == ident:
            return item
    raise SystemExit(f'no item {ident} in {desk["batch"]}')


# ---------- request text (Codex REQUEST.md and ChatGPT message share these pieces) ----------

def size_line(item):
    s = item.get('size') or {}
    parts = []
    if s.get('px'):
        parts.append(f"canvas {s['px'][0]}x{s['px'][1]} px")
    if s.get('world'):
        parts.append(f"in game about {s['world'][0]}x{s['world'][1]} world units")
    if s.get('pivot'):
        parts.append(f"pivot {s['pivot']}")
    if s.get('compare'):
        parts.append('compared with balls of diameter ' + '/'.join(str(c) for c in s['compare']))
    return ', '.join(parts)


def chat_message(desk, item):
    refs = '\n'.join(f"- Image {n}: {r.get('role', 'reference')}" for n, r in enumerate(item['refs'], 1)) or '- (no reference images)'
    avoid = '; '.join(item.get('avoid') or [])
    accept = '\n'.join(f'- {a}' for a in item.get('accept') or [])
    alpha = 'PNG with true transparent background' if item.get('alpha', True) else 'opaque PNG'
    variants = item.get('variants', 1)
    return f"""[Ball Game art request · {desk['batch']} / {item['id']}]
{item.get('title', '')} — {item.get('use', '')}

Attached references:
{refs}

{item['prompt'].strip()}

Output: {alpha}, {size_line(item)}. {variants} image{'s' if variants > 1 else ''}.
Avoid: {avoid}
Rules: {' '.join(COMMON_RULES)}
Acceptance:
{accept}
""".strip() + '\n'


def request_md(desk):
    lines = [f"# 아트 요청 · {desk['batch']}", '', desk.get('title', ''), '',
             '> 생성 담당(GPT)용 작업 지시서. `desk.json`에서 자동 생성되며 직접 고치지 않는다. 매뉴얼: `tools/ART_DESK.md`.', '',
             '## 진행 방법', '',
             '- **Codex:** `python tools/art_desk.py next ' + desk['batch'] + '` → 지시대로 imagegen(참조 이미지를 역할 순서대로 첨부) → `python tools/art_desk.py ingest ' + desk['batch'] + ' --id <ID> --file <결과> --by codex --prompt-file <실제 프롬프트>` → 검사 결과 확인 → 다시 `next`.',
             '- **ChatGPT 웹:** 검수 페이지(`tools/art-desk.html`)에서 항목의 "ChatGPT 메시지 복사" + 참조 이미지를 붙여 넣고, 결과 이미지를 카드에 끌어다 놓거나 붙여 넣는다(또는 `_inbox/<ID>.png`).',
             '- 결과는 덮어쓰지 않는다(out-v1, v2…). 승인은 사용자만 한다. 실패작도 지우지 않는다.', '',
             '## 공통 규칙', ''] + [f'- {r}' for r in COMMON_RULES] + ['', '## 항목', '',
             '| ID | 종류 | 상태 | 제목 | 용도 | 크기 |', '|---|---|---|---|---|---|']
    for i in desk['items']:
        lines.append(f"| {i['id']} | {i.get('kind', '')} | {i['status']} | {i.get('title', '')} | {i.get('use', '')} | {size_line(i)} |")
    for i in desk['items']:
        lines += ['', f"### {i['id']} · {i.get('title', '')}", '', f"상태: **{i['status']}** · 결과 {len(i.get('results', []))}개", '']
        for n, r in enumerate(i['refs'], 1):
            crop = f" · 크롭 {r['crop']}" if r.get('crop') else ''
            lines.append(f"- 참조 {n} ({r.get('role', '')}): `{r['file']}` ← `{r.get('source', '')}`{crop}")
        open_fb = [f for f in i.get('feedback', []) if f['verdict'] == 'redo']
        if i['status'] == 'redo' and open_fb:
            lines += ['', f"**다시 요청:** {open_fb[-1].get('note', '')}"]
        lines += ['', '```text', chat_message(desk, i).strip(), '```']
    return '\n'.join(lines) + '\n'


# ---------- commands ----------

def cmd_new(a):
    folder = batch_dir(a.batch)
    if (folder / 'desk.json').exists():
        raise SystemExit(f'{a.batch} exists')
    folder.mkdir(parents=True)
    (folder / '_inbox').mkdir()
    desk = {'format': 'art-desk-v1', 'batch': a.batch, 'title': a.title or a.batch, 'created': now(), 'focus': None, 'items': []}
    save(desk)
    log(desk, 'new', title=desk['title'])
    print(rel(folder))


def resolve_source(src):
    p = Path(src)
    if not p.is_absolute():
        p = ROOT / p
    if not p.exists():
        raise SystemExit(f'reference not found: {src}')
    return p


def cmd_add(a):
    with LOCK:
        desk = load(a.batch)
        spec = json.loads(Path(a.spec).read_text(encoding='utf-8'))
        for s in spec if isinstance(spec, list) else spec['items']:
            ident = s['id']
            if not ident.replace('-', '').replace('_', '').isalnum():
                raise SystemExit(f'bad id {ident}')
            old = next((i for i in desk['items'] if i['id'] == ident), None)
            if old and old.get('results'):
                raise SystemExit(f'{ident} already has results; add a new id (e.g. {ident}-b) instead of replacing it')
            folder = batch_dir(a.batch) / ident
            folder.mkdir(exist_ok=True)
            refs = []
            for n, r in enumerate(s.get('refs', []), 1):
                src = resolve_source(r['source'])
                im = Image.open(src)
                if r.get('crop'):
                    x, y, w, h = r['crop']
                    im = im.crop((x, y, x + w, y + h))
                out = folder / f'ref-{n}.png'
                im.save(out)
                refs.append({'file': rel(out), 'role': r.get('role', ''), 'source': rel(src), 'sourceSha256': sha256(src),
                             'crop': r.get('crop'), 'sha256': sha256(out), 'size': list(im.size)})
            item = {'id': ident, 'kind': s.get('kind', 'object'), 'title': s.get('title', ident), 'use': s.get('use', ''), 'region': s.get('region'),
                    'size': s.get('size', {}), 'alpha': s.get('alpha', True), 'variants': s.get('variants', 1),
                    'refs': refs, 'prompt': s['prompt'], 'avoid': s.get('avoid', []), 'accept': s.get('accept', []),
                    'planning': s.get('planning', []), 'status': 'requested', 'results': [], 'feedback': []}
            (folder / 'prompt.txt').write_text(item['prompt'].strip() + '\n', encoding='utf-8')
            (folder / 'CHAT.txt').write_text(chat_message(desk, item), encoding='utf-8')
            desk['items'] = [i for i in desk['items'] if i['id'] != ident] + [item]
            log(desk, 'add', id=ident, refs=[r['file'] for r in refs])
            print(f'{ident}: {len(refs)} refs')
        save(desk)


def cmd_next(a):
    desk = load(a.batch)
    todo = [i for i in desk['items'] if i['status'] in ('redo', 'requested')]
    todo.sort(key=lambda i: i['status'] != 'redo')
    if not todo:
        waiting = [i['id'] for i in desk['items'] if i['status'] == 'generated']
        print('nothing to generate.' + (f' waiting for user review: {", ".join(waiting)}' if waiting else ''))
        return
    item = todo[0]
    print(f"NEXT {item['id']} ({item['status']})")
    print('attach in order: ' + ', '.join(r['file'] for r in item['refs']))
    redo = [f for f in item.get('feedback', []) if f['verdict'] == 'redo']
    if item['status'] == 'redo' and redo:
        print(f"REDO NOTE ({redo[-1].get('result', '')}): {redo[-1].get('note', '')}")
    print('then: python tools/art_desk.py ingest ' + desk['batch'] + f" --id {item['id']} --file <image> --by codex --prompt-file <prompt actually used>")
    print('-' * 60)
    print(chat_message(desk, item))


# ---------- automatic checks (only file facts; looks are judged by the user) ----------

def check_image(path, item):
    im = Image.open(path)
    w, h = im.size
    out = []
    add = lambda name, level, msg: out.append({'name': name, 'level': level, 'msg': msg})
    rgba = im.convert('RGBA')
    alpha = rgba.getchannel('A')
    lo, _ = alpha.getextrema()
    transparent = sum(alpha.histogram()[:8]) / (w * h)
    if item.get('alpha', True):
        if im.mode not in ('RGBA', 'LA', 'PA') and 'transparency' not in im.info:
            add('alpha', 'fail', f'투명 채널 없음({im.mode}) — 투명 배경 PNG 필요')
        elif lo > 8 or transparent < .03:
            add('alpha', 'fail', f'투명 영역 거의 없음({transparent:.0%})')
        else:
            add('alpha', 'pass', f'투명 영역 {transparent:.0%}')
    # Fake transparency: an opaque light-grey two-tone border (checkerboard baked into pixels).
    border = [rgba.getpixel((x, y)) for x in range(0, w, max(1, w // 64)) for y in (0, 1, h - 2, h - 1)]
    border += [rgba.getpixel((x, y)) for y in range(0, h, max(1, h // 64)) for x in (0, 1, w - 2, w - 1)]
    opaque = [p for p in border if p[3] > 240]
    if item.get('alpha', True) and len(opaque) > len(border) * .8:
        greys = [p for p in opaque if max(p[:3]) - min(p[:3]) < 14 and min(p[:3]) > 150]
        levels = sorted({round(sum(p[:3]) / 3 / 12) for p in greys})
        if len(greys) > len(opaque) * .8 and 2 <= len(levels) <= 4:
            add('checker', 'fail', '가장자리가 밝은 회색 두 톤 — 체크무늬를 그려 넣은 가짜 투명 의심')
        else:
            add('edge', 'warn', '가장자리가 불투명 — 배경이 남았는지 확인')
    bbox = alpha.point(lambda v: 255 if v > 16 else 0).getbbox() if item.get('alpha', True) else (0, 0, w, h)
    if item.get('alpha', True) and lo > 8:
        pass  # nothing transparent: margin and aspect would only measure the canvas
    elif item.get('alpha', True) and bbox:
        l, t, r, b = bbox
        margins = [l / w, t / h, (w - r) / w, (h - b) / h]
        area = (r - l) * (b - t) / (w * h)
        if min(margins) < .005:
            add('margin', 'warn', '그림이 캔버스 가장자리에 닿음 — 잘렸는지 확인')
        elif area < .2:
            add('margin', 'warn', f'그림이 캔버스의 {area:.0%}만 차지 — 여백 과다')
        else:
            add('margin', 'pass', f'여백 좌{margins[0]:.0%} 상{margins[1]:.0%} 우{margins[2]:.0%} 하{margins[3]:.0%}')
        target = (item.get('size') or {}).get('aspect')
        if target:
            got = (r - l) / max(1, b - t)
            err = abs(got / target - 1)
            add('aspect', 'pass' if err <= .15 else 'warn', f'그림 가로/세로 {got:.2f} (목표 {target:.2f}, 차이 {err:.0%})')
    elif item.get('alpha', True):
        add('margin', 'fail', '보이는 그림이 없음')
    px = (item.get('size') or {}).get('px')
    if px and (w < px[0] * .9 or h < px[1] * .9):
        add('size', 'warn', f'{w}x{h} — 목표 {px[0]}x{px[1]}보다 작음')
    else:
        add('size', 'pass', f'{w}x{h}')
    if (item.get('size') or {}).get('tile'):
        left = rgba.crop((0, 0, 2, h)).resize((1, 32)); right = rgba.crop((w - 2, 0, w, h)).resize((1, 32))
        diff = sum(abs(a - b) for p, q in zip(left.getdata(), right.getdata()) for a, b in zip(p[:3], q[:3])) / (32 * 3)
        add('tile', 'pass' if diff < 12 else 'warn', f'좌우 이음새 평균 차 {diff:.1f}/255')
    levels = [c['level'] for c in out]
    verdict = 'fail' if 'fail' in levels else 'warn' if 'warn' in levels else 'pass'
    return {'verdict': verdict, 'items': out}, [w, h]


def ingest_bytes(batch, ident, data, by='unknown', name='upload.png', prompt_used=None):
    with LOCK:
        desk = load(batch)
        item = item_of(desk, ident)
        folder = batch_dir(batch) / ident
        n = len(item['results']) + 1
        while (folder / f'out-v{n}.png').exists():
            n += 1
        target = folder / f'out-v{n}.png'
        im = Image.open(io.BytesIO(data))
        if im.format == 'PNG':
            target.write_bytes(data)  # keep the generator's exact bytes
        else:
            im.save(target)  # webp/jpg are stored as PNG; the original name is recorded
        checks, size = check_image(target, item)
        result = {'file': rel(target), 'sha256': sha256(target), 'at': now(), 'by': by, 'originalName': name,
                  'size': size, 'checks': checks}
        if prompt_used:
            result['promptUsed'] = prompt_used
        item['results'].append(result)
        if item['status'] in ('requested', 'redo'):
            item['status'] = 'generated'
        log(desk, 'ingest', id=ident, file=result['file'], by=by, verdict=checks['verdict'])
        save(desk)
        return result


def cmd_ingest(a):
    prompt = Path(a.prompt_file).read_text(encoding='utf-8') if a.prompt_file else a.prompt
    r = ingest_bytes(a.batch, a.id, Path(a.file).read_bytes(), a.by, Path(a.file).name, prompt)
    print(f"{r['file']}  checks: {r['checks']['verdict']}")
    for c in r['checks']['items']:
        print(f"  [{c['level']}] {c['name']}: {c['msg']}")


def feedback(batch, ident, verdict, note='', by='user', result=None):
    if verdict not in ('ok', 'redo', 'drop', 'note'):
        raise SystemExit('verdict must be ok, redo, drop or note')
    if verdict == 'ok' and by != 'user':
        raise SystemExit('only the user approves art (by=user)')
    with LOCK:
        desk = load(batch)
        item = item_of(desk, ident)
        result = result or (item['results'][-1]['file'] if item['results'] else None)
        item['feedback'].append({'at': now(), 'by': by, 'verdict': verdict, 'note': note, 'result': result})
        item['status'] = {'ok': 'approved', 'redo': 'redo', 'drop': 'dropped'}.get(verdict, item['status'])
        if verdict == 'ok':
            item['approved'] = {'result': result, 'at': now()}
        elif verdict in ('redo', 'drop'):
            item.pop('approved', None)  # the approval stays in feedback history
        log(desk, 'feedback', id=ident, verdict=verdict, note=note, by=by, result=result)
        save(desk)
        return item


def cmd_feedback(a):
    item = feedback(a.batch, a.id, a.verdict, a.note or '', a.by, a.result)
    print(f"{item['id']}: {item['status']}")


def set_focus(batch, ident):
    with LOCK:
        desk = load(batch)
        if ident:
            item_of(desk, ident)
        desk['focus'] = ident or None
        log(desk, 'focus', id=ident)
        save(desk)


def cmd_focus(a):
    set_focus(a.batch, a.id)
    print(f'focus: {a.id or "(none)"}')


def cmd_status(a):
    desk = load(a.batch)
    print(f"{desk['batch']} · {desk.get('title', '')} · focus {desk.get('focus')}")
    for i in desk['items']:
        last = i['results'][-1] if i['results'] else None
        tail = f"{last['file'].rsplit('/', 1)[-1]} {last['checks']['verdict']}" if last else '-'
        print(f"  {i['id']:<28} {i['status']:<10} results {len(i['results'])}  last {tail}")


def cmd_chat(a):
    desk = load(a.batch)
    item = item_of(desk, a.id)
    msg = chat_message(desk, item)
    print(msg)
    if a.zip:
        with zipfile.ZipFile(a.zip, 'x') as z:
            z.writestr('message.txt', msg)
            for n, r in enumerate(item['refs'], 1):
                z.write(ROOT / r['file'], f"{n}-{Path(r['file']).name}")
        print(f'wrote {a.zip}')


# ---------- live server: static repo + desk API + inbox watcher ----------

def claim(f, batch_folder, fallback_focus=True):
    """Which item a dropped file belongs to: a file name starting with an item id, else the batch focus."""
    desk = json.loads((batch_folder / 'desk.json').read_text(encoding='utf-8'))
    ids = sorted((i['id'] for i in desk['items']), key=len, reverse=True)
    ident = next((i for i in ids if f.stem.startswith(i)), None)
    return desk, ident or (desk.get('focus') if fallback_focus else None)


def watch_loop(dirs, stop):
    """Batch _inbox folders, plus extra folders (e.g. Downloads) that feed the most recently focused batch."""
    sizes, taken, started = {}, set(), time.time()
    while not stop.is_set():
        batches = [d for d in DESK.iterdir() if (d / 'desk.json').exists()] if DESK.exists() else []
        focused = sorted((d for d in batches if json.loads((d / 'desk.json').read_text(encoding='utf-8')).get('focus')),
                         key=lambda d: (d / 'desk.json').stat().st_mtime, reverse=True)
        jobs = [(d / '_inbox', d) for d in batches] + ([(x, focused[0]) for x in dirs] if focused else [])
        for inbox, batch_folder in jobs:
            if not inbox.exists():
                continue
            extra = inbox not in [d / '_inbox' for d in batches]
            for f in inbox.iterdir():
                if not f.is_file() or f.suffix.lower() not in IMAGE_EXT:
                    continue
                if extra and (f.stat().st_mtime < started or str(f) in taken):
                    continue  # extra folders: only files that appear while serving; originals stay put
                size = f.stat().st_size
                if sizes.get(str(f)) != size:  # wait one round so a download in progress settles
                    sizes[str(f)] = size
                    continue
                sizes.pop(str(f), None)
                desk, ident = claim(f, batch_folder)
                if ident is None:
                    continue
                try:
                    r = ingest_bytes(desk['batch'], ident, f.read_bytes(), 'inbox', f.name)
                    if extra:
                        taken.add(str(f))
                    else:
                        done = inbox / '_done'
                        done.mkdir(exist_ok=True)
                        shutil.move(str(f), str(done / f"{datetime.now():%H%M%S}-{f.name}"))
                    print(f"inbox → {desk['batch']}/{ident}: {r['file']} ({r['checks']['verdict']})", flush=True)
                except Exception as e:  # keep watching; a bad file stays where it is
                    print(f'inbox error {f}: {e}', file=sys.stderr, flush=True)
        stop.wait(1)

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.svg': 'image/svg+xml', '.json': 'application/json'}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        if '/__desk/' in (self.path or '') and self.command == 'POST':
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/__desk/ping':
            return self.reply(200, {'ok': True, 'root': str(ROOT)})
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        parts = [unquote(p) for p in u.path.split('/') if p]
        try:
            if len(parts) != 4 or parts[0] != '__desk':
                return self.reply(404, {'error': 'not found'})
            _, batch, ident, action = parts
            body = self.rfile.read(int(self.headers.get('Content-Length') or 0))
            if action == 'upload':
                q = parse_qs(u.query)
                r = ingest_bytes(batch, ident, body, q.get('by', ['chat'])[0], q.get('name', ['upload.png'])[0])
                return self.reply(200, r)
            data = json.loads(body or b'{}')
            if action == 'feedback':
                item = feedback(batch, ident, data.get('verdict'), data.get('note', ''), 'user', data.get('result'))
                return self.reply(200, {'status': item['status']})
            if action == 'focus':
                set_focus(batch, None if data.get('clear') else ident)
                return self.reply(200, {'focus': None if data.get('clear') else ident})
            return self.reply(404, {'error': 'unknown action'})
        except SystemExit as e:
            return self.reply(400, {'error': str(e)})
        except Exception as e:
            return self.reply(500, {'error': f'{type(e).__name__}: {e}'})


def cmd_serve(a):
    DESK.mkdir(parents=True, exist_ok=True)
    write_index()
    stop = threading.Event()
    dirs = [Path(d).expanduser().resolve() for d in a.watch or []]
    threading.Thread(target=watch_loop, args=(dirs, stop), daemon=True).start()
    print(f'http://127.0.0.1:{a.port}/tools/art-desk.html  (inboxes: assets/art-desk/<batch>/_inbox' +
          ''.join(f', {d}' for d in dirs) + ')', flush=True)
    try:
        ThreadingHTTPServer(('127.0.0.1', a.port), Handler).serve_forever()
    finally:
        stop.set()


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('new'); s.add_argument('batch'); s.add_argument('--title'); s.set_defaults(fn=cmd_new)
    s = sub.add_parser('add'); s.add_argument('batch'); s.add_argument('--spec', required=True); s.set_defaults(fn=cmd_add)
    s = sub.add_parser('next'); s.add_argument('batch'); s.set_defaults(fn=cmd_next)
    s = sub.add_parser('ingest'); s.add_argument('batch'); s.add_argument('--id', required=True); s.add_argument('--file', required=True)
    s.add_argument('--by', default='codex'); s.add_argument('--prompt'); s.add_argument('--prompt-file'); s.set_defaults(fn=cmd_ingest)
    s = sub.add_parser('feedback'); s.add_argument('batch'); s.add_argument('--id', required=True)
    s.add_argument('--verdict', required=True); s.add_argument('--note'); s.add_argument('--by', default='agent'); s.add_argument('--result'); s.set_defaults(fn=cmd_feedback)
    s = sub.add_parser('focus'); s.add_argument('batch'); s.add_argument('--id'); s.set_defaults(fn=cmd_focus)
    s = sub.add_parser('status'); s.add_argument('batch'); s.set_defaults(fn=cmd_status)
    s = sub.add_parser('chat'); s.add_argument('batch'); s.add_argument('--id', required=True); s.add_argument('--zip'); s.set_defaults(fn=cmd_chat)
    s = sub.add_parser('serve'); s.add_argument('--port', type=int, default=8010); s.add_argument('--watch', action='append'); s.set_defaults(fn=cmd_serve)
    a = p.parse_args(argv)
    a.fn(a)


if __name__ == '__main__':
    main()
