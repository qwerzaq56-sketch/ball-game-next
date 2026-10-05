from pathlib import Path
import random,json,math
root=Path('assets/terrain'); m=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
for index,(key,b) in enumerate(m['biomes'].items()):
 for variant,file in enumerate(b['files']):
  rng=random.Random(3100+index*10+variant); shapes=[]
  ink={'grass':'#66854a','forest':'#416e43','lake':'#396982','snow':'#8393a3','volcano':'#83463a','desert':'#a0824e'}[key]
  # Broad irregular, layered ground planes replace barely visible dots.
  for n in range(11):
   x,y=rng.randint(42,358),rng.randint(42,358); rx,ry=rng.randint(20,48),rng.randint(14,31)
   pts=[]
   for j in range(10):
    a=j*math.tau/10; q=rng.uniform(.78,1.08);pts.append((x+math.cos(a)*rx*q,y+math.sin(a)*ry*q))
   d='M'+' L'.join(f'{px:.1f} {py:.1f}' for px,py in pts)+'Z'
   shapes.append(f'<path d="{d}" fill="{ink}" opacity=".18"/>')
  for n in range(36):
   x,y=rng.randint(28,372),rng.randint(28,372)
   if key in ('forest','grass'):
    # Ground foliage clusters: no trunks/walls or new gameplay obstacles.
    for j in range(4 if key=='forest' else 2):
     dx,dy=rng.randint(-8,8),rng.randint(-6,6); angle=rng.randrange(180)
     shapes.append(f'<ellipse cx="{x+dx}" cy="{y+dy}" rx="{rng.randint(3,8)}" ry="{rng.randint(2,4)}" fill="{ink}" opacity=".5" transform="rotate({angle} {x+dx} {y+dy})"/>')
    if n%8==0:shapes.append(f'<path d="M{x-9} {y+3}l3 -9 9 -2 6 7 -4 7Z" fill="#63796c" opacity=".36"/>')
   elif key=='lake':shapes.append(f'<path d="M{x-14} {y}q9 -5 18 -1t15 -2" fill="none" stroke="{ink}" stroke-width="2" opacity=".5" stroke-linecap="round"/>')
   elif key=='desert':shapes.append(f'<path d="M{x-16} {y+3}q15 -9 31 -1 M{x-9} {y+8}q11 -5 21 -1" fill="none" stroke="{ink}" stroke-width="1.5" opacity=".45"/>')
   elif key=='snow':shapes.append(f'<path d="M{x-12} {y+4}q8 -10 23 -2" fill="none" stroke="{ink}" stroke-width="3" opacity=".3" stroke-linecap="round"/>')
   else:shapes.append(f'<path d="M{x-9} {y+6}l2 -11 9 -3 8 9 -6 9Z" fill="#342d2b" opacity=".45"/><path d="M{x-4} {y+2}l3 -5 5 2" fill="none" stroke="{ink}" opacity=".6"/>')
  (root/file).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="{b["baseColor"]}"/>'+''.join(shapes)+'</svg>',encoding='utf-8')
m['version']=2;m['status']='Integrated organic ground revision; concept fidelity work in progress'
(root/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
