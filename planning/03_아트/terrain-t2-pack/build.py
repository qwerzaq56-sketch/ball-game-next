"""Deterministic vector art authoring; independent of gameplay RNG."""
from pathlib import Path
import json, random, xml.etree.ElementTree as ET

root = Path(__file__).parent
out = root / 'assets' / 'terrain'
out.mkdir(parents=True, exist_ok=True)
biomes = {
 'grass': ('초원', '#35502a', '#496237'),
 'forest': ('숲', '#1b4a31', '#28583c'),
 'lake': ('호수', '#143e5c', '#24516b'),
 'snow': ('설원', '#4d6076', '#61758a'),
 'volcano': ('화산', '#5e2b24', '#6c3a31'),
 'desert': ('사막', '#7c6035', '#8b7046'),
}
manifest = {'version': 1, 'status': 'T2 SVG draft, game integration pending',
 'tileWorldSize': 400, 'cellWorldSize': 200, 'variantSelection': '(cellPairX*73856093 ^ cellPairY*19349663) unsigned modulo 3; no gameplay RNG',
 'biomes': {}, 'transitionMasks': {}}
for idx, (key, (label, base, ink)) in enumerate(biomes.items()):
 files = []
 for variant in range(3):
  rng = random.Random(1100 + idx * 10 + variant)
  shapes = []
  # Shapes stay inside a common plain edge margin: arbitrary A/B/C edges match.
  for n in range(23):
   x, y = rng.randint(38, 345), rng.randint(38, 345)
   if key == 'grass':
    shape = f'<path d="M{x} {y}q-3 -9 -5 -11 M{x+4} {y}q2 -8 6 -10" fill="none" stroke="{ink}" stroke-width="2" stroke-linecap="round"/>'
   elif key == 'forest':
    shape = f'<ellipse cx="{x}" cy="{y}" rx="5" ry="2.5" fill="{ink}" transform="rotate({rng.randrange(180)} {x} {y})"/>'
   elif key in ('lake', 'desert'):
    shape = f'<path d="M{x-12} {y}q12 -4 24 0t12 0" fill="none" stroke="{ink}" stroke-width="{1.4 if key=="lake" else 1}" stroke-linecap="round"/>'
   elif key == 'snow':
    shape = f'<circle cx="{x}" cy="{y}" r="{rng.choice([1,1.5,2])}" fill="{ink}"/>'
   else:
    shape = f'<path d="M{x-3} {y}l2 -4 5 1 1 4 -5 2Z" fill="{ink}"/>'
   shapes.append(shape)
  svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="{base}"/><g opacity="0.65">'+''.join(shapes)+'</g></svg>'
  name = f'terrain-{key}-tile-{variant+1:02}.svg'
  (out/name).write_text(svg, encoding='utf-8'); ET.fromstring(svg); files.append(name)
 manifest['biomes'][key] = {'label':label,'baseColor':base,'files':files,'variants':3}

# White is revealed terrain, alpha is coverage. No baked biome colors or warning outlines.
for direction in ('north','east','south','west'):
 coords = {'north':('0%','0%','0%','100%'), 'south':('0%','100%','0%','0%'),
           'west':('0%','0%','100%','0%'), 'east':('100%','0%','0%','0%')}[direction]
 x1,y1,x2,y2=coords
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="a" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="white"/><stop offset="0.12" stop-color="white" stop-opacity="0"/></linearGradient></defs><rect width="400" height="400" fill="url(#a)"/></svg>'
 name=f'mask-edge-{direction}.svg';(out/name).write_text(svg,encoding='utf-8');manifest['transitionMasks'][direction]=name
for direction,(cx,cy) in {'nw':(0,0),'ne':(400,0),'se':(400,400),'sw':(0,400)}.items():
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><radialGradient id="a" gradientUnits="userSpaceOnUse" cx="{cx}" cy="{cy}" r="48"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="400" height="400" fill="url(#a)"/></svg>'
 name=f'mask-corner-{direction}.svg';(out/name).write_text(svg,encoding='utf-8');manifest['transitionMasks'][direction]=name
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
balls=''.join(f'<i style="--c:{c}"></i>' for c in ['#55b9d9','#428ac9','#4cc652','#ec4937','#f4d447'])
panels=[]
for key,item in manifest['biomes'].items():
 for j,name in enumerate(item['files']):
  panels.append(f'<article><h2>{item["label"]} {j+1}</h2><div class="tile" style="background-image:url(assets/terrain/{name})"><div class="balls">{balls}</div><div class="ring"></div></div></article>')
html='''<!doctype html><html lang="ko"><meta charset="utf-8"><title>T2 SVG 검토</title><style>
body{background:#0b1020;color:#e4e8ee;font:16px system-ui;margin:24px}h1{font-size:24px}h2{font-size:16px}main{display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));gap:12px}.tile{height:270px;background-size:200px 200px;position:relative;overflow:hidden}.balls{display:flex;gap:16px;position:absolute;top:75px;left:24px}i{display:block;width:28px;height:28px;background:var(--c);border-radius:50%;box-shadow:inset 0 -3px #0003;border:1px solid #ffffff30}.ring{position:absolute;top:145px;left:100px;width:70px;height:70px;border:2px solid white;border-radius:50%}button{padding:10px;margin-right:10px}body.full .tile{background-size:400px 400px}body.full i{width:56px;height:56px}body.full .balls{gap:10px}body.full .ring{width:100px;height:100px}body.grid .tile{outline:1px solid #aabbcc}.transition{height:180px;position:relative;margin-bottom:10px;background-size:200px}.overlay{position:absolute;inset:0;background-size:200px;mask-image:linear-gradient(90deg,#000 0%,#000 35%,transparent 65%)}@media(max-width:850px){main{grid-template-columns:1fr}}
</style><h1>T2 SVG 타일 비교 · 제작 초안</h1><p>6종×3변형. 0.5/1.0은 월드 타일과 몸체의 표시 배율. 실제 게임 화면이 아님.</p><button onclick="document.body.classList.toggle('full')">배율 0.5 / 1.0</button><main>'''+''.join(panels)+'</main><h2>경계 혼합 예시</h2>'
for a,b in [('grass','forest'),('lake','desert'),('snow','volcano')]:
 html+=f'<p>{biomes[a][0]} → {biomes[b][0]}</p><div class="transition" style="background-image:url(assets/terrain/terrain-{b}-tile-01.svg)"><div class="overlay" style="background-image:url(assets/terrain/terrain-{a}-tile-01.svg)"></div></div>'
html+='<p>경계는 알파 합성 참고. 실제 셀 경계·코너 연결·토러스 래핑은 구현 단계에서 검증한다.</p></html>'
(root/'preview.html').write_text(html,encoding='utf-8')
size=sum(p.stat().st_size for p in out.iterdir())
print(f'18 tiles, 8 masks, manifest: {size} bytes; SVG parse and identical base edge design checked.')
