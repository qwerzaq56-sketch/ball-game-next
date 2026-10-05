from pathlib import Path
from PIL import Image
import json, hashlib, re
p=Path(__file__).resolve().parent
r=p.parents[2]
sources=json.loads((p/'generated-sources-002.json').read_text())
m=json.loads((p/'manifest.json').read_text(encoding='utf-8-sig'))
code=(r/'js/abilityRasterArt.js').read_text()
metrics=[]
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
m['items']=[x for x in m['items'] if not x['id'].endswith('-002')]
for x in m['items']: x['status']='unselected-preserved-experiment'
for q in sources:
 im=Image.open(p/q['file']);a=im.getchannel('A');b=a.point(lambda v:255 if v>64 else 0).getbbox()
 box=[max(0,b[0]-16),max(0,b[1]-16),min(im.width,b[2]+16),min(im.height,b[3]+16)]
 crop=[box[0],box[1],box[2]-box[0],box[3]-box[1]];raw=q['runtime']
 exponent=2.5 if raw in ['cyan-shield','blue-wave'] else 1.8 if raw=='red-embers' else None
 line=next(l for l in code.splitlines() if l.startswith(" '"+raw+"':"))
 new=re.sub(r"file:'[^']+'", "file:'"+q['file']+"'",line)
 new=re.sub(r'crop:\[[^]]+\]', 'crop:'+str(crop),new)
 new=re.sub(r'alphaExponent:[\d.]+,','',new)
 if exponent:new=new.replace('directional:', 'alphaExponent:'+str(exponent)+',directional:')
 code=code.replace(line,new)
 q.update(status='selected-002-exact-effect-crop',size=list(im.size),mode=im.mode,SHA256=sha(p/q['file']),promptSHA256=sha(p/q['prompt']),cacheCropXYWH=crop,pivotInRawImage=[0,.5] if raw=='cyan-sweep' else [.5,.5],cacheAlphaExponent=exponent)
 m['items'].append(q)
 metrics.append({'id':q['id'],'size':list(im.size),'alphaExtrema':a.getextrema(),'alpha64Bounds':list(b),'cacheCropXYWH':crop})
m.update(selectedCount=8,selectedVersion='002',cropManifest002='references/v2/crop-manifest.json')
(p/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
(p/'alpha-metrics-002.json').write_text(json.dumps(metrics,indent=2)+'\n')
(r/'js/abilityRasterArt.js').write_text(code)
print(json.dumps(metrics))
