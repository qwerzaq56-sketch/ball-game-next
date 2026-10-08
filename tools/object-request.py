"""object-request: cuts out the reference crops attached to object bench work requests.

Usage: python tools/object-request.py <review file> --out <dir> [--date YYYY-MM-DD] [--link object-requests/]
The review file is the text copied from tools/object-bench.html (object-review-v2 JSON lines). Every line whose
image has a "concept" (the chosen reference crop) and a "request" ({kinds, text}) is cut from its source image,
saved as <out>/<id>-<date>.jpg (an existing file is never overwritten: -2, -3, ...), and printed as a markdown row
for the request table in planning 03_아트/32_오브젝트_검수대_기획서.md §11. Claude then works from that image.
"""
import argparse, json, sys
from pathlib import Path
from PIL import Image

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
KINDS = {'resource': '리소스 새로 만들기', 'match': '구현을 원화에 맞추기', 'states': '사용 전·후 상태 리소스', 'effect': '이펙트 만들기'}
MAX_SIDE = 640


def requests(text):
    for line in text.splitlines():
        s = line.strip()
        if not s.startswith('{'):
            continue
        try:
            r = json.loads(s)
        except json.JSONDecodeError:
            continue
        image = r.get('image') or {}
        if r.get('format') == 'object-review-v2' and image.get('concept') and image.get('request'):
            yield r['id'], image['concept'], image['request']


def source_path(src):
    # Bench paths are relative to tools/ (e.g. ../assets/..., object-bench/...); refuse anything outside the repo.
    path = (TOOLS / src).resolve()
    if ROOT not in path.parents:
        raise SystemExit(f'저장소 밖 경로는 쓰지 않습니다: {src}')
    return path


def cut(src, crop):
    im = Image.open(source_path(src))
    if crop:
        x, y, w, h = (round(v) for v in crop)
        box = (max(0, x), max(0, y), min(im.width, x + w), min(im.height, y + h))
        if box[2] <= box[0] or box[3] <= box[1]:
            raise SystemExit(f'잘라 낼 영역이 그림 밖입니다: {src} {crop}')
        im = im.crop(box)
    im.thumbnail((MAX_SIDE, MAX_SIDE))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        ground = Image.new('RGBA', im.size, (13, 19, 26, 255))
        im = Image.alpha_composite(ground, im)
    return im.convert('RGB')


def free_name(out, stem):
    path, n = out / f'{stem}.jpg', 2
    while path.exists():
        path, n = out / f'{stem}-{n}.jpg', n + 1
    return path


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('review')
    ap.add_argument('--out', required=True)
    ap.add_argument('--date', required=True, help='요청 날짜 YYYY-MM-DD (파일 이름과 표에 씀)')
    ap.add_argument('--link', default='object-requests/', help='표에 쓰는 그림 링크 앞부분(문서 기준 상대 경로)')
    a = ap.parse_args(argv)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for ident, concept, req in requests(Path(a.review).read_text(encoding='utf-8')):
        path = free_name(out, f'{ident}-{a.date}')
        cut(concept['src'], concept.get('crop')).save(path, 'JPEG', quality=86)
        kinds = ', '.join(KINDS.get(k, k) for k in req.get('kinds') or [])
        what = ' — '.join(x for x in [kinds, (req.get('text') or '').strip().replace('|', '/')] if x)
        crop = concept.get('crop')
        source = Path(concept['src']).name + (f" ({','.join(str(round(v)) for v in crop)})" if crop else '')
        rows.append(f"| {a.date[5:]} | {ident} | ![{ident} 기준 원화]({a.link}{path.name}) {source} | {what} | 접수 |")
    if not rows:
        print('작업 요청이 붙은 기준 원화가 없습니다.')
        return 0
    print('\n'.join(rows))
    return 0


if __name__ == '__main__':
    sys.exit(main())
